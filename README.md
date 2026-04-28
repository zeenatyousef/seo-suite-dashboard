# SEO Suite — Full-Stack Dashboard

## Project Structure
seo-suite/
├── Backend/
│   ├── app.py                  ← Flask API server (entry point)
│   ├── seo_audit.py            ← SEO scraping + PageSpeed engine
│   ├── proposal_generator.py   ← Groq-powered proposal generation
│   ├── pdf_generator.py        ← ReportLab PDF report builder
│   └── requirements.txt
└── Frontend/
├── package.json
└── src/
├── index.js
├── App.js               ← Sidebar + routing
├── styles.css
├── api/
│   └── seoApi.js        ← All API fetch calls
├── components/
│   └── index.js         ← Reusable UI (Badge, Card, StatCard, etc.)
└── pages/
├── AuditPage.js     ← SEO Audit with desktop & mobile scores
├── ProposalPage.js  ← Freelance Proposal Generator
└── HistoryPage.js   ← Search history log

---

## Setup — Backend

```bash
cd Backend

# 1. Create virtualenv
python -m venv venv
venv\Scripts\activate        # Mac/Linux: source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Create a .env file in the Backend folder
#    GROQ_API_KEY=your_groq_api_key
#    PAGESPEED_API_KEY=your_pagespeed_api_key

# 4. Start the Flask server
python app.py
# → Running on http://localhost:5000
```

---

## Setup — Frontend

```bash
cd Frontend

npm install
npm start
# → Opens http://localhost:3000
```

---

## Environment Variables

Create a `.env` file inside the `Backend` folder:
GROQ_API_KEY=your_key_from_console.groq.com
PAGESPEED_API_KEY=your_key_from_google_cloud_console

---

## API Reference

### POST /api/audit

**Request:**
```json
{ "url": "https://example.com" }
```

**Response:**
```json
{
  "url": "https://example.com",
  "seo": {
    "title": "Example Domain",
    "meta_description": "...",
    "h1_count": 1,
    "h2_count": 4,
    "missing_alt_count": 3,
    "broken_links_count": 0,
    "word_count": 320,
    "canonical_url": "https://example.com",
    "schema_count": 1,
    "internal_link_count": 12,
    "external_link_count": 3
  },
  "desktop": {
    "performance_score": 91,
    "accessibility_score": 95,
    "best_practices_score": 100,
    "seo_score": 92,
    "LCP": "1.1 s",
    "CLS": "0.01",
    "TBT": "120 ms",
    "SI": "2.3 s"
  },
  "mobile": {
    "performance_score": 40,
    "LCP": "4.2 s",
    "CLS": "0.03",
    "TBT": "870 ms",
    "SI": "5.1 s"
  },
  "keywords": {
    "rake_keywords": [{"phrase": "online courses", "score": 16.0}],
    "top_words": [{"word": "skills", "count": 6}]
  },
  "ai_suggestions": "CRITICAL ISSUES\nIssue 1: ..."
}
```

---

### POST /api/proposal

**Request:**
```json
{
  "requirement": "I need a React developer...",
  "budget": "$500",
  "platform": "upwork",
  "tone": "confident",
  "industry": "tech",
  "name": "Sara",
  "humanize": true
}
```

**Response:**
```json
{ "proposal": "SHORT PROPOSAL:\n...\n\nDETAILED PROPOSAL:\n..." }
```

---

### POST /api/audit/pdf

**Request:** Full audit JSON (same as audit response above)

**Response:** PDF file download

---

## How Frontend ↔ Backend Flow Works
AuditPage.js
└─ handleAudit()
└─ seoApi.js → runAudit(url)
└─ POST /api/audit
└─ app.py → run_seo_audit(url)
├─ scrape_seo()           ← BeautifulSoup + Cloudscraper
├─ extract_keywords()     ← RAKE-NLTK
├─ get_pagespeed()        ← Desktop + Mobile in parallel
└─ get_ai_suggestions()  ← Groq Llama 3
└─ JSON response
└─ renders UI cards, charts, tables
ProposalPage.js
└─ handleGenerate()
└─ seoApi.js → generateProposal(form)
└─ POST /api/proposal
└─ proposal_generator.py
├─ _generate_proposal()  ← Groq Llama 3.3-70b
└─ _vary_structure()     ← Rule-based post-processing

---

## Features

- **SEO Audit** — Scrapes any website, analyzes title, meta, headings, images, links
- **Desktop & Mobile PageSpeed** — Fetches both strategies simultaneously
- **AI Recommendations** — Sectioned output with Critical Issues, Fixes, Optimized Title/Meta
- **Keyword Analysis** — RAKE keyword extraction + word frequency tables
- **Proposal Generator** — Short + Detailed proposals for Upwork, Fiverr, LinkedIn and more
- **PDF Report** — Professional report with bar chart, score circle, keyword tables, highlighted AI sections
- **Search History** — Saves audited URLs, supports one-click re-audit
- **Dark / Light Mode** — Fully themed UI

---

## Production Deployment

**Backend (Railway / Render):**
```bash
pip install gunicorn
gunicorn app:app --bind 0.0.0.0:$PORT
```

**Frontend (Vercel / Netlify):**
```bash
npm run build
# Set env var: REACT_APP_API_URL=https://your-deployed-backend.com
```

---

## Developed By
Zeenat, Vishaqa and Asma — Internship Project @ Pseb Punjab
