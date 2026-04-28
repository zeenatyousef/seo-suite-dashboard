import React, { useState, useEffect } from 'react';
import AuditPage    from './pages/AuditPage';
import ProposalPage from './pages/ProposalPage';
import HistoryPage  from './pages/HistoryPage';

export default function App() {
  const [page,     setPage]     = useState('audit');
  const [isDark,   setIsDark]   = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [auditUrl, setAuditUrl] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('seo-theme');
    const dark  = saved ? saved === 'dark' : true;
    setIsDark(dark);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    const val = next ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', val);
    localStorage.setItem('seo-theme', val);
  }

  function navigate(p) { setPage(p); setMenuOpen(false); }

  const navItems = [
    { id:'audit',    label:'SEO Audit',    icon:<SearchIcon /> },
    { id:'proposal', label:'Proposals',    icon:<DocIcon /> },
  ];

  const SidebarContent = () => (
    <>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'2rem', padding:'0 4px' }}>
        <div style={{ width:34, height:34, background:'var(--accent)', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
        </div>
        <span style={{ fontSize:16, fontWeight:700, color:'var(--text)' }}>SEO Suite</span>
      </div>

      <p style={s.navLabel}>TOOLS</p>
      {navItems.map(n => (
        <NavBtn key={n.id} icon={n.icon} label={n.label} active={page===n.id} onClick={() => navigate(n.id)} />
      ))}

      <div style={{ flex:1 }} />

      <div style={{ borderTop:'1px solid var(--border)', paddingTop:14, marginTop:14 }}>
        <p style={s.navLabel}>APPEARANCE</p>
        <div
          onClick={toggleTheme}
          style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', borderRadius:10, background:'var(--surface2)', border:'1px solid var(--border)', cursor:'pointer', marginBottom:10 }}
        >
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:18, lineHeight:1 }}>{isDark ? '🌙' : '☀️'}</span>
            <span style={{ fontSize:14, color:'var(--text2)', fontWeight:500 }}>{isDark ? 'Dark mode' : 'Light mode'}</span>
          </div>
          <div style={{ width:44, height:24, borderRadius:12, background: isDark ? 'var(--accent)' : 'var(--border2)', position:'relative', transition:'background 0.25s', flexShrink:0 }}>
            <div style={{ width:18, height:18, borderRadius:'50%', background:'#fff', position:'absolute', top:3, left: isDark ? 23 : 3, transition:'left 0.25s', boxShadow:'0 1px 4px rgba(0,0,0,0.25)' }} />
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'var(--surface2)', borderRadius:8, border:'1px solid var(--border)', marginBottom:8 }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--green)', display:'inline-block', flexShrink:0 }} />
          <span style={{ fontSize:12, color:'var(--text3)' }}>Backend: port 5000</span>
        </div>
        <NavBtn icon={<HistoryIcon />} label="History" active={page==='history'} onClick={() => navigate('history')} />
      </div>
    </>
  );

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg)' }}>

      {menuOpen && (
        <div onClick={() => setMenuOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:98 }} />
      )}

      {/* Desktop sidebar */}
      <aside className="sidebar-desktop" style={{ width:240, minWidth:240, flexShrink:0, background:'var(--surface)', borderRight:'1px solid var(--border)', padding:'1.5rem 1rem', flexDirection:'column', height:'100vh', position:'sticky', top:0, transition:'background 0.3s', overflowY:'auto', zIndex:99 }}>
        <SidebarContent />
      </aside>

      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, overflow:'hidden' }}>

        {/* Mobile topbar */}
        <header className="topbar" style={{ alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:'var(--surface)', borderBottom:'1px solid var(--border)', position:'sticky', top:0, zIndex:50, transition:'background 0.3s' }}>
          <button onClick={() => setMenuOpen(o => !o)} style={s.iconBtn}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <span style={{ fontSize:15, fontWeight:600, color:'var(--text)' }}>
            {navItems.find(n => n.id === page)?.label || 'SEO Suite'}
          </span>
          <button onClick={toggleTheme} style={{ ...s.iconBtn, padding:'6px 12px', gap:6, fontSize:13, color:'var(--text2)', border:'1px solid var(--border)', borderRadius:8, background:'var(--surface2)' }}>
            <span style={{ fontSize:16 }}>{isDark ? '☀️' : '🌙'}</span>
            <span>{isDark ? 'Light' : 'Dark'}</span>
          </button>
        </header>

        {/* Mobile drawer */}
        {menuOpen && (
          <div style={{ position:'fixed', top:0, left:0, bottom:0, width:260, background:'var(--surface)', borderRight:'1px solid var(--border)', padding:'1.5rem 1rem', zIndex:99, display:'flex', flexDirection:'column', animation:'fadeUp 0.2s ease' }}>
            <SidebarContent />
          </div>
        )}

        <main className="page-content" style={{ flex:1, overflowY:'auto', padding:'2rem', background:'var(--bg)', transition:'background 0.3s' }}>
          <div style={{ maxWidth:960, margin:'0 auto' }}>
            {page === 'audit'    && <AuditPage triggerUrl={auditUrl} onAuditDone={() => setAuditUrl('')} />}
            {page === 'history'  && <HistoryPage onAudit={(url) => { setAuditUrl(url); navigate('audit'); }} />}
            {page === 'proposal' && <ProposalPage />}
          </div>
        </main>
      </div>
    </div>
  );
}

function NavBtn({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'10px 12px', borderRadius:8, border:'none', cursor:'pointer', fontSize:14, marginBottom:3, background: active ? 'var(--accent-dim)' : 'transparent', color: active ? 'var(--accent)' : 'var(--text3)', fontWeight: active ? 600 : 400, transition:'all 0.15s', fontFamily:'inherit', textAlign:'left' }}>
      <span style={{ display:'flex', alignItems:'center', opacity: active ? 1 : 0.7 }}>{icon}</span>
      {label}
    </button>
  );
}

function SearchIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>; }
function HistoryIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 8v4l3 3M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>; }
function DocIcon()     { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>; }

const s = {
  navLabel: { fontSize:10, fontWeight:700, color:'var(--text3)', letterSpacing:'0.12em', padding:'0 12px', marginBottom:8 },
  iconBtn:  { background:'none', border:'none', cursor:'pointer', color:'var(--text)', padding:4, display:'flex', alignItems:'center', gap:4, borderRadius:6, fontFamily:'inherit' },
};