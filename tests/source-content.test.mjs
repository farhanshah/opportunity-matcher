import test from 'node:test';
import assert from 'node:assert/strict';
import {comparableSourceSignals} from '../lib/source-content.js';
import {meaningfulChange} from '../lib/monitor.js';
import {readFileSync} from 'node:fs';
function page(menu,body,tag='main'){
  return '<html><head><title>Scholarship programme</title></head><body>'+
    '<nav>Latest articles '+menu+' Apply Now. Nationality and tuition news.</nav>'+
    '<'+tag+'><h1>International scholarship</h1><p>'+body+'</p></'+tag+'>'+
    '<footer>Scholarship programme menu version '+menu+'</footer></body></html>';
}
const body='Applicants must hold a bachelor degree and meet the eligibility requirements. '+
 'Applications close 19 November 2026. Tuition and stipend funding are available. '.repeat(5);
test('reordering site navigation cannot create scholarship alert with stable main body',()=>{
 const before=page('News 12 October 2026.',''+body);
 const after=page('New menu 19 October 2026.',''+body);
 const evidence=comparableSourceSignals(after,before);
 assert.equal(evidence.extraction_mode,'paired-primary-content');
 assert.equal(meaningfulChange(evidence.previous,evidence.current),null);
});
test('genuine change to deadline or eligibility in main body stays high-priority',()=>{
 const before=page('Old menu',body);
 const after=page('New menu',body.replace('19 November 2026','20 November 2026')
   .replace('bachelor degree','master degree'));
 const evidence=comparableSourceSignals(after,before);
 const change=meaningfulChange(evidence.previous,evidence.current);
 assert.ok(change,'real evidence change must never be discarded');
 assert.ok(change.changed.includes('dates'));
 assert.ok(change.changed.includes('eligibility'));
 assert.equal(change.risk,'high');
});
test('single article can provide consistent evidence when main is absent',()=>{
 const before=page('Menu A',body,'article');
 const after=page('Menu B',body,'article');
 const evidence=comparableSourceSignals(after,before);
 assert.equal(evidence.extraction_mode,'paired-primary-content');
 assert.equal(meaningfulChange(evidence.previous,evidence.current),null);
});
test('missing body or mismatched structure retains full page comparison',()=>{
 const before=page('Menu A',body);
 const after='<html><body><nav>New header</nav><p>Applications close 20 November 2026. '+
  'Eligibility depends on bachelor degree and available stipend funding.</p></body></html>';
 const result=comparableSourceSignals(after,before);
 assert.equal(result.extraction_mode,'full-page-fallback');
 assert.ok(meaningfulChange(result.previous,result.current));
});
test('migration compares historical raw HTML, never a legacy main-vs-full-page mismatch',()=>{
 const before=page('Old',body);
 const after=page('New',body);
 const evidence=comparableSourceSignals(after,before,{eligibility:['legacy navigation sentence']});
 assert.equal(meaningfulChange(evidence.previous,evidence.current),null);
 const noRaw=comparableSourceSignals(after,null,{eligibility:['Old scholarship information.']});
 assert.equal(noRaw.extraction_mode,'full-page-fallback');
 assert.ok(noRaw.previous);
});
test('source watcher saves raw snapshots and continues to hold unverified changes',()=>{
 const source=readFileSync(new URL('../api/monitor.js',import.meta.url),'utf8');
 assert.ok(source.includes('raw_html, extraction_payload'));
 assert.ok(source.includes('comparableSourceSignals(fetched.html,previous?.raw_html,previous?.extraction_payload)'));
 assert.ok(source.includes('meaningfulChange(evidence.previous, signals)'));
 assert.ok(source.includes("'pending_review'"));
 assert.ok(source.includes('last_http_status NOT IN (403,429)'));
});
