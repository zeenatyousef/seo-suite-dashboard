import React, { useState } from 'react';
import { generateProposal } from '../api/seoApi';
import { Spinner, ErrorMessage, Card, FormField, inputStyle, textareaStyle, selectStyle } from '../components';

export default function ProposalPage() {
  const [form, setForm] = useState({
    requirement: '',
    budget:      '',
    platform:    'upwork',
    tone:        'formal',
    industry:    'general',
    name:        '',
    humanize:    true,
  });
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [proposal, setProposal] = useState('');
  const [copied,   setCopied]   = useState(false);
  const [copiedShort,    setCopiedShort]    = useState(false);
  const [copiedDetailed, setCopiedDetailed] = useState(false);

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleGenerate() {
    if (!form.requirement.trim()) { setError('Please enter the client requirement.'); return; }
    if (!form.name.trim())        { setError('Please enter your name.'); return; }
    setError(''); setProposal(''); setLoading(true);
    try {
      const data = await generateProposal(form);
      setProposal(data.proposal);
    } catch(e) {
      setError(e.message || 'Failed. Is the backend running on port 5000?');
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setForm({ requirement:'', budget:'', platform:'upwork', tone:'formal', industry:'general', name:'', humanize:true });
    setProposal(''); setError('');
  }

  function handleCopy() {
    navigator.clipboard.writeText(proposal).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div style={{ animation:'fadeUp 0.3s ease' }}>

      <div style={{ marginBottom:'2rem' }}>
        <h1 style={{ fontSize:26, fontWeight:700, color:'var(--text)', letterSpacing:'-0.02em', marginBottom:6 }}>Proposal Generator</h1>
        <p style={{ fontSize:15, color:'var(--text3)', lineHeight:1.6 }}>Generate a human-sounding proposal.</p>
      </div>

      <Card>
        {/* Requirement */}
        <FormField label="Client Requirement" required>
          <textarea
            style={textareaStyle}
            placeholder="Paste the client job description here. E.g: I need a React developer to build an admin dashboard..."
            value={form.requirement}
            onChange={e => update('requirement', e.target.value)}
          />
        </FormField>

        {/* Name + Budget */}
        <div style={s.twoCol}>
          <FormField label="Your Name" required>
            <input style={inputStyle} placeholder="Enter your name" value={form.name} onChange={e => update('name', e.target.value)} />
          </FormField>
          <FormField label="Budget">
            <input style={inputStyle} placeholder="e.g. $500 / $50/hr / Negotiable" value={form.budget} onChange={e => update('budget', e.target.value)} />
          </FormField>
        </div>

        {/* Platform + Tone + Industry */}
        <div style={s.threeCol}>
          <FormField label="Platform">
            <select style={selectStyle} value={form.platform} onChange={e => update('platform', e.target.value)}>
              <option value="upwork">Upwork</option>
              <option value="fiverr">Fiverr</option>
              <option value="freelancer">Freelancer.com</option>
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="linkedin">LinkedIn</option>
            </select>
          </FormField>

          <FormField label="Tone">
            <select style={selectStyle} value={form.tone} onChange={e => update('tone', e.target.value)}>
              <option value="formal">Formal</option>
              <option value="friendly">Friendly</option>
              <option value="confident">Confident</option>
              <option value="casual">Casual</option>
            </select>
          </FormField>

          <FormField label="Industry">
            <select style={selectStyle} value={form.industry} onChange={e => update('industry', e.target.value)}>
              <option value="general">General</option>
              <option value="tech">Tech / Software</option>
              <option value="design">Design / Creative</option>
              <option value="marketing">Marketing / Business</option>
              <option value="writing">Content / Writing</option>
              <option value="ecommerce">E-commerce</option>
              <option value="ai">AI / ML</option>
            </select>
          </FormField>
        </div>

        {/* Humanize toggle */}
        <div
          onClick={() => update('humanize', !form.humanize)}
          style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', borderRadius:10, border:'1px solid', borderColor: form.humanize ? 'rgba(74,222,128,0.35)' : 'var(--border)', background: form.humanize ? 'var(--green-bg)' : 'var(--surface2)', cursor:'pointer', marginBottom:18, transition:'all 0.2s' }}
        >
          <div>
            <p style={{ fontSize:14, fontWeight:600, color: form.humanize ? 'var(--green)' : 'var(--text2)', marginBottom:2 }}>
               Advanced Humanization (0% AI Detection)
            </p>
            <p style={{ fontSize:12, color:'var(--text3)', lineHeight:1.5 }}>
              Applies 2-pass rewriting — removes AI fingerprints.
            </p>
          </div>
          <div style={{ width:44, height:24, borderRadius:12, background: form.humanize ? 'var(--green)' : 'var(--border2)', position:'relative', transition:'background 0.25s', flexShrink:0, marginLeft:12 }}>
            <div style={{ width:18, height:18, borderRadius:'50%', background:'#fff', position:'absolute', top:3, left: form.humanize ? 23 : 3, transition:'left 0.25s', boxShadow:'0 1px 4px rgba(0,0,0,0.25)' }} />
          </div>
        </div>

        {/* Buttons */}
        <div style={s.btnRow}>
          <button style={loading ? s.btnOff : s.btn} onClick={handleGenerate} disabled={loading}>
            {loading
              ? (form.humanize ? 'Humanizing...' : 'Generating...')
              : 'Generate Proposal'
            }
          </button>
          <button style={s.btnSec} onClick={handleClear}>Clear</button>
        </div>

        <ErrorMessage message={error} />
      </Card>

      {loading && (
        <Spinner message={
          form.humanize
            ? 'Generating proposal then applying 2-pass humanization for 0% AI detection...'
            : 'Writing your proposal...'
        } />
      )}

      {proposal && (
        <Card>
         <div style={s.outHead}>
  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
    <h3 style={s.outTitle}>Generated Proposal</h3>
    {form.humanize && (
      <span style={{ fontSize:11, padding:'3px 10px', background:'var(--green-bg)', color:'var(--green)', borderRadius:20, fontWeight:600 }}>
         Humanized
      </span>
    )}
  </div>
  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
    {/* ✅ Regenerate button */}
    <button
      style={loading ? s.btnOff : s.btnRegen}
      onClick={handleGenerate}
      disabled={loading}
      title="Generate a new version with the same inputs"
    >
      {loading ? '⏳ Regenerating...' : '↻ Regenerate'}
    </button>
    <button style={copied ? s.btnCopied : s.btnCopy} onClick={handleCopy}>
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  </div>
</div>
         {(() => {
            const shortMatch    = proposal.match(/SHORT PROPOSAL:\s*([\s\S]*?)(?=DETAILED PROPOSAL:|={3,}|$)/i);
            const detailedMatch = proposal.match(/DETAILED PROPOSAL:\s*([\s\S]*?)(?=={3,}|$)/i);
            const shortText     = shortMatch    ? shortMatch[1].trim()    : '';
            const detailedText  = detailedMatch ? detailedMatch[1].trim() : '';

            if (shortText || detailedText) {
              return (
                <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

                  {shortText && (
                    <div>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontSize:11, fontWeight:700, color:'var(--accent)', textTransform:'uppercase', letterSpacing:'0.1em' }}>⚡ Short Proposal</span>
                          <span style={{ fontSize:11, color:'var(--text3)' }}>Quick version for fast responses</span>
                        </div>
                        <button
                          onClick={() => navigator.clipboard.writeText(shortText).then(() => {
                            setCopiedShort(true);
                            setTimeout(() => setCopiedShort(false), 2500);
                          })}
                          style={copiedShort ? s.btnCopied : s.btnCopy}>
                          {copiedShort ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                      <pre style={{ ...s.proposalBox, borderLeft:'3px solid var(--accent)' }}>{shortText}</pre>
                    </div>
                  )}

                  {detailedText && (
                    <div>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontSize:11, fontWeight:700, color:'var(--green)', textTransform:'uppercase', letterSpacing:'0.1em' }}>📄 Detailed Proposal</span>
                          <span style={{ fontSize:11, color:'var(--text3)' }}>Full version for serious bids</span>
                        </div>
                        <button
                          onClick={() => navigator.clipboard.writeText(detailedText).then(() => {
                            setCopiedDetailed(true);
                            setTimeout(() => setCopiedDetailed(false), 2500);
                          })}
                          style={copiedDetailed ? s.btnCopied : s.btnCopy}>
                          {copiedDetailed ? '✓ Copied' : 'Copy'}    
                        </button>
                      </div>
                      <pre style={{ ...s.proposalBox, borderLeft:'3px solid var(--green)' }}>{detailedText}</pre>
                    </div>
                  )}

                </div>
              );
            }

            return <pre style={s.proposalBox}>{proposal}</pre>;
          })()}
        </Card>
      )}
    </div>
  );
}

