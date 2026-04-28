import React, { useState, useEffect, useRef } from 'react';
import { runAudit, downloadAuditPdf } from '../api/seoApi';
import { Spinner, ErrorMessage, Card, StatCard, ScoreCircle, ProgressBar, IssueRow } from '../components';

const HISTORY_KEY = 'seo-audit-history';

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}

function saveToHistory(url) {
  try {
    const prev = loadHistory().filter(u => u !== url);
    localStorage.setItem(HISTORY_KEY, JSON.stringify([url, ...prev].slice(0, 20)));
  } catch {}
}

function parseScore(speed) {
  if (!speed) return 0;
  let s = speed.performance_score;
  if (typeof s === 'number') return s > 0 && s <= 1 ? Math.round(s * 100) : Math.round(s);
  return 0;
}

function calcSeoScore(seo) {
  let score = 100;
  if (!seo.meta_description || seo.meta_description === 'Missing') score -= 15;
  if ((seo.h1_count||0) === 0)  score -= 15;
  if ((seo.h1_count||0) > 1)    score -= 5;
  if ((seo.missing_alt_count||0) > 0)  score -= Math.min(seo.missing_alt_count * 2, 20);
  if ((seo.broken_links_count||0) > 0) score -= Math.min(seo.broken_links_count * 3, 15);
  return Math.max(0, Math.min(100, score));
}

function buildIssues(seo, ds, ms) {
  const issues = [];
  if (!seo.meta_description || seo.meta_description === 'Missing')
    issues.push({ severity:'high',   title:'Missing meta description', description:'Add a 150-160 character meta description.' });
  if ((seo.h1_count||0) === 0)
    issues.push({ severity:'high',   title:'No H1 tag found', description:'Add exactly one H1 tag.' });
  if ((seo.h1_count||0) > 1)
    issues.push({ severity:'medium', title:seo.h1_count+' H1 tags found', description:'Use only one H1 per page.' });
  if ((seo.missing_alt_count||0) > 0)
    issues.push({ severity:'medium', title:seo.missing_alt_count+' images without alt text', description:'Alt text helps Google index images.' });
  if ((seo.broken_links_count||0) > 0)
    issues.push({ severity:'high',   title:seo.broken_links_count+' broken links', description:'Fix or remove broken links.' });
  if (ms > 0 && ms < 50)
    issues.push({ severity:'high',   title:'Poor mobile performance: '+ms+'/100', description:'Mobile users face very slow load times.' });
  else if (ms >= 50 && ms < 80)
    issues.push({ severity:'medium', title:'Mobile performance needs work: '+ms+'/100', description:'Improve mobile Core Web Vitals.' });
  if (ds > 0 && ds < 70)
    issues.push({ severity:'medium', title:'Desktop performance: '+ds+'/100', description:'Optimize server response time and asset delivery.' });
  return issues;
}

// ── Progress steps matching what backend actually does ────────
const STEPS = [
  { label: 'Connecting to website...',            pct: 10 },
  { label: 'Scraping page content...',            pct: 25 },
  { label: 'Extracting SEO data...',              pct: 38 },
  { label: 'Fetching Desktop PageSpeed...',       pct: 52 },
  { label: 'Fetching Mobile PageSpeed...',        pct: 66 },
  { label: 'Analysing keywords...',               pct: 76 },
  { label: 'Generating recommendations...',       pct: 88 },
  { label: 'Preparing results...',                pct: 96 },
];

