import React, { useState } from 'react';
import { Card } from '../components';

const HISTORY_KEY = 'seo-audit-history';

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}

export default function HistoryPage({ onAudit }) {
  const [history,   setHistory]   = useState(loadHistory);
  const [copiedUrl, setCopiedUrl] = useState('');  // tracks which URL was just copied

  function clearAll() {
    localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  }

  function removeOne(url) {
    const next = history.filter(u => u !== url);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    setHistory(next);
  }

  function copyUrl(url) {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(''), 2000);
    });
  }

  return (
    <div style={{ animation:'fadeUp 0.3s ease' }}>
      <div style={{ marginBottom:'2rem' }}>
        <h1 style={{ fontSize:26, fontWeight:700, color:'var(--text)', letterSpacing:'-0.02em', marginBottom:6 }}>Search Log</h1>
        <p style={{ fontSize:15, color:'var(--text3)', lineHeight:1.6 }}>All previously audited URLs are saved here. Click any URL to audit it again.</p>
      </div>

      {history.length === 0 ? (
        <Card>
          <div style={{ textAlign:'center', padding:'3rem 1rem' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ margin:'0 auto 1rem', display:'block', color:'var(--text3)' }}>
              <path d="M12 8v4l3 3M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <p style={{ fontSize:16, fontWeight:500, color:'var(--text2)', marginBottom:6 }}>No search history yet</p>
            <p style={{ fontSize:14, color:'var(--text3)' }}>Run an SEO audit and it will appear here.</p>
          </div>
        </Card>
      ) : (
        <>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
            <span style={{ fontSize:14, color:'var(--text3)' }}>{history.length} URL{history.length !== 1 ? 's' : ''} in history</span>
            <button
              onClick={clearAll}
              style={{ padding:'7px 14px', background:'var(--red-bg)', color:'var(--red)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:8, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}
            >
              Clear all
            </button>
          </div>

          <Card>
            {history.map((url, i) => {
              const isCopied = copiedUrl === url;
              return (
                <div
                  key={i}
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom: i < history.length-1 ? '1px solid var(--border)' : 'none' }}
                >
                  {/* Index */}
                  <span style={{ fontSize:12, color:'var(--text3)', width:22, textAlign:'center', flexShrink:0 }}>{i+1}</span>

                  {/* Clock icon */}
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0, color:'var(--text3)' }}>
                    <path d="M12 8v4l3 3M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>

                  {/* URL */}
                  <span style={{ flex:1, fontSize:14, color:'var(--text2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{url}</span>

                  {/* Actions */}
                  <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                    {/* Copy button — changes to Copied! */}
                    <button
                      onClick={() => copyUrl(url)}
                      title="Copy URL"
                      style={{
                        padding:'5px 10px',
                        background: isCopied ? 'var(--green-bg)' : 'var(--surface2)',
                        border: isCopied ? '1px solid rgba(74,222,128,0.3)' : '1px solid var(--border)',
                        borderRadius:7, fontSize:12, cursor:'pointer',
                        color: isCopied ? 'var(--green)' : 'var(--text2)',
                        fontFamily:'inherit', fontWeight: isCopied ? 600 : 400,
                        transition:'all 0.2s', minWidth:58, textAlign:'center',
                      }}
                    >
                      {isCopied ? '✓ Copied' : 'Copy'}
                    </button>

                    {/* Audit again */}
                    <button
                      onClick={() => { window.location.href='#'; onAudit(url); }}
                      title="Audit again"
                      style={{ padding:'5px 10px', background:'var(--accent-dim)', border:'1px solid rgba(108,99,255,0.25)', borderRadius:7, fontSize:12, cursor:'pointer', color:'var(--accent)', fontFamily:'inherit', fontWeight:500 }}
                    >
                      Audit again
                    </button>

                    {/* Remove */}
                    <button
                      onClick={() => removeOne(url)}
                      title="Remove"
                      style={{ padding:'5px 8px', background:'transparent', border:'1px solid var(--border)', borderRadius:7, fontSize:13, cursor:'pointer', color:'var(--text3)', fontFamily:'inherit' }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </Card>
        </>
      )}
    </div>
  );
}