const s = {
  twoCol:     { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' },
  threeCol:   { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'1rem' },
  btnRow:     { display:'flex', gap:10, flexWrap:'wrap' },
  btn:        { padding:'11px 26px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'opacity 0.2s' },
  btnOff:     { padding:'11px 26px', background:'var(--border2)', color:'var(--text3)', border:'none', borderRadius:10, fontSize:14, fontWeight:600, cursor:'not-allowed', fontFamily:'inherit' },
  btnSec:     { padding:'11px 18px', background:'transparent', color:'var(--text3)', border:'1px solid var(--border)', borderRadius:10, fontSize:14, cursor:'pointer', fontFamily:'inherit' },
  outHead:    { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', flexWrap:'wrap', gap:8 },
  outTitle:   { fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em' },
  btnCopy:    { padding:'7px 16px', background:'transparent', border:'1px solid var(--border)', borderRadius:8, fontSize:13, cursor:'pointer', color:'var(--text2)', fontFamily:'inherit' },
  btnCopied:  { padding:'7px 16px', background:'var(--green-bg)', border:'1px solid rgba(74,222,128,0.25)', borderRadius:8, fontSize:13, cursor:'pointer', color:'var(--green)', fontFamily:'inherit' },
  proposalBox:{ whiteSpace:'pre-wrap', fontFamily:"'DM Mono',monospace", fontSize:13, lineHeight:2, color:'var(--text2)', background:'var(--surface2)', borderRadius:10, padding:'1.5rem', margin:0, border:'1px solid var(--border)', overflowX:'auto' },
  btnRegen:   { padding:'7px 16px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:8, fontSize:13, cursor:'pointer', fontFamily:'inherit', fontWeight:600 },
};