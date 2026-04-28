# SEO Suite — Full-Stack Dashboard

## Project Structure

```
seo-suite/
├── backend/
│   ├── app.py           ← Flask API server (your entry point)
│   ├── seo_audit.py     ←  audit engine 
│   └── requirements.txt
└── frontend/
    ├── package.json
    └── src/
        ├── index.js
        ├── App.js               ← Sidebar + routing
        ├── api/
        │   └── seoApi.js        ← All API fetch calls
        ├── components/
        │   └── index.js         ← Reusable UI (Badge, Card, etc.)
        └── pages/
            ├── AuditPage.js     ← Page 1: SEO Audit
            └── ProposalPage.js  ← Page 2: Proposal Generator
```

---

## Setup — Backend

```bash
cd backend

# 1. Create virtualenv
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Add your API keys in seo_audit.py
#    GOOGLE_API_KEY = "..."
#    GROQ_API_KEY   = "..."

# 4. Start the Flask server
python app.py
# → Running on http://localhost:5000
```

---

## Setup — Frontend

```bash
cd frontend

npm install
npm start
# → Opens http://localhost:3000
# Create React App auto-proxies /api/* → localhost:5000
```

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
  "seo_data": {
    "title": "Example Domain",
    "meta_description": "...",
    "missing_alt_count": 3,
    "h1_count": 1,
    "h2_count": 4,
    "links": ["https://...", "..."]
  },
  "performance": {
    "performance_score": 82,
    "lcp": "2.1 s",
    "cls": "0.02",
    "tbt": "140 ms"
  },
  "broken_links": ["https://example.com/dead-link"],
  "recommendations": "AI-generated recommendations from Groq..."
}
```

### POST /api/proposal  ← (Asma's endpoint — integrate when ready)

**Request:**
```json
{
  "clientName": "Acme Corp",
  "website": "https://acmecorp.com",
  "industry": "E-commerce",
  "budget": "1000-2500",
  "goals": "Increase organic traffic by 50%",
  "painPoints": "Low rankings, slow speed",
  "timeline": "6 months"
}
```

**Response:**
```json
{ "proposal": "Full proposal text..." }
```

---

## Connecting Asma's Proposal API

In `src/pages/ProposalPage.js`, find the `callProposalAPI` function and:

1. **Uncomment** the `fetch()` block
2. **Remove** the offline fallback `generateLocally()` call
3. Set `REACT_APP_API_URL` in a `.env` file if backend is on a different host:

```
REACT_APP_API_URL=https://your-backend.com
```

---

## How Frontend ↔ Backend Flow Works

```
AuditPage.js
  └─ handleAudit()
       └─ seoApi.js → runAudit(url)
            └─ POST /api/audit
                 └─ app.py → run_seo_audit(url)
                      ├─ scrape_website()
                      ├─ get_pagespeed_data()
                      ├─ check_broken_links()
                      └─ generate_recommendations()  ← Groq AI
                           └─ JSON response
                                └─ parseResult() → renders UI
```

---

## Production Deployment

**Backend (e.g. Railway / Render):**
```bash
pip install gunicorn
gunicorn app:app --bind 0.0.0.0:$PORT
```

**Frontend (e.g. Vercel / Netlify):**
```bash
npm run build
# Set env var: REACT_APP_API_URL=https://your-deployed-backend.com
```
