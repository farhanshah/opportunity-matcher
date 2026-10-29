import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const adSrc='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1916126969266611';
const adTag='<script async src="'+adSrc+'"\n     crossorigin="anonymous"></script>';
const publicHtml=[
 'index.html','privacy.html','blog/index.html',
 'blog/fully-funded-scholarships-international-students/index.html',
 'blog/international-internships-graduate-placements/index.html',
 'blog/methodology/index.html',
 'blog/scholarship-application-documents/index.html',
 'blog/scholarship-eligibility-checklist/index.html'
];
const privateHtml=['admin.html','prepare.html'];
const ids=s=>[...s.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]).sort();
const actions=s=>[...s.matchAll(/\bonclick="([^"]+)"/g)].map(x=>x[1]).sort();
test('AdSense exact publisher snippet is once inside head of every public page',()=>{
 for(const page of publicHtml){
  const s=get(page),head=s.split('</head>')[0];
  assert.ok(head.includes(adTag),page+' missing exact snippet');
  assert.equal(s.split('ca-pub-1916126969266611').length-1,1,page+' duplicate code');
  assert.ok(head.includes('<meta charset'),page+' invalid head');
 }
});
test('Sensitive private admin and application-preparation views have no ad network scripts',()=>{
 for(const path of privateHtml){
  const html=get(path);
  assert.ok(!html.includes('pagead2.googlesyndication.com'),path+' private page leaked ads');
  assert.match(html,/secondary-turquoise-v5\.css\?v=5/);
  assert.match(html,/class="omSecondary"/);
 }
});
test('Production navbar uses accessible Explore dropdown without changing SPA controls',()=>{
 const html=get('index.html'),old=get('nav-contrast-preview-v5.html');
 assert.deepEqual(ids(html).filter(id=>!['heroOpenCallsLabel','verified-openings','verifiedOpenTitle','verifiedOpenGrid'].includes(id)),ids(old));
 assert.ok(ids(html).includes('verifiedOpenGrid'));
 assert.ok(html.includes('home-openings-v1.js'));
 assert.ok(html.includes('home-openings-v1.css'));
 assert.ok(ids(html).includes('heroOpenCallsLabel'));
 // Guest-only sample CTA is intentionally replaced by a public, non-saving link.
 assert.deepEqual(actions(html),actions(old).filter(a=>a!=='sample()'));
 assert.ok((html.match(/href="\/latest"/g)||[]).length>=2);
 assert.ok(html.includes('Free account required to save your Passport'));
 assert.match(html,/site-nav-contrast-v5\.css\?v=\d+/);
 assert.match(html,/integration-shell-v5\.js/);
 assert.match(html,/src="\/app-v07\.js" defer/);
 assert.match(html,/rel="canonical" href="https:\/\/oppmatcher.tech\/"/);
 assert.doesNotMatch(html,/name="robots" content="noindex/);
 const shell=get('integration-shell-v5.js');
 assert.match(shell,/aria-expanded/);
 assert.match(shell,/Explore ▾/);
 assert.match(shell,/Escape/);
 assert.doesNotMatch(shell,/\bfetch\(|\bhistory\[method\]|\bOpportunityCloud\.save/);
 const css=get('site-nav-contrast-v5.css');
 assert.match(css,/\.heroActions \.btnGhost/);
 assert.match(css,/omLandingMenuOpen/);
 assert.match(css,/rgb|#effffb/i);
});
test('Public blog, articles, privacy preserve indexing and share the Explore navbar',()=>{
 for(const path of publicHtml.filter(x=>x.startsWith('blog/'))){
  const s=get(path);
  assert.match(s,/blog-turquoise-v4\.css/);
  assert.match(s,/site-aux-nav-v5\.css/);
  assert.match(s,/site-aux-nav-v5\.js/);
  assert.match(s,/robots" content="index,follow"/);
  assert.match(s,/rel="canonical" href="https:\/\/oppmatcher.tech\/blog\//);
 }
 const privacy=get('privacy.html');
 assert.match(privacy,/rel="canonical" href="https:\/\/oppmatcher.tech\/privacy"/);
 assert.match(privacy,/Google AdSense/);
 assert.match(privacy,/consent/);
 assert.match(privacy,/secondary-turquoise-v5\.css/);
 assert.match(privacy,/site-aux-nav-v5\.css/);
 assert.match(privacy,/site-aux-nav-v5\.js/);
});
test('Theme is present on blog, admin, operations, application studio and privacy',()=>{
 const blog=get('blog/index.html');
 assert.match(blog,/site-aux-nav-v5\.css/);
 const secondary=get('secondary-turquoise-v5.css');
 for(const p of ['admin','prepare','privacy'])assert.ok(secondary.includes('data-page="'+p+'"'));
 assert.ok(get('admin.html').includes('data-page="admin"'));
 assert.ok(get('prepare.html').includes('data-page="prepare"'));
 assert.ok(get('privacy.html').includes('data-page="privacy"'));
 assert.match(get('site-aux-nav-v5.js'),/Escape/);
});
test('Production rewrites and automation schedules remain unchanged',()=>{
 const cfg=JSON.parse(get('vercel.json'));
 for(const [source,destination] of [['/privacy','/privacy.html'],['/admin','/admin.html'],['/prepare','/prepare.html'],
 ['/discover','/index.html'],['/tracker','/index.html'],['/saved','/index.html'],['/dashboard','/index.html']])
  assert.ok(cfg.rewrites.some(x=>x.source===source&&x.destination===destination),source);
 for(const path of ['/api/discover','/api/worldwide-discover','/api/verify-worldwide','/api/daily-discovery-email'])
  assert.ok(cfg.crons.some(x=>x.path===path),path);
});
