# seo_audit.py — Vishaqa's Updated SEO Engine
# New: cloudscraper, RAKE keywords, canonical, robots, OG tags,
#      schema detection, internal/external links, word count,
#      accessibility/best-practices/SEO scores from PageSpeed

import requests
import cloudscraper
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from groq import Groq
from dotenv import load_dotenv
from collections import Counter
import concurrent.futures
import re
import os

import nltk
from rake_nltk import Rake

load_dotenv()

GROQ_API_KEY      = os.getenv('GROQ_API_KEY')
PAGESPEED_API_KEY = os.getenv('PAGESPEED_API_KEY')

# Download NLTK data silently on first run
for pkg in ['punkt', 'punkt_tab', 'stopwords']:
    nltk.download(pkg, quiet=True)

client = Groq(api_key=GROQ_API_KEY)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}


# ── Scraper ──────────────────────────────────────────────────
def fetch_page(url):
    """Try plain requests first; fall back to cloudscraper for Cloudflare sites."""
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        if r.status_code == 403 or 'cf-browser-verification' in r.text.lower():
            raise ValueError('Cloudflare detected')
        r.raise_for_status()
        return r.text
    except Exception:
        scraper = cloudscraper.create_scraper(
            browser={'browser': 'chrome', 'platform': 'windows', 'mobile': False}
        )
        r = scraper.get(url, headers=HEADERS, timeout=20)
        r.raise_for_status()
        return r.text


def scrape_seo(url):
    html = fetch_page(url)
    soup = BeautifulSoup(html, 'html.parser')

    title_tag = soup.title
    title     = title_tag.string.strip() if title_tag else 'Missing'

    meta_desc_tag = soup.find('meta', attrs={'name': re.compile('^description$', re.I)})
    meta_desc     = meta_desc_tag['content'].strip() if meta_desc_tag else 'Missing'

    meta_kw_tag = soup.find('meta', attrs={'name': re.compile('^keywords$', re.I)})
    meta_kw     = meta_kw_tag['content'].strip() if meta_kw_tag else 'Missing'

    canonical_tag = soup.find('link', attrs={'rel': 'canonical'})
    canonical     = canonical_tag['href'] if canonical_tag else 'Missing'

    robots_tag = soup.find('meta', attrs={'name': re.compile('^robots$', re.I)})
    robots     = robots_tag['content'] if robots_tag else 'Not specified'

    og_title = soup.find('meta', attrs={'property': 'og:title'})
    og_desc  = soup.find('meta', attrs={'property': 'og:description'})
    og_image = soup.find('meta', attrs={'property': 'og:image'})

    h1_tags = soup.find_all('h1')
    h2_tags = soup.find_all('h2')
    h3_tags = soup.find_all('h3')

    images      = soup.find_all('img')
    missing_alt = [img.get('src', '') for img in images if not img.get('alt')]

    schema_tags = soup.find_all('script', attrs={'type': 'application/ld+json'})

    domain = urlparse(url).netloc
    all_links     = soup.find_all('a', href=True)
    internal_links = [urljoin(url, a['href']) for a in all_links if urlparse(urljoin(url, a['href'])).netloc == domain]
    external_links = [urljoin(url, a['href']) for a in all_links if urlparse(urljoin(url, a['href'])).netloc not in ('', domain)]

    broken_links = []
    scraper = cloudscraper.create_scraper()
    for href in (internal_links + external_links)[:15]:
        try:
            resp = scraper.head(href, timeout=8, allow_redirects=True)
            if resp.status_code >= 400:
                broken_links.append(f'{href} [{resp.status_code}]')
        except Exception:
            broken_links.append(f'{href} [timeout/error]')

    body_text  = soup.get_text(separator=' ', strip=True)
    word_count = len(body_text.split())

    return {
        'title':               title,
        'title_length':        len(title),
        'meta_description':    meta_desc,
        'meta_desc_length':    len(meta_desc) if meta_desc != 'Missing' else 0,
        'meta_keywords':       meta_kw,
        'canonical_url':       canonical,
        'robots_meta':         robots,
        'og_title':            og_title['content'] if og_title else 'Missing',
        'og_description':      og_desc['content']  if og_desc  else 'Missing',
        'og_image':            og_image['content'] if og_image else 'Missing',
        'h1_count':            len(h1_tags),
        'h1_texts':            [h.get_text(strip=True) for h in h1_tags[:3]],
        'h2_count':            len(h2_tags),
        'h3_count':            len(h3_tags),
        'total_images':        len(images),
        'missing_alt_count':   len(missing_alt),
        'schema_count':        len(schema_tags),
        'internal_link_count': len(internal_links),
        'external_link_count': len(external_links),
        'broken_links_count':  len(broken_links),
        'broken_links':        broken_links,
        'word_count':          word_count,
        'body_text':           body_text[:5000],  # kept for keyword extraction
    }


