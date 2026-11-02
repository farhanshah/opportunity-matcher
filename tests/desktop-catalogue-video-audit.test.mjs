import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const boot=read('app-v08-boot.js');
const css=read('site-nav-contrast-v5.css');
const index=read('index.html');

function renderCard({stale,funding='Fully Funded'}){
 const start=boot.indexOf('function renderFeatured(){');
 const end=boot.indexOf('\nasync function loadData()',start);
 assert.ok(start>=0&&end>start);
 const source=boot.slice(start,end);
 const target={innerHTML:''};
 const opportunity={
  Status:'Open',Verification_Stale:stale,Opportunity_Name:'Research Scholarship',
  Provider:'Official University',Type:'Scholarship',Destination:'Canada',
  Funding:funding,Official_Source_URL:'https://university.example/scholarships',
  Close_Date:null
 };
 const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
 const context=new Function('opps','publicActive','days','featuredNominationGate','esc','logoLetter',
 'featuredReason','featuredDeadline','$',source+';return renderFeatured');
 context([opportunity],()=>true,()=>90,()=>null,esc,()=> 'RU',
 ()=> 'A named scholarship condition requires confirmation.',()=> 'Deadline unverified',
 id=>{assert.equal(id,'featuredGrid');return target})().call(null);
 return target.innerHTML;
}
test('stale featured programmes have one caution, no unverified historical funding promise',()=>{
 const card=renderCard({stale:true});
 assert.match(card,/Needs source recheck/);
 assert.match(card,/Funding unverified/);
 assert.doesNotMatch(card,/Fully Funded/);
 assert.doesNotMatch(card,/Worth knowing/);
 assert.doesNotMatch(card,/omHistoricalNotice/);
 assert.doesNotMatch(card,/Historical programme information/);
 assert.match(card,/Open official source/);
 assert.match(card,/liveCardHistorical/);
});
test('current verified programme can still show supported specific eligibility details',()=>{
 const card=renderCard({stale:false});
 assert.match(card,/Fully Funded/);
 assert.match(card,/Worth knowing/);
 assert.doesNotMatch(card,/Funding unverified/);
 assert.doesNotMatch(card,/liveCardHistorical/);
});
test('catalogue notices and navigation are no longer repeated or washed out in dark theme',()=>{
 const fresh=read('app-v155-freshness-truth-v286.js');
 assert.match(index,/<nav class="omCatalogueLinks"/);
 assert.doesNotMatch(index,/class="omCatalogueDisclosure"/);
 assert.doesNotMatch(index,/public-ux-v1\.js/);
 assert.match(fresh,/What does source monitoring check\?/);
 assert.match(fresh,/These are research leads/);
 assert.match(css,/v12: resolve public-source warning repetition/);
 assert.match(css,/#live-opportunities \.omCatalogueLinks a\{/);
 assert.match(css,/\.footer \.footerLinks a\{/);
 assert.match(index,/site-nav-contrast-v5\.css\?v=12/);
 assert.match(boot,/of \${opps.length} catalogue records freshly verified/);
});