function LoadingProgress({ active }) {
  const [stepIdx, setStepIdx]   = useState(0);
  const [pct,     setPct]       = useState(0);
  const [smooth,  setSmooth]    = useState(0);
  const timerRef = useRef(null);
  const smoothRef = useRef(null);

  useEffect(() => {
    if (!active) {
      setStepIdx(0); setPct(0); setSmooth(0);
      return;
    }

    // Step through stages with realistic delays
    const delays = [600, 1400, 900, 3500, 3500, 800, 4000, 800];
    let idx = 0;

    function advance() {
      if (idx >= STEPS.length) return;
      setStepIdx(idx);
      setPct(STEPS[idx].pct);
      idx++;
      timerRef.current = setTimeout(advance, delays[idx - 1] || 1000);
    }
    advance();

    return () => clearTimeout(timerRef.current);
  }, [active]);

  // Smooth bar animation
  useEffect(() => {
    clearInterval(smoothRef.current);
    smoothRef.current = setInterval(() => {
      setSmooth(prev => {
        if (prev >= pct) { clearInterval(smoothRef.current); return pct; }
        return Math.min(prev + 1, pct);
      });
    }, 20);
    return () => clearInterval(smoothRef.current);
  }, [pct]);

  if (!active) return null;

  const step = STEPS[Math.min(stepIdx, STEPS.length - 1)];

  return (
    <div style={{ marginBottom:'1.5rem', animation:'fadeUp 0.3s ease' }}>

      {/* Step label + percentage */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:'#16a34a', boxShadow:'0 0 6px #16a34a', animation:'pulse 1.2s ease-in-out infinite' }} />
          <span style={{ fontSize:13, color:'var(--text2)' }}>{step.label}</span>
        </div>
        <span style={{ fontSize:13, fontWeight:600, color:'#16a34a' }}>{smooth}%</span>
      </div>

      {/* Slim green progress bar */}
      <div style={{ background:'var(--surface2)', borderRadius:99, height:3, overflow:'hidden' }}>
        <div style={{
          height:'100%',
          borderRadius:99,
          width: smooth + '%',
          background: 'linear-gradient(90deg, #16a34a, #4ade80)',
          transition: 'width 0.25s linear',
          position: 'relative',
        }}>
          <div style={{
            position:'absolute', top:0, left:0, right:0, bottom:0,
            background:'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
            animation:'shimmer 1.4s infinite',
          }} />
        </div>
      </div>

    </div>
  );
}

// ── Speed metrics ─────────────────────────────────────────────
function SpeedMetrics({ speed, score, label }) {
  const metrics = [
    ['LCP',         speed?.LCP  || 'N/A'],
    ['CLS',         speed?.CLS  || 'N/A'],
    ['TBT',         speed?.TBT  || 'N/A'],
    ['Speed Index', speed?.SI   || 'N/A'],
    ['FCP',         speed?.FCP  || 'N/A'],
  ];

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <span style={{ fontSize:13, color:'var(--text3)', fontWeight:500 }}>{label} Performance</span>
        <span style={{ fontSize:28, fontWeight:700, color: score>=70?'var(--green)':score>=50?'var(--yellow)':score>0?'var(--red)':'var(--text3)' }}>
          {score > 0 ? score : 'N/A'}
          {score > 0 && <span style={{ fontSize:13, fontWeight:400, color:'var(--text3)' }}>/100</span>}
        </span>
      </div>
      {speed?.error ? (
        <div style={{ padding:'10px 12px', background:'var(--yellow-bg)', borderRadius:8, fontSize:13, color:'var(--yellow)' }}>
          ⚠ {speed.error}
        </div>
      ) : (
        metrics.map(([k, v]) => (
          <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--border)' }}>
            <span style={{ fontSize:13, color:'var(--text3)' }}>{k}</span>
            <span style={{ fontSize:13, color:'var(--text2)', fontWeight:500 }}>{v}</span>
          </div>
        ))
      )}
    </div>
  );
}

