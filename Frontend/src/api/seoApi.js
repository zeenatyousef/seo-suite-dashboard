const BASE = process.env.REACT_APP_API_URL || '';

export async function runAudit(url) {
  const res  = await fetch(BASE + '/api/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Audit failed');
  return data;
}

export async function downloadAuditPdf(auditData) {
  const res = await fetch(BASE + '/api/audit/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(auditData),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'PDF generation failed');
  }
  const blob    = await res.blob();
  const url     = window.URL.createObjectURL(blob);
  const link    = document.createElement('a');
  link.href     = url;
  link.download = 'seo_audit_report.pdf';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function generateProposal(formData) {
  const res  = await fetch(BASE + '/api/proposal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Proposal generation failed');
  return data;
}