# ── Keyword extraction ────────────────────────────────────────
def extract_keywords(body_text, meta_keywords):
    rake = Rake(min_length=1, max_length=4)
    rake.extract_keywords_from_text(body_text)
    rake_phrases = rake.get_ranked_phrases_with_scores()[:15]
    rake_keywords = [{'phrase': phrase, 'score': round(score, 1)} for score, phrase in rake_phrases]

    stop_words = {
        'the','a','an','and','or','but','in','on','at','to','for','of','with',
        'is','are','was','were','be','been','has','have','had','do','does','did',
        'will','would','could','should','may','might','shall','can','this','that',
        'these','those','it','its','we','you','he','she','they','their','our',
        'your','my','his','her','i','me','us','him','them','not','no','so','as',
        'by','from','up','out','if','then','than','just','more','also','all',
        'about','what','which','who','how','when','where','www','http','https',
        'com','org','net','html','css','js','php','get','set','use','using',
        'new','click','here','read','learn','view','see','find','go','page',
    }
    words     = re.findall(r'\b[a-zA-Z]{4,}\b', body_text.lower())
    word_freq = Counter(w for w in words if w not in stop_words)
    top_words = [{'word': word, 'count': count} for word, count in word_freq.most_common(20)]

    meta_list = (
        [k.strip() for k in meta_keywords.split(',') if k.strip()]
        if meta_keywords and meta_keywords != 'Missing' else []
    )

    return {
        'rake_keywords':      rake_keywords,
        'top_words':          top_words,
        'meta_keywords_list': meta_list,
    }


# ── PageSpeed ─────────────────────────────────────────────────
def _parse_pagespeed(data):
    lh     = data['lighthouseResult']
    cats   = lh.get('categories', {})
    audits = lh.get('audits', {})

    def score(key):
        val = cats.get(key, {}).get('score')
        try:    return round(float(val) * 100)
        except: return 0

    def av(key):
        return audits.get(key, {}).get('displayValue', 'N/A')

    return {
        'performance_score':    score('performance'),
        'accessibility_score':  score('accessibility'),
        'best_practices_score': score('best-practices'),
        'seo_score':            score('seo'),
        'LCP':         av('largest-contentful-paint'),
        'FID':         av('max-potential-fid'),
        'CLS':         av('cumulative-layout-shift'),
        'TBT':         av('total-blocking-time'),
        'SI':          av('speed-index'),
        'ttfb':        av('server-response-time'),
    }


def get_pagespeed(url, strategy='desktop'):
    if not PAGESPEED_API_KEY:
        return {'performance_score': 0, 'error': 'PAGESPEED_API_KEY missing in .env'}

    cats = '&category=performance&category=accessibility&category=best-practices&category=seo'
    api_url = f'https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url={url}&strategy={strategy}{cats}&key={PAGESPEED_API_KEY}'

    try:
        print(f'[PageSpeed] Fetching {strategy}...')
        res  = requests.get(api_url, timeout=90)
        data = res.json()

        if 'error' in data:
            msg = data['error'].get('message', 'Unknown error')
            print(f'[PageSpeed] API error: {msg}')
            return {'performance_score': 0, 'error': msg}

        if 'lighthouseResult' not in data:
            return {'performance_score': 0, 'error': 'No lighthouse data'}

        result = _parse_pagespeed(data)
        print(f'[PageSpeed] {strategy}: perf={result["performance_score"]}, seo={result["seo_score"]}')
        return result

    except requests.exceptions.Timeout:
        return {'performance_score': 0, 'error': 'PageSpeed API timed out'}
    except Exception as e:
        return {'performance_score': 0, 'error': str(e)}


# ── AI suggestions ────────────────────────────────────────────
def get_ai_suggestions(seo_data, speed_data, keyword_data):
    prompt = f"""You are an expert SEO consultant. Analyze the following audit data.

SEO Metrics:
- Title: "{seo_data['title']}" (length: {seo_data['title_length']} chars)
- Meta Description: "{seo_data['meta_description']}" (length: {seo_data['meta_desc_length']} chars)
- H1: {seo_data['h1_count']} | H2: {seo_data['h2_count']} | H3: {seo_data['h3_count']}
- Total Images: {seo_data['total_images']} | Missing Alt: {seo_data['missing_alt_count']}
- Broken Links: {seo_data['broken_links_count']}
- Word Count: {seo_data['word_count']}
- Schema Markup: {seo_data['schema_count']} items
- Canonical URL: {seo_data['canonical_url']}
- Internal Links: {seo_data['internal_link_count']} | External: {seo_data['external_link_count']}

Performance:
- Performance Score: {speed_data.get('performance_score')}
- SEO Score: {speed_data.get('seo_score')}
- LCP: {speed_data.get('LCP')} | CLS: {speed_data.get('CLS')} | TBT: {speed_data.get('TBT')}

Top Keywords: {[k['phrase'] for k in keyword_data['rake_keywords'][:8]]}

Provide analysis in EXACTLY this format (no asterisks, no markdown):

CRITICAL ISSUES
Issue 1: [specific issue with data]
Issue 2: [specific issue with data]
Issue 3: [specific issue with data]

ON-PAGE SEO FIXES
Fix 1: [specific actionable fix]
Fix 2: [specific actionable fix]
Fix 3: [specific actionable fix]
Fix 4: [specific actionable fix]

TECHNICAL SEO FIXES
Fix 1: [specific technical recommendation]
Fix 2: [specific technical recommendation]
Fix 3: [specific technical recommendation]

OPTIMIZED TITLE
[Write an optimized title tag, 50-60 characters]

OPTIMIZED META DESCRIPTION
[Write an optimized meta description, 150-160 characters]

KEYWORD STRATEGY
[2-3 sentences about keyword opportunities]

PRIORITY SCORE
[Rate: Poor / Fair / Good / Excellent with one line reason]
"""

    try:
        response = client.chat.completions.create(
            model='llama-3.1-8b-instant',
            messages=[{'role': 'user', 'content': prompt}],
            max_tokens=1200,
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f'[AI] Error: {e}')
        return f'AI suggestions unavailable: {str(e)}'


# ── Main entry point ──────────────────────────────────────────
def run_seo_audit(url):
    """
    Fetches desktop AND mobile PageSpeed in parallel.
    Returns full audit data for the Flask API.
    """
    seo_data = scrape_seo(url)

    body_text    = seo_data.pop('body_text', '')  # remove from API response
    keyword_data = extract_keywords(body_text, seo_data.get('meta_keywords', ''))

    # Fetch both strategies simultaneously
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:
        df = ex.submit(get_pagespeed, url, 'desktop')
        mf = ex.submit(get_pagespeed, url, 'mobile')
        desktop_speed = df.result()
        mobile_speed  = mf.result()

    try:
        ai_suggestions = get_ai_suggestions(seo_data, desktop_speed, keyword_data)
        print(f'[AI] Generated {len(ai_suggestions)} chars')
    except Exception as e:
        ai_suggestions = f'AI suggestions unavailable: {str(e)}'

    return {
        'url':            url,
        'seo':            seo_data,
        'keywords':       keyword_data,
        'desktop':        desktop_speed,
        'mobile':         mobile_speed,
        'ai_suggestions': ai_suggestions,
    }