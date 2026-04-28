# proposal_generator.py 
import os
import time
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# ── Config maps ────────────────────
TONE_MAP = {
    'formal':    'Professional, structured, polite, business tone.',
    'friendly':  'Warm, conversational, slightly casual tone that builds rapport.',
    'confident': 'Authoritative, expert voice — you are clearly the best choice.',
    'casual':    'Relaxed, direct, like texting a business contact you already know.',
}

PLATFORM_MAP = {
    'upwork':     'Upwork-style: concise, value-focused, professional. No fluff.',
    'fiverr':     'Fiverr-style: energetic, quick, benefit-driven. Keep it punchy.',
    'freelancer': 'Freelancer.com-style: detailed, structured, comprehensive.',
    'email':      'Email format: polite, well-structured, slightly formal.',
    'whatsapp':   'WhatsApp-style: short, casual, friendly. Like a voice note in text.',
    'linkedin':   'LinkedIn-style: professional but human, no buzzwords, story-driven.',
}

INDUSTRY_MAP = {
    'tech':      'Tech/Software: technical but clear, mention reliability and performance.',
    'design':    'Design/Creative: visual thinking, user-centric, aesthetic language.',
    'marketing': 'Marketing/Business: ROI-focused, results-driven, growth language.',
    'writing':   'Content/Writing: engaging, storytelling, clarity-first.',
    'ecommerce': 'E-commerce: conversion-focused, customer experience, revenue impact.',
    'ai':        'AI/ML: practical outcomes over hype, accuracy, speed, ROI.',
    'general':   'General business: versatile, adaptable, clear value proposition.',
}

# ── Groq client ───────────────────────────────────────────────
client = Groq(api_key=os.getenv('GROQ_API_KEY'))


def _generate_base(requirement, budget, platform, tone, industry, name):
    """Step 1 — Generate the base proposal."""
    system = (
        'You are a real freelancer who wins projects because your proposals feel personal, '
        'direct, and genuinely human. You never sound like an AI. You write the way people '
        'actually talk in business: confident, clear, occasionally imperfect.'
    )

    prompt = f"""Write a freelance proposal for the following brief.

CLIENT DETAILS:
- Requirement: {requirement}
- Budget: {budget}
- Platform style: {PLATFORM_MAP[platform]}
- Tone: {TONE_MAP[tone]}
- Industry context: {INDUSTRY_MAP[industry]}
- Freelancer name: {name}

WRITING RULES (follow every single one):
1. Open by addressing the CLIENT'S PROBLEM directly, not your skills.
2. First 2 lines must hook them, show you actually read their brief.
3. Use contractions naturally: I'm, don't, I'll, you're, that's.
4. Mix very short sentences with longer ones. Vary the rhythm.
5. Never use hyphens (-). Use commas, parentheses, or just rewrite.
6. Avoid ALL of these words: leverage, synergy, robust, seamlessly, cutting-edge,
   innovative, excited, passionate, dedicated, I am pleased, I am writing to.
7. No bullet points inside the proposal. Flowing paragraphs only.
8. Show you understand a risk or mistake others might make on this project.
9. Reduce client risk: offer a small start, demo, or sample.
10. End with a clear next step question, signed with the name: {name}
11. Sound like it was written in 5 minutes by a real person, not polished by AI.

OUTPUT FORMAT (exact headings required):
=====================================
SHORT PROPOSAL:
[6 to 8 natural sentences. Strong hook, quick value, clear CTA.]

DETAILED PROPOSAL:
[10 to 13 sentences covering: problem understanding, your approach,
why you over others, risk reduction, and a clear next step.]
=====================================

CRITICAL: Must feel written by a real human. Slight imperfection is good.
Must NOT feel like an AI template."""

    response = client.chat.completions.create(
        model='llama-3.3-70b-versatile',
        messages=[
            {'role': 'system', 'content': system},
            {'role': 'user',   'content': prompt},
        ],
        temperature=0.92,
        max_tokens=900,
        top_p=0.9,
    )
    return response.choices[0].message.content.strip()


def _humanize(text, passes=2):
    """
    Step 2 — Multi-pass humanization to eliminate AI detection patterns.
    Pass 1: Remove AI fingerprints, vary sentence openers.
    Pass 2: Add micro-imperfections, natural rhythm, colloquial touches.
    """
    strategies = [
        # Pass 1: structural
        """Rewrite the proposal below to eliminate AI detection patterns.
DO:
- Vary how each sentence starts (don't repeat 'I', 'The', 'This')
- Break up any sentences that feel too smooth or perfect
- Replace formal connectors (Furthermore, Moreover, Additionally) with natural ones
- Keep the SHORT PROPOSAL and DETAILED PROPOSAL headings exactly as-is
- Keep all the original meaning and facts
- Remove any remaining hyphens, replace with commas or restructure
DON'T:
- Add new information
- Make it longer
- Use the words: leverage, synergy, robust, seamlessly, excited, passionate

TEXT TO REWRITE:
""",
        # Pass 2: micro-imperfections
        """Make the proposal below sound more like a real person typed it quickly.
DO:
- Add natural filler phrases where they fit: 'honestly', 'to be fair', 'look', 'the thing is'
- Use ellipsis (...) once or twice where a person might trail off or think
- Let one or two sentences be slightly informal or punchy
- Keep the SHORT PROPOSAL and DETAILED PROPOSAL headings exactly as-is
- Preserve all facts, names, and the ending CTA
DON'T:
- Change the core message
- Add bullet points
- Make it sound unprofessional or sloppy
- Use hyphens (-)

TEXT TO REWRITE:
""",
    ]

    current = text
    for i in range(passes):
        try:
            print(f'[Humanize] Pass {i+1}/{passes}...')
            resp = client.chat.completions.create(
                model='llama-3.3-70b-versatile',
                messages=[{'role': 'user', 'content': strategies[i] + current}],
                temperature=0.85 + (i * 0.05),
                max_tokens=1000,
                top_p=0.95,
            )
            current = resp.choices[0].message.content.strip()
            time.sleep(0.5)
        except Exception as e:
            print(f'[Humanize] Pass {i+1} failed: {e}. Keeping previous version.')
            print(f'[Humanize] Error type: {type(e).__name__}')
    return current


def generate_proposal(requirement, budget, platform, tone, industry, name, humanize=True):
    print(f">>> generate_proposal called | humanize={humanize}")

    tone     = tone.lower().strip()
    industry = industry.lower().strip()
    platform = platform.lower().strip()

    if tone     not in TONE_MAP:     tone     = 'formal'
    if industry not in INDUSTRY_MAP: industry = 'general'
    if platform not in PLATFORM_MAP: platform = 'email'

    result = _generate_base(requirement, budget, platform, tone, industry, name)
    print(f">>> Base proposal done. Length: {len(result)}")

    if humanize:
        print(">>> Humanize is TRUE — starting _humanize()")
        result = _humanize(result, passes=2)
        print(f">>> Humanization done. Length: {len(result)}")
        print(">>> HUMANIZED OUTPUT PREVIEW:")
        print(result[:300])  # 👈 ADD THIS — shows first 300 chars
    else:
        print(">>> Humanize is FALSE — skipping")

    return result
