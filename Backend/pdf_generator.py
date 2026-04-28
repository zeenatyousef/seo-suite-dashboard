# pdf_generator.py
from reportlab.platypus import Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate
from reportlab.graphics.shapes import Drawing, Rect, String, Circle, Wedge
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.enums import TA_CENTER
import io
from datetime import datetime

PAGE_W = A4[0] - 40 * mm

ACCENT    = colors.HexColor('#4f46e5')
DARK      = colors.HexColor('#1a1d2e')
SLATE     = colors.HexColor('#1e293b')
LIGHT_BG  = colors.HexColor('#f9fafb')
LIGHT_BG2 = colors.HexColor('#f0f9ff')
BORDER    = colors.HexColor('#e5e7eb')
TEXT      = colors.HexColor('#374151')
MUTED     = colors.HexColor('#6b7280')
GREEN     = colors.HexColor('#16a34a')
AMBER     = colors.HexColor('#d97706')
RED       = colors.HexColor('#dc2626')
WHITE     = colors.white


def _header_footer(canvas, doc, date_str, url):
    canvas.saveState()
    w, h = A4
    canvas.setFillColor(DARK)
    canvas.rect(0, h - 8*mm, w, 8*mm, fill=1, stroke=0)
    canvas.setFont('Helvetica', 7.5)
    canvas.setFillColor(colors.HexColor('#a5b4fc'))
    canvas.drawRightString(w - 20*mm, h - 5.5*mm, f'Generated: {date_str}')
    canvas.setStrokeColor(ACCENT)
    canvas.setLineWidth(2)
    canvas.line(0, h - 8*mm, w, h - 8*mm)
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(20*mm, 12*mm, w - 20*mm, 12*mm)
    canvas.setFont('Helvetica', 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(20*mm, 7*mm, f'SEO Suite Dashboard  •  {url}')
    canvas.drawRightString(w - 20*mm, 7*mm, f'Page {doc.page}')
    canvas.restoreState()


def _score_bar_chart(scores, width=None):
    """Horizontal bar chart. scores = [('Label', value, max), ...]"""
    bar_h   = 18
    gap     = 10
    label_w = 120
    score_w = 40
    w       = float(width or PAGE_W)
    bar_w   = w - label_w - score_w - 10
    total_h = (bar_h + gap) * len(scores) + 10

    d = Drawing(w, total_h)

    for i, (label, val, mx) in enumerate(scores):
        y = total_h - (i + 1) * (bar_h + gap) + gap

        d.add(Rect(label_w, y, bar_w, bar_h,
                   fillColor=colors.HexColor('#e5e7eb'), strokeColor=None))

        pct = min(val / mx, 1.0) if mx > 0 else 0
        if val >= 70:   bar_color = colors.HexColor('#16a34a')
        elif val >= 50: bar_color = colors.HexColor('#d97706')
        else:           bar_color = colors.HexColor('#dc2626')

        if pct > 0:
            d.add(Rect(label_w, y, bar_w * pct, bar_h,
                       fillColor=bar_color, strokeColor=None))

        d.add(String(0, y + 4, label,
                     fontName='Helvetica', fontSize=9,
                     fillColor=colors.HexColor('#374151')))

        d.add(String(label_w + bar_w + 6, y + 4, f'{val}/100',
                     fontName='Helvetica-Bold', fontSize=9,
                     fillColor=bar_color))

    return d


def _score_circle(score):
    """Circular score gauge matching the frontend ScoreCircle."""
    size   = 110
    cx, cy = size / 2, size / 2
    r      = 42
    stroke = 8

    if score >= 70:   color = colors.HexColor('#16a34a')
    elif score >= 50: color = colors.HexColor('#d97706')
    else:             color = colors.HexColor('#dc2626')

    label = 'Good' if score >= 70 else 'Fair' if score >= 50 else 'Poor'

    d = Drawing(size, size)

    # Grey background track
    d.add(Circle(cx, cy, r,
                 fillColor=None,
                 strokeColor=colors.HexColor('#e5e7eb'),
                 strokeWidth=stroke))

    # Colored arc as wedge
    pct   = score / 100.0
    angle = 360 * pct
    start = 90
    if pct > 0:
        d.add(Wedge(cx, cy, r + stroke / 2,
                    start - angle, start,
                    radius1=r - stroke / 2,
                    fillColor=color,
                    strokeColor=None))

    # Score number
    d.add(String(cx, cy + 6, str(score),
                 fontName='Helvetica-Bold', fontSize=20,
                 fillColor=color, textAnchor='middle'))

    # /100
    d.add(String(cx, cy - 8, '/ 100',
                 fontName='Helvetica', fontSize=8,
                 fillColor=colors.HexColor('#6b7280'), textAnchor='middle'))

    # Good/Fair/Poor label
    d.add(String(cx, cy - 22, label,
                 fontName='Helvetica-Bold', fontSize=9,
                 fillColor=color, textAnchor='middle'))

    return d


def create_seo_pdf(data):
    date_str = datetime.now().strftime('%B %d, %Y at %I:%M %p')
    url      = str(data.get('url') or 'N/A')
    seo      = data.get('seo') or {}
    desktop  = data.get('desktop') or {}
    mobile   = data.get('mobile')  or {}
    keywords = data.get('keywords') or {}
    ai_text  = str(data.get('ai_suggestions') or 'Not available')

    def parse_score(speed):
        val = speed.get('performance_score') or speed.get('score') or 0
        if isinstance(val, float) and val <= 1.0:
            return round(val * 100)
        return int(val or 0)

    def get_metric(speed, *keys):
        for k in keys:
            v = speed.get(k)
            if v and v != 'N/A':
                return v
        return 'N/A'

    desktop_perf = parse_score(desktop)
    mobile_perf  = parse_score(mobile)
    desktop_lcp  = get_metric(desktop, 'LCP', 'lcp', 'largest_contentful_paint')
    desktop_cls  = get_metric(desktop, 'CLS', 'cls', 'cumulative_layout_shift')
    desktop_tbt  = get_metric(desktop, 'TBT', 'tbt', 'total_blocking_time')
    desktop_si   = get_metric(desktop, 'SI',  'si',  'speed_index')
    mobile_lcp   = get_metric(mobile,  'LCP', 'lcp', 'largest_contentful_paint')
    mobile_cls   = get_metric(mobile,  'CLS', 'cls', 'cumulative_layout_shift')
    mobile_tbt   = get_metric(mobile,  'TBT', 'tbt', 'total_blocking_time')
    mobile_si    = get_metric(mobile,  'SI',  'si',  'speed_index')

    seo_score = 100
    if not seo.get('meta_description') or seo.get('meta_description') == 'Missing': seo_score -= 15
    if (seo.get('h1_count') or 0) == 0:  seo_score -= 15
    if (seo.get('h1_count') or 0) > 1:   seo_score -= 5
    if (seo.get('missing_alt_count') or 0) > 0:
        seo_score -= min((seo.get('missing_alt_count') or 0) * 2, 20)
    if (seo.get('broken_links_count') or 0) > 0:
        seo_score -= min((seo.get('broken_links_count') or 0) * 3, 15)
    seo_score = max(0, min(100, seo_score))

    issues = sum([
        1 if not seo.get('meta_description') or seo.get('meta_description') == 'Missing' else 0,
        1 if (seo.get('h1_count') or 0) == 0 else 0,
        1 if (seo.get('missing_alt_count') or 0) > 0 else 0,
        1 if (seo.get('broken_links_count') or 0) > 0 else 0,
    ])

    buffer = io.BytesIO()
    doc = BaseDocTemplate(
        buffer, pagesize=A4,
        rightMargin=20*mm, leftMargin=20*mm,
        topMargin=16*mm, bottomMargin=18*mm,
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id='main')
    doc.addPageTemplates([
        PageTemplate(id='all', frames=frame,
                     onPage=lambda c, d: _header_footer(c, d, date_str, url))
    ])

    styles = getSampleStyleSheet()

    def S(name, **kw):
        return ParagraphStyle(name, parent=styles['Normal'], **kw)

    section_style    = S('Section',   fontSize=12, textColor=ACCENT, spaceBefore=14, spaceAfter=6, fontName='Helvetica-Bold')
    url_style        = S('URL',       fontSize=10, textColor=ACCENT, spaceAfter=5, leading=16, wordWrap='CJK')
    main_title_style = S('MainTitle', fontSize=22, fontName='Helvetica-Bold', textColor=DARK, alignment=TA_CENTER, spaceAfter=3)
    sub_title_style  = S('SubTitle',  fontSize=10, textColor=MUTED, alignment=TA_CENTER, spaceAfter=12)
    plain_style      = S('Plain',     fontSize=9.5, textColor=TEXT, spaceAfter=4, leading=15, leftIndent=8)

    def pval(v):  return Paragraph(str(v) if v is not None else 'N/A', S('tc', fontSize=10, textColor=TEXT, leading=14))
    def phd(v):   return Paragraph(str(v) if v is not None else '',    S('th', fontSize=10, textColor=WHITE, fontName='Helvetica-Bold', leading=14))
    def wrap(t):  return Paragraph(str(t) if t is not None else 'N/A', S('wr', fontSize=10, textColor=TEXT, leading=14, wordWrap='CJK'))

    def status_html(val, good=70, warn=50):
        if val >= good: return '<font color="#16a34a">Good</font>'
        if val >= warn: return '<font color="#d97706">Needs Work</font>'
        return '<font color="#dc2626">Poor</font>'

    def status_p(val, sid):
        return Paragraph(status_html(val) if val > 0 else '<font color="#6b7280">No data</font>',
                         S(sid, fontSize=10, leading=14))

    TABLE_STYLE = [
        ('ALIGN',         (0,0), (-1,-1), 'LEFT'),
        ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
        ('GRID',          (0,0), (-1,-1), 0.5, BORDER),
        ('TOPPADDING',    (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING',   (0,0), (-1,-1), 10),
        ('RIGHTPADDING',  (0,0), (-1,-1), 10),
    ]

    story = []

    # Title
    story.append(Spacer(1, 8*mm))
    story.append(HRFlowable(width='100%', thickness=1.5, color=ACCENT, spaceAfter=10))
    story.append(Spacer(1, 4))
    story.append(Paragraph('SEO Audit Report', main_title_style))
    story.append(Paragraph('', sub_title_style))
    story.append(HRFlowable(width='100%', thickness=1.5, color=ACCENT, spaceAfter=12))

    # URL
    story.append(Paragraph('Analyzed URL', section_style))
    story.append(Paragraph(url, url_style))
    story.append(Spacer(1, 4))

    # Score Summary table
    story.append(Paragraph('Score Summary', section_style))
    score_data = [
        [phd('Metric'), phd('Score'), phd('Status')],
        [pval('SEO Score'),           pval(f'{seo_score} / 100'),                                    Paragraph(status_html(seo_score), S('ss1', fontSize=10, leading=14))],
        [pval('Desktop Performance'), pval(f'{desktop_perf} / 100' if desktop_perf > 0 else 'N/A'),  status_p(desktop_perf, 'ss2')],
        [pval('Mobile Performance'),  pval(f'{mobile_perf} / 100'  if mobile_perf  > 0 else 'N/A'),  status_p(mobile_perf,  'ss3')],
        [pval('Issues Found'),        pval(str(issues)), pval('')],
        [pval('Broken Links'),
         pval(str(seo.get('broken_links_count') or 0)),
         Paragraph('<font color="#16a34a">Good</font>' if (seo.get('broken_links_count') or 0) == 0
                   else '<font color="#dc2626">Fix Required</font>', S('ss4', fontSize=10, leading=14))],
    ]
    score_table = Table(score_data, colWidths=[PAGE_W*0.45, PAGE_W*0.28, PAGE_W*0.27], repeatRows=1)
    score_table.setStyle(TableStyle(TABLE_STYLE + [
        ('BACKGROUND',     (0,0), (-1,0),  ACCENT),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [LIGHT_BG, WHITE]),
    ]))
    story.append(score_table)
    story.append(Spacer(1, 10))

    # Performance Overview — circle LEFT, bars RIGHT
    story.append(Paragraph('Performance Overview', section_style))

    circle  = _score_circle(seo_score)
    bar_w   = PAGE_W - 120
    bars    = _score_bar_chart([
        ('Desktop Performance', desktop_perf, 100),
        ('Mobile Performance',  mobile_perf,  100),
        ('PageSpeed SEO',       int(desktop.get('seo_score') or 0),            100),
        ('Accessibility',       int(desktop.get('accessibility_score') or 0),  100),
        ('Best Practices',      int(desktop.get('best_practices_score') or 0), 100),
    ], width=bar_w)

    overview_table = Table([[circle, bars]], colWidths=[120, bar_w])
    overview_table.setStyle(TableStyle([
        ('ALIGN',         (0,0), (-1,-1), 'LEFT'),
        ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING',   (0,0), (-1,-1), 0),
        ('RIGHTPADDING',  (0,0), (-1,-1), 0),
        ('TOPPADDING',    (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(overview_table)
    story.append(Spacer(1, 8))

    # On-Page SEO Details
    story.append(Paragraph('On-Page SEO Details', section_style))
    # Helper to format title length with status
    title_len = seo.get('title_length') or len(seo.get('title') or '')
    meta_len  = seo.get('meta_desc_length') or len(seo.get('meta_description') or '')

    def title_len_str(l):
        if l >= 50 and l <= 60: return f'{l} chars (Good)'
        return f'{l} chars (Needs Improvement)'

    def meta_len_str(l):
        if l >= 150 and l <= 160: return f'{l} chars (Good)'
        return f'{l} chars (Needs Improvement)'

    def h1_str(count):
        if count == 0: return f'{count} (Issue)'
        if count > 1:  return f'{count} (Too Many)'
        return f'{count} (Good)'

    def alt_str(count):
        if count == 0: return f'{count} (Good)'
        return f'{count} (Fix Required)'

    def links_str(count):
        if count == 0: return f'{count} (None)'
        return f'{count} (Fix Required)'

    details_data = [
        [phd('Metric'), phd('Value')],
        # On-Page SEO
        [pval('Page Title'),              wrap(seo.get('title') or 'Missing')],
        [pval('Title Length'),            pval(title_len_str(title_len))],
        [pval('Meta Description'),        wrap(seo.get('meta_description') or 'Missing')],
        [pval('Meta Desc Length'),        pval(meta_len_str(meta_len))],
        [pval('Canonical URL'),           wrap(seo.get('canonical_url') or 'Missing')],
        [pval('H1 Tags'),                 pval(h1_str(seo.get('h1_count') or 0))],
        [pval('H2 Tags'),                 pval(str(seo.get('h2_count') or 0))],
        [pval('H3 Tags'),                 pval(str(seo.get('h3_count') or 0))],
        [pval('Word Count'),              pval(f"{seo.get('word_count') or 0} words")],
        [pval('Schema Markup'),           pval(f"{seo.get('schema_count') or 0} items")],
        # Media & Links
        [pval('Total Images'),            pval(str(seo.get('total_images') or 0))],
        [pval('Images Missing Alt'),      pval(alt_str(seo.get('missing_alt_count') or 0))],
        [pval('Internal Links'),          pval(str(seo.get('internal_link_count') or 0))],
        [pval('External Links'),          pval(str(seo.get('external_link_count') or 0))],
        [pval('Broken Links'),            pval(links_str(seo.get('broken_links_count') or 0))],
        # Open Graph
        [pval('OG Title'),                wrap(seo.get('og_title') or 'Missing')],
        [pval('OG Description'),          wrap(seo.get('og_description') or 'Missing')],
        [pval('OG Image'),                wrap(seo.get('og_image') or 'Missing')],
    ]
    details_table = Table(details_data, colWidths=[PAGE_W*0.38, PAGE_W*0.62], repeatRows=1)
    details_table.setStyle(TableStyle(TABLE_STYLE + [
        ('BACKGROUND',     (0,0), (-1,0),  SLATE),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [LIGHT_BG, WHITE]),
        ('VALIGN',         (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(details_table)
    story.append(Spacer(1, 6))

    # Desktop Performance
    story.append(Paragraph('Desktop Performance (Google PageSpeed)', section_style))
    desktop_data = [
        [phd('Metric'), phd('Value')],
        [pval('Performance Score'),              pval(f'{desktop_perf} / 100' if desktop_perf > 0 else 'N/A')],
        [pval('Largest Contentful Paint (LCP)'), pval(desktop_lcp)],
        [pval('Cumulative Layout Shift (CLS)'),  pval(desktop_cls)],
        [pval('Total Blocking Time (TBT)'),      pval(desktop_tbt)],
        [pval('Speed Index (SI)'),               pval(desktop_si)],
    ]
    desktop_table = Table(desktop_data, colWidths=[PAGE_W*0.55, PAGE_W*0.45], repeatRows=1)
    desktop_table.setStyle(TableStyle(TABLE_STYLE + [
        ('BACKGROUND',     (0,0), (-1,0),  colors.HexColor('#0f172a')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [LIGHT_BG2, WHITE]),
    ]))
    story.append(desktop_table)
    story.append(Spacer(1, 6))

    # Mobile Performance
    story.append(Paragraph('Mobile Performance (Google PageSpeed)', section_style))
    mobile_data = [
        [phd('Metric'), phd('Value')],
        [pval('Performance Score'),              pval(f'{mobile_perf} / 100' if mobile_perf > 0 else 'N/A')],
        [pval('Largest Contentful Paint (LCP)'), pval(mobile_lcp)],
        [pval('Cumulative Layout Shift (CLS)'),  pval(mobile_cls)],
        [pval('Total Blocking Time (TBT)'),      pval(mobile_tbt)],
        [pval('Speed Index (SI)'),               pval(mobile_si)],
    ]
    mobile_table = Table(mobile_data, colWidths=[PAGE_W*0.55, PAGE_W*0.45], repeatRows=1)
    mobile_table.setStyle(TableStyle(TABLE_STYLE + [
        ('BACKGROUND',     (0,0), (-1,0),  colors.HexColor('#134e4a')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor('#f0fdf4'), WHITE]),
    ]))
    story.append(mobile_table)
    story.append(Spacer(1, 6))

    # Keyword Analysis
    rake_keywords = keywords.get('rake_keywords') or []
    top_words     = keywords.get('top_words') or []

    if rake_keywords:
        story.append(Paragraph('Keyword Analysis', section_style))
        story.append(Paragraph('Top Keyword Phrases',
                                S('KSub', fontSize=10, fontName='Helvetica-Bold',
                                  textColor=DARK, spaceAfter=4, spaceBefore=4)))
        kw_data = [[phd('Keyword Phrase'), phd('Relevance Score')]]
        for kw in rake_keywords[:12]:
            kw_data.append([pval(str(kw.get('phrase') or '')),
                             pval(str(kw.get('score') or ''))])
        kw_table = Table(kw_data, colWidths=[PAGE_W*0.72, PAGE_W*0.28], repeatRows=1)
        kw_table.setStyle(TableStyle(TABLE_STYLE + [
            ('BACKGROUND',     (0,0), (-1,0),  ACCENT),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [LIGHT_BG, WHITE]),
        ]))
        story.append(kw_table)
        story.append(Spacer(1, 8))

    if top_words:
        story.append(Paragraph('Top Word Frequency',
                                S('KSub2', fontSize=10, fontName='Helvetica-Bold',
                                  textColor=DARK, spaceAfter=4, spaceBefore=4)))
        half  = (len(top_words[:16]) + 1) // 2
        left  = top_words[:half]
        right = top_words[half:half*2]
        tw_data = [[phd('Word'), phd('Count'), phd('Word'), phd('Count')]]
        for i in range(half):
            l = left[i]  if i < len(left)  else {'word': '', 'count': ''}
            r = right[i] if i < len(right) else {'word': '', 'count': ''}
            tw_data.append([pval(l.get('word', '')), pval(str(l.get('count', ''))),
                             pval(r.get('word', '')), pval(str(r.get('count', '')))])
        tw_table = Table(tw_data, colWidths=[PAGE_W*0.36, PAGE_W*0.14, PAGE_W*0.36, PAGE_W*0.14], repeatRows=1)
        tw_table.setStyle(TableStyle(TABLE_STYLE + [
            ('BACKGROUND',     (0,0), (-1,0),  SLATE),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [LIGHT_BG, WHITE]),
        ]))
        story.append(tw_table)
        story.append(Spacer(1, 6))

    # AI Recommendations (highlighted)
    story.append(Paragraph('Recommendations', section_style))
    story.append(HRFlowable(width='100%', thickness=0.5, color=BORDER, spaceAfter=6))

    SECTION_KEYWORDS = [
        'CRITICAL ISSUES', 'ON-PAGE SEO', 'TECHNICAL SEO',
        'OPTIMIZED TITLE', 'OPTIMIZED META', 'KEYWORD STRATEGY', 'PRIORITY SCORE'
    ]

    def is_section_header(line):
        u = line.upper()
        return any(k in u for k in SECTION_KEYWORDS)

    def get_header_bg(line):
        u = line.upper()
        if 'CRITICAL' in u:                    return colors.HexColor('#dc2626')
        if 'ON-PAGE' in u or 'TECHNICAL' in u: return colors.HexColor('#d97706')
        if 'OPTIMIZED' in u or 'KEYWORD' in u: return ACCENT
        if 'PRIORITY' in u:                    return colors.HexColor('#7c3aed')
        return SLATE

    def highlighted_row(text, bg, text_color, left_border=None):
        p = Paragraph(text, S('hr_p', fontSize=9.5, textColor=text_color,
                               leading=15, wordWrap='CJK'))
        t = Table([[p]], colWidths=[PAGE_W])
        style = [
            ('BACKGROUND',    (0,0), (-1,-1), bg),
            ('TOPPADDING',    (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING',   (0,0), (-1,-1), 10),
            ('RIGHTPADDING',  (0,0), (-1,-1), 10),
        ]
        if left_border:
            style.append(('LINEBEFORE', (0,0), (0,-1), 4, left_border))
        t.setStyle(TableStyle(style))
        return t

    for line in ai_text.split('\n'):
        line = line.strip()
        if not line:
            story.append(Spacer(1, 4))
            continue
        if is_section_header(line):
            story.append(Spacer(1, 6))
            story.append(highlighted_row(f'<b>{line}</b>', get_header_bg(line), WHITE))
            story.append(Spacer(1, 3))
        elif line.lower().startswith('issue'):
            story.append(highlighted_row(line, colors.HexColor('#fef2f2'),
                                         colors.HexColor('#7f1d1d'),
                                         left_border=colors.HexColor('#dc2626')))
            story.append(Spacer(1, 2))
        elif line.lower().startswith('fix'):
            story.append(highlighted_row(line, colors.HexColor('#fffbeb'),
                                         colors.HexColor('#78350f'),
                                         left_border=colors.HexColor('#d97706')))
            story.append(Spacer(1, 2))
        else:
            story.append(Paragraph(line, plain_style))

    doc.build(story)
    buffer.seek(0)
    return buffer