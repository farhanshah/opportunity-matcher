// Tiered verification shared by the discovery and worldwide-lead jobs.
// Pages that pass the original strict structured-data check keep the original
// publication path (strictPublish) unchanged; other programme pages are judged
// by lib/verification-v2.js and published through publishV2.
import { verifyOfficialPage } from './verification-v2.js';
import { publishV2, v2Evidence } from './publish-v2.js';

export async function verifyAndPublish(sql, source, page, strictPublish) {
  const v2 = verifyOfficialPage(page.html, page.url, source.provider);
  if (v2.v1Full?.verified)
    return { verified: v2.v1Full, publishable: true, published: await strictPublish(sql, source, page.url, v2.v1Full), reasons: '' };
  const asCandidate = { record: { title: v2.record?.title || '', type: v2.record?.type || null, deadline: v2.record?.deadline || null },
    evidence: v2Evidence(v2, page.url) };
  const reasons = [v2.decision, ...(v2.reasons || [])].join('; ');
  if (v2.publishable)
    return { verified: asCandidate, publishable: true, published: await publishV2(sql, source, page.url, v2), reasons };
  return { verified: asCandidate, publishable: false, reasons,
    published: { status: v2.decision === 'REJECTED' ? 'rejected' : 'needs_evidence', reason: reasons } };
}