export default function AuditPage({ triggerUrl, onAuditDone }) {
  const [url,          setUrl]          = useState('');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [result,       setResult]       = useState(null);
  const [rawData,      setRawData]      = useState(null);
  const [activeTab,    setActiveTab]    = useState('desktop');
  const [pdfLoading,   setPdfLoading]   = useState(false);
  const [pdfError,     setPdfError]     = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [history,      setHistory]      = useState(loadHistory);
  const inputRef = useRef(null);
  const dropRef  = useRef(null);

  // Auto-run audit when triggered from History page
  useEffect(() => {
    if (triggerUrl && triggerUrl.trim()) {
      setUrl(triggerUrl);
      setError(''); setResult(null); setRawData(null); setLoading(true);
      setActiveTab('desktop');
      setShowDropdown(false);
      runAudit(triggerUrl.trim()).then(raw => {
        saveToHistory(triggerUrl.trim());
        setHistory(loadHistory());
        setRawData(raw);
        const seo = raw.seo     || {};
        const ds  = parseScore(raw.desktop);
        const ms  = parseScore(raw.mobile);
        setResult({
          seoScore:     calcSeoScore(seo),
          desktopScore: ds,
          mobileScore:  ms,
          issues:       buildIssues(seo, ds, ms),
          seo,
          desktop:  raw.desktop  || {},
          mobile:   raw.mobile   || {},
          keywords: raw.keywords || {},
          ai:       raw.ai_suggestions || '',
        });
      }).catch(e => {
        setError(e.message || 'Audit failed. Is the backend running on port 5000?');
      }).finally(() => {
        setLoading(false);
        if (onAuditDone) onAuditDone();
      });
    }
  }, [triggerUrl]);

  // Inject shimmer keyframe once
  useEffect(() => {
    if (!document.getElementById('shimmer-kf')) {
      const s = document.createElement('style');
      s.id = 'shimmer-kf';
      s.textContent = `
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `;
      document.head.appendChild(s);
    }
  }, []);

  const filtered = url.trim()
    ? history.filter(h => h.toLowerCase().includes(url.toLowerCase())).slice(0, 8)
    : history.slice(0, 8);

  function selectSuggestion(val) {
    setUrl(val);
    setShowDropdown(false);
    setError(''); setResult(null); setRawData(null); setLoading(true);
    setActiveTab('desktop');
    runAudit(val.trim()).then(raw => {
      saveToHistory(val.trim());
      setHistory(loadHistory());
      setRawData(raw);
      const seo = raw.seo     || {};
      const ds  = parseScore(raw.desktop);
      const ms  = parseScore(raw.mobile);
      setResult({
        seoScore:     calcSeoScore(seo),
        desktopScore: ds,
        mobileScore:  ms,
        issues:       buildIssues(seo, ds, ms),
        seo,
        desktop:  raw.desktop  || {},
        mobile:   raw.mobile   || {},
        keywords: raw.keywords || {},
        ai:       raw.ai_suggestions || '',
      });
    }).catch(e => {
      setError(e.message || 'Audit failed. Is the backend running on port 5000?');
    }).finally(() => {
      setLoading(false);
      setShowDropdown(false);
    });
  }

  async function handleDownloadPdf() {
    if (!rawData) return;
    setPdfError(''); setPdfLoading(true);
    try { await downloadAuditPdf(rawData); }
    catch(e) { setPdfError(e.message || 'PDF failed.'); }
    finally { setPdfLoading(false); }
  }

  const activeSpeed = activeTab === 'desktop' ? result?.desktop : result?.mobile;
  const activeScore = activeTab === 'desktop' ? result?.desktopScore : result?.mobileScore;

  return (
    <div style={{ animation:'fadeUp 0.3s ease' }}>

      <div style={{ marginBottom:'1.5rem' }}>
        <h1 style={{ fontSize:26, fontWeight:700, color:'var(--text)', letterSpacing:'-0.02em', marginBottom:6 }}>SEO Audit</h1>
        <p style={{ fontSize:15, color:'var(--text3)', lineHeight:1.6 }}>Fetches desktop &amp; mobile performance simultaneously.</p>
      </div>

      {/* ── Search bar ── */}
      <div style={{ marginBottom:'1.5rem' }}>
        <div style={{ position:'relative' }}>
          <div style={{ display:'flex', alignItems:'center', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'6px 6px 6px 16px', gap:10 }}>
            <svg style={{ width:18, height:18, flexShrink:0 }} viewBox="0 0 24 24" fill="none">
              <path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" stroke="var(--text3)" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <input
              ref={inputRef}
              style={{ flex:1, background:'transparent', border:'none', fontSize:15, color:'var(--text)', outline:'none', padding:'6px 0', minWidth:0 }}
              placeholder="Enter website URL"
              value={url}
              onChange={e => { setUrl(e.target.value); setShowDropdown(true); }}
              onFocus={() => { if (url.trim()) setShowDropdown(true); }}
              onKeyDown={e => {
                if (e.key === 'Enter')  { setShowDropdown(false); handleAudit(); }
                if (e.key === 'Escape') setShowDropdown(false);
              }}
            />
            {url && (
              <button onClick={() => { setUrl(''); setShowDropdown(false); }}
                style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)', padding:'0 4px', fontSize:18, lineHeight:1 }}>
                ×
              </button>
            )}
            <button
              style={{ padding:'10px 22px', background: loading ? 'var(--border2)' : 'var(--accent)', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:600, cursor: loading ? 'not-allowed' : 'pointer', whiteSpace:'nowrap', flexShrink:0, fontFamily:'inherit', transition:'background 0.2s' }}
              onClick={() => { setShowDropdown(false); handleAudit(); }}
              disabled={loading}
            >
              {loading ? 'Analyzing...' : 'Run Audit'}
            </button>
          </div>

          {/* Dropdown */}
          {showDropdown && filtered.length > 0 && (
            <div ref={dropRef} style={{ position:'absolute', top:'calc(100% + 6px)', left:0, right:0, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, zIndex:50, overflow:'hidden', boxShadow:'0 8px 24px rgba(0,0,0,0.15)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 14px 6px', borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontSize:11, fontWeight:600, color:'var(--text3)', letterSpacing:'0.08em' }}>
                  {url.trim() ? 'MATCHING HISTORY' : 'RECENT SEARCHES'}
                </span>
                {history.length > 0 && !url.trim() && (
                  <button onClick={() => { localStorage.removeItem(HISTORY_KEY); setHistory([]); }}
                    style={{ fontSize:11, color:'var(--red)', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
                    Clear history
                  </button>
                )}
              </div>
              {filtered.map((item, i) => (
                <div key={i} onClick={() => selectSuggestion(item)}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', cursor:'pointer', borderBottom: i < filtered.length-1 ? '1px solid var(--border)' : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0, color:'var(--text3)' }}>
                    <path d="M12 8v4l3 3M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                  <span style={{ fontSize:14, color:'var(--text2)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item}</span>
                  <span style={{ fontSize:10, color:'var(--text3)' }}>recent</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <ErrorMessage message={error} />
      </div>

      {/* ── Progress bar loader ── */}
      <LoadingProgress active={loading} />

      {result && (
        <div style={{ animation:'fadeUp 0.3s ease' }}>

          {/* URL + Download */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', flexWrap:'wrap', gap:10 }}>
            <span style={{ fontSize:13, color:'var(--text3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:420 }}>{rawData?.url}</span>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              {pdfError && <span style={{ fontSize:12, color:'var(--red)' }}>{pdfError}</span>}
              <button onClick={handleDownloadPdf} disabled={pdfLoading}
                style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 16px', background: pdfLoading ? 'var(--border2)' : 'var(--green-bg)', color: pdfLoading ? 'var(--text3)' : 'var(--green)', border:'1px solid', borderColor: pdfLoading ? 'var(--border)' : 'rgba(74,222,128,0.3)', borderRadius:10, fontSize:13, fontWeight:600, cursor: pdfLoading ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}>
                {pdfLoading
                  ? <><div style={{ width:13, height:13, border:'2px solid var(--border)', borderTopColor:'var(--green)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />Generating...</>
                  : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Download PDF</>
                }
              </button>
            </div>
          </div>

          {/* Stat cards row 1 */}
          <div className="stats-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:'1rem' }}>
            <StatCard label="SEO SCORE"    value={result.seoScore+'/100'}                    color={result.seoScore>=70?'green':result.seoScore>=50?'yellow':'red'} />
            <StatCard label="ISSUES FOUND" value={result.issues.length}                      color={result.issues.length===0?'green':'red'} />
            <StatCard label="BROKEN LINKS" value={result.seo.broken_links_count||0}          color={(result.seo.broken_links_count||0)===0?'green':'red'} />
            <StatCard label="WORD COUNT"   value={(result.seo.word_count||0).toLocaleString()} color={(result.seo.word_count||0)>=300?'green':'yellow'} />
          </div>

          {/* Stat cards row 2 */}
          <div className="stats-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:'1rem' }}>
            <StatCard label="PAGESPEED SEO"  value={result.desktop?.seo_score>0?result.desktop.seo_score+'/100':'N/A'}              color={result.desktop?.seo_score>=70?'green':result.desktop?.seo_score>=50?'yellow':'red'} />
            <StatCard label="ACCESSIBILITY"  value={result.desktop?.accessibility_score>0?result.desktop.accessibility_score+'/100':'N/A'} color={result.desktop?.accessibility_score>=70?'green':result.desktop?.accessibility_score>=50?'yellow':'red'} />
            <StatCard label="BEST PRACTICES" value={result.desktop?.best_practices_score>0?result.desktop.best_practices_score+'/100':'N/A'} color={result.desktop?.best_practices_score>=70?'green':result.desktop?.best_practices_score>=50?'yellow':'red'} />
            <StatCard label="SCHEMA MARKUP"  value={(result.seo.schema_count||0)+' items'}  color={(result.seo.schema_count||0)>0?'green':'yellow'} />
          </div>

          {/* Desktop/Mobile tab */}
          <Card style={{ marginBottom:'1rem', padding:'0' }}>
            <div style={{ display:'flex', borderBottom:'1px solid var(--border)' }}>
              {[
                { key:'desktop', label:'Desktop', score: result.desktopScore,
                  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
                { key:'mobile',  label:'Mobile',  score: result.mobileScore,
                  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="18" r="1" fill="currentColor"/></svg> },
              ].map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  style={{ flex:1, padding:'14px 16px', background: activeTab===tab.key?'var(--surface)':'var(--surface2)', border:'none', borderBottom: activeTab===tab.key?'2px solid var(--accent)':'2px solid transparent', cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                  <span style={{ color: activeTab===tab.key?'var(--accent)':'var(--text3)' }}>{tab.icon}</span>
                  <span style={{ fontSize:14, fontWeight: activeTab===tab.key?600:400, color: activeTab===tab.key?'var(--accent)':'var(--text3)' }}>{tab.label}</span>
                  <span style={{ padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:700,
                    background: tab.score>=70?'var(--green-bg)':tab.score>=50?'var(--yellow-bg)':tab.score>0?'var(--red-bg)':'var(--surface2)',
                    color:      tab.score>=70?'var(--green)':tab.score>=50?'var(--yellow)':tab.score>0?'var(--red)':'var(--text3)' }}>
                    {tab.score > 0 ? tab.score : 'N/A'}
                  </span>
                </button>
              ))}
            </div>
            <div style={{ padding:'1.25rem' }}>
              <SpeedMetrics speed={activeSpeed} score={activeScore} label={activeTab==='desktop'?'Desktop':'Mobile'} />
            </div>
          </Card>

          {/* Score breakdown + Page details */}
          <div className="two-col" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
           <Card title="Score Breakdown">
  <div style={{ display:'flex', gap:'1.5rem', alignItems:'center', flexWrap:'wrap' }}>
    <ScoreCircle score={activeScore || result.seoScore} />
    <div style={{ flex:1, minWidth:140 }}>
      <ProgressBar label="On-page SEO"
        value={result.seo.h1_count===1&&result.seo.meta_description!=='Missing'?90:50}
        max={100} />
      <ProgressBar label={activeTab==='desktop' ? 'Desktop Performance' : 'Mobile Performance'}
        value={activeScore}
        max={100} />
      <ProgressBar label="Accessibility"
        value={activeTab==='desktop'
          ? (result.desktop?.accessibility_score || 0)
          : (result.mobile?.accessibility_score  || 0)}
        max={100} />
      <ProgressBar label="Best Practices"
        value={activeTab==='desktop'
          ? (result.desktop?.best_practices_score || 0)
          : (result.mobile?.best_practices_score  || 0)}
        max={100} />
      <ProgressBar label="Alt text"
        value={result.seo.missing_alt_count===0?100:Math.max(0,100-(result.seo.missing_alt_count||0)*10)}
        max={100} />
      <ProgressBar label="Link health"
        value={(result.seo.broken_links_count||0)===0?100:Math.max(0,100-(result.seo.broken_links_count||0)*10)}
        max={100} />
      <p style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>
        Showing {activeTab === 'desktop' ? '🖥 Desktop' : '📱 Mobile'} scores — switch tab to compare
      </p>
    </div>
  </div>
</Card>

            <Card title="Page Details">
              {[
                ['Title',          result.seo.title],
                ['Title Length',   (result.seo.title_length||0)+' chars'],
                ['Meta Desc',      result.seo.meta_description],
                ['Meta Desc Len',  (result.seo.meta_desc_length||0)+' chars'],
                ['Canonical URL',  result.seo.canonical_url||'Missing'],
                ['Robots Meta',    result.seo.robots_meta||'Not specified'],
                ['OG Title',       result.seo.og_title||'Missing'],
                ['H1 Tags',        result.seo.h1_count],
                ['H2 / H3 Tags',   (result.seo.h2_count||0)+' / '+(result.seo.h3_count||0)],
                ['Word Count',     (result.seo.word_count||0).toLocaleString()+' words'],
                ['Schema Markup',  (result.seo.schema_count||0)+' items'],
                ['Total Images',   result.seo.total_images||0],
                ['Images No Alt',  result.seo.missing_alt_count],
                ['Internal Links', result.seo.internal_link_count||0],
                ['External Links', result.seo.external_link_count||0],
                ['Broken Links',   result.seo.broken_links_count],
              ].map(([k,v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:'1px solid var(--border)' }}>
                  <span style={{ fontSize:13, color:'var(--text3)', flexShrink:0 }}>{k}</span>
                  <span style={{ fontSize:13, color:'var(--text2)', fontWeight:500, textAlign:'right', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'55%' }}>
                    {String(v).length>38?String(v).slice(0,38)+'...':String(v)}
                  </span>
                </div>
              ))}
            </Card>
          </div>

          {/* Issues */}
          <Card title={'Issues Detected — '+result.issues.length+' found'}>
            {result.issues.length===0
              ? <p style={{ color:'var(--green)', fontSize:14 }}>No critical issues found. Great work!</p>
              : result.issues.map((iss,i) => <IssueRow key={i} {...iss} />)
            }
          </Card>

          {/* AI Recommendations */}
          {/* AI Recommendations — sectioned */}
<Card title="Recommendations">
  {result.ai ? (() => {
    const SECTION_KEYS = ['CRITICAL ISSUES','ON-PAGE SEO','TECHNICAL SEO','OPTIMIZED TITLE','OPTIMIZED META','KEYWORD STRATEGY','PRIORITY SCORE'];
    const sectionBg = (line) => {
      const u = line.toUpperCase();
      if (u.includes('CRITICAL'))  return { bg:'#dc2626', color:'#fff' };
      if (u.includes('ON-PAGE') || u.includes('TECHNICAL')) return { bg:'#d97706', color:'#fff' };
      if (u.includes('OPTIMIZED') || u.includes('KEYWORD')) return { bg:'#4f46e5', color:'#fff' };
      if (u.includes('PRIORITY'))  return { bg:'#7c3aed', color:'#fff' };
      return { bg:'#1e293b', color:'#fff' };
    };
    const isHeader = (line) => SECTION_KEYS.some(k => line.toUpperCase().includes(k));
    const isIssue  = (line) => line.trim().toLowerCase().startsWith('issue');
    const isFix    = (line) => line.trim().toLowerCase().startsWith('fix');

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
        {result.ai.split('\n').map((line, i) => {
          const t = line.trim();
          if (!t) return <div key={i} style={{ height:6 }} />;

          if (isHeader(t)) {
            const { bg, color } = sectionBg(t);
            return (
              <div key={i} style={{ background:bg, color, fontWeight:700, fontSize:13,
                padding:'8px 14px', borderRadius:7, marginTop:8, letterSpacing:'0.04em' }}>
                {t}
              </div>
            );
          }
          if (isIssue(t)) {
            return (
              <div key={i} style={{ background:'#fef2f2', borderLeft:'4px solid #dc2626',
                padding:'8px 12px', borderRadius:'0 7px 7px 0', fontSize:13,
                color:'#7f1d1d', lineHeight:1.6 }}>
                {t}
              </div>
            );
          }
          if (isFix(t)) {
            return (
              <div key={i} style={{ background:'#fffbeb', borderLeft:'4px solid #d97706',
                padding:'8px 12px', borderRadius:'0 7px 7px 0', fontSize:13,
                color:'#78350f', lineHeight:1.6 }}>
                {t}
              </div>
            );
          }
          return (
            <div key={i} style={{ fontSize:13, color:'var(--text2)', padding:'4px 12px', lineHeight:1.7 }}>
              {t}
            </div>
          );
        })}
      </div>
    );
  })() : (
    <div style={{ display:'flex', gap:10, padding:'1rem', background:'var(--yellow-bg)', borderRadius:10, border:'1px solid rgba(251,191,36,0.2)' }}>
      <span style={{ fontSize:18 }}>⚠</span>
      <div>
        <p style={{ fontSize:14, color:'var(--yellow)', fontWeight:500, marginBottom:3 }}>AI suggestions unavailable</p>
        <p style={{ fontSize:13, color:'var(--text3)' }}>Check that GROQ_API_KEY is set in your .env file.</p>
      </div>
    </div>
  )}
</Card>

          {/* Keywords */}
          {result.keywords?.rake_keywords?.length > 0 && (
            <Card title="Keyword Analysis">

              {/* RAKE Keywords Table */}
              <p style={{ fontSize:11, fontWeight:600, color:'var(--text3)', letterSpacing:'0.08em', marginBottom:10 }}>
                TOP KEYWORD PHRASES 
              </p>
              <div style={{ border:'1px solid var(--border)', borderRadius:10, overflow:'hidden', marginBottom:20 }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr style={{ background:'var(--accent)', color:'#fff' }}>
                      <th style={{ padding:'10px 14px', textAlign:'left', fontWeight:600, fontSize:12 }}>#</th>
                      <th style={{ padding:'10px 14px', textAlign:'left', fontWeight:600, fontSize:12 }}>Keyword Phrase</th>
                      <th style={{ padding:'10px 14px', textAlign:'right', fontWeight:600, fontSize:12 }}>Relevance Score</th>
                      <th style={{ padding:'10px 14px', textAlign:'center', fontWeight:600, fontSize:12 }}>Strength</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.keywords.rake_keywords.slice(0, 12).map((k, i) => {
                      const maxScore = result.keywords.rake_keywords[0]?.score || 1;
                      const pct      = Math.round((k.score / maxScore) * 100);
                      const color    = pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--yellow)' : 'var(--text3)';
                      return (
                        <tr key={i} style={{ background: i % 2 === 0 ? 'var(--surface2)' : 'var(--surface)', borderTop:'1px solid var(--border)' }}>
                          <td style={{ padding:'10px 14px', color:'var(--text3)', fontSize:12 }}>{i + 1}</td>
                          <td style={{ padding:'10px 14px', color:'var(--text)', fontWeight:500 }}>{k.phrase}</td>
                          <td style={{ padding:'10px 14px', textAlign:'right', color:'var(--accent)', fontWeight:600 }}>{k.score}</td>
                          <td style={{ padding:'10px 14px' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                              <div style={{ flex:1, background:'var(--border)', borderRadius:4, height:6 }}>
                                <div style={{ width: pct+'%', height:'100%', borderRadius:4, background:color, transition:'width 0.6s ease' }} />
                              </div>
                              <span style={{ fontSize:11, color, width:32, textAlign:'right' }}>{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Top Word Frequency Table */}
              {result.keywords.top_words?.length > 0 && (
                <>
                  <p style={{ fontSize:11, fontWeight:600, color:'var(--text3)', letterSpacing:'0.08em', marginBottom:10 }}>
                    TOP WORD FREQUENCY
                  </p>
                  <div style={{ border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                      <thead>
                        <tr style={{ background:'var(--surface2)' }}>
                          <th style={{ padding:'9px 14px', textAlign:'left', fontWeight:600, fontSize:12, color:'var(--text3)', borderBottom:'1px solid var(--border)' }}>Word</th>
                          <th style={{ padding:'9px 14px', textAlign:'right', fontWeight:600, fontSize:12, color:'var(--text3)', borderBottom:'1px solid var(--border)' }}>Count</th>
                          <th style={{ padding:'9px 14px', textAlign:'left', fontWeight:600, fontSize:12, color:'var(--text3)', borderBottom:'1px solid var(--border)' }}>Word</th>
                          <th style={{ padding:'9px 14px', textAlign:'right', fontWeight:600, fontSize:12, color:'var(--text3)', borderBottom:'1px solid var(--border)' }}>Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const words = result.keywords.top_words.slice(0, 16);
                          const half  = Math.ceil(words.length / 2);
                          const left  = words.slice(0, half);
                          const right = words.slice(half);
                          return left.map((w, i) => (
                            <tr key={i} style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>
                              <td style={{ padding:'9px 14px', color:'var(--text)', fontWeight:500 }}>{w.word}</td>
                              <td style={{ padding:'9px 14px', textAlign:'right', color:'var(--accent)', fontWeight:600 }}>×{w.count}</td>
                              <td style={{ padding:'9px 14px', color:'var(--text)', fontWeight:500 }}>{right[i]?.word || ''}</td>
                              <td style={{ padding:'9px 14px', textAlign:'right', color:'var(--accent)', fontWeight:600 }}>{right[i] ? `×${right[i].count}` : ''}</td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}