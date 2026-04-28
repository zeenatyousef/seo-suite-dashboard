import React from 'react';

export function Spinner({ message }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'3rem', gap:14 }}>
      <div style={{ width:38, height:38, border:'3px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <p style={{ fontSize:14, color:'var(--text3)' }}>{message || 'Loading...'}</p>
    </div>
  );
}

export function ErrorMessage({ message }) {
  if (!message) return null;
  return (
    <div style={{ background:'var(--red-bg)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:10, padding:'12px 16px', color:'var(--red)', fontSize:14, marginTop:12, display:'flex', gap:8, alignItems:'flex-start' }}>
      <span style={{ flexShrink:0 }}>⚠</span> {message}
    </div>
  );
}

export function Badge({ text, color }) {
  const bgMap = { green:'var(--green-bg)', red:'var(--red-bg)', yellow:'var(--yellow-bg)', blue:'var(--accent-dim)', gray:'rgba(144,148,184,0.1)' };
  const tcMap = { green:'var(--green)', red:'var(--red)', yellow:'var(--yellow)', blue:'var(--accent)', gray:'var(--text3)' };
  return (
    <span style={{ background:bgMap[color]||bgMap.gray, color:tcMap[color]||tcMap.gray, borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:600, letterSpacing:'0.04em', whiteSpace:'nowrap', display:'inline-block' }}>
      {text}
    </span>
  );
}

export function Card({ title, children, style }) {
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:'1.5rem', marginBottom:'1rem', transition:'background 0.3s, border-color 0.3s', ...style }}>
      {title && <h3 style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'1.25rem' }}>{title}</h3>}
      {children}
    </div>
  );
}

export function StatCard({ label, value, color }) {
  const bgMap = { green:'var(--green-bg)', red:'var(--red-bg)', yellow:'var(--yellow-bg)' };
  const tcMap = { green:'var(--green)', red:'var(--red)', yellow:'var(--yellow)' };
  return (
    <div style={{ background:bgMap[color]||'var(--accent-dim)', border:'1px solid var(--border)', borderRadius:12, padding:'1.25rem', transition:'all 0.3s' }}>
      <p style={{ fontSize:11, color:'var(--text3)', marginBottom:8, letterSpacing:'0.06em', fontWeight:600, textTransform:'uppercase' }}>{label}</p>
      <p style={{ fontSize:26, fontWeight:700, color:tcMap[color]||'var(--accent)', lineHeight:1 }}>{value}</p>
    </div>
  );
}

export function ScoreCircle({ score }) {
  const color = score>=70?'var(--green)':score>=50?'var(--yellow)':'var(--red)';
  const label = score>=70?'Good':score>=50?'Needs Work':'Poor';
  return (
    <div style={{ textAlign:'center', flexShrink:0 }}>
      <div style={{ width:100, height:100, borderRadius:'50%', border:'5px solid var(--border)', borderTopColor:color, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', margin:'0 auto', transition:'border-color 0.3s' }}>
        <span style={{ fontSize:26, fontWeight:700, color, lineHeight:1 }}>{score}</span>
        <span style={{ fontSize:10, color:'var(--text3)', marginTop:2 }}>/ 100</span>
      </div>
      <p style={{ marginTop:8, fontSize:12, fontWeight:600, color }}>{label}</p>
    </div>
  );
}

export function ProgressBar({ label, value, max }) {
  const pct   = Math.min(100, Math.round((value/max)*100));
  const color = pct>=70?'var(--green)':pct>=40?'var(--yellow)':'var(--red)';
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
        <span style={{ fontSize:13, color:'var(--text2)' }}>{label}</span>
        <span style={{ fontSize:13, fontWeight:600, color }}>{pct}%</span>
      </div>
      <div style={{ background:'var(--surface2)', borderRadius:6, height:6, overflow:'hidden' }}>
        <div style={{ width:pct+'%', background:color, height:'100%', borderRadius:6, transition:'width 0.8s ease' }} />
      </div>
    </div>
  );
}

export function IssueRow({ severity, title, description }) {
  const cm = { high:'red', medium:'yellow', low:'green', info:'blue' };
  return (
    <div style={{ display:'flex', gap:12, padding:'13px 0', borderBottom:'1px solid var(--border)' }}>
      <div style={{ paddingTop:1, flexShrink:0 }}><Badge text={severity.toUpperCase()} color={cm[severity]||'gray'} /></div>
      <div>
        <p style={{ fontSize:14, fontWeight:500, color:'var(--text)', marginBottom:3 }}>{title}</p>
        {description && <p style={{ fontSize:13, color:'var(--text3)', lineHeight:1.6 }}>{description}</p>}
      </div>
    </div>
  );
}

export function FormField({ label, required, children }) {
  return (
    <div style={{ marginBottom:18 }}>
      <label style={{ display:'block', fontSize:13, fontWeight:500, color:'var(--text2)', marginBottom:7 }}>
        {label} {required && <span style={{ color:'var(--red)' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

// These use CSS variables so they adapt to light/dark automatically
export const inputStyle = {
  width:'100%', padding:'11px 14px',
  background:'var(--input-bg)',
  border:'1px solid var(--border)',
  borderRadius:10, fontSize:14,
  color:'var(--input-text)',
  boxSizing:'border-box',
  transition:'border-color 0.2s, background 0.3s',
};

export const textareaStyle = {
  ...inputStyle, minHeight:100, resize:'vertical', lineHeight:1.7,
};

export const selectStyle = {
  ...inputStyle, cursor:'pointer',
};
