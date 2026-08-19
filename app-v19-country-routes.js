(()=>{
  const ALL_COUNTRIES=['Afghanistan','Albania','Algeria','American Samoa','Andorra','Angola','Anguilla','Antigua and Barbuda','Argentina','Armenia','Aruba','Australia','Austria','Azerbaijan','Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium','Belize','Benin','Bermuda','Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','British Virgin Islands','Brunei','Bulgaria','Burkina Faso','Burundi','Cabo Verde','Cambodia','Cameroon','Canada','Cayman Islands','Central African Republic','Chad','Chile','China','Colombia','Comoros','Cook Islands','Costa Rica','Côte d’Ivoire','Croatia','Cuba','Curaçao','Cyprus','Czechia','Democratic Republic of the Congo','Denmark','Djibouti','Dominica','Dominican Republic','Ecuador','Egypt','El Salvador','Equatorial Guinea','Eritrea','Estonia','Eswatini','Ethiopia','Falkland Islands','Faroe Islands','Federated States of Micronesia','Fiji','Finland','France','French Guiana','French Polynesia','Gabon','The Gambia','Georgia','Germany','Ghana','Gibraltar','Greece','Greenland','Grenada','Guadeloupe','Guam','Guatemala','Guernsey','Guinea','Guinea-Bissau','Guyana','Haiti','Honduras','Hong Kong','Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland','Isle of Man','Israel','Italy','Jamaica','Japan','Jersey','Jordan','Kazakhstan','Kenya','Kiribati','Kosovo','Kuwait','Kyrgyzstan','Laos','Latvia','Lebanon','Lesotho','Liberia','Libya','Liechtenstein','Lithuania','Luxembourg','Macau','Madagascar','Malawi','Malaysia','Maldives','Mali','Malta','Martinique','Mauritania','Mauritius','Mayotte','Mexico','Moldova','Monaco','Mongolia','Montenegro','Montserrat','Morocco','Mozambique','Myanmar','Namibia','Nauru','Nepal','Netherlands','New Caledonia','New Zealand','Nicaragua','Niger','Nigeria','Niue','North Korea','North Macedonia','Northern Mariana Islands','Norway','Oman','Pakistan','Palau','Palestinian Territories','Panama','Papua New Guinea','Paraguay','Peru','Philippines','Poland','Portugal','Puerto Rico','Qatar','Republic of the Marshall Islands','Réunion','Romania','Russia','Rwanda','Saint Barthélemy','Saint Helena','Saint Kitts and Nevis','Saint Lucia','Saint Martin','Saint Vincent and the Grenadines','Samoa','San Marino','Sao Tome and Principe','Saudi Arabia','Senegal','Serbia','Seychelles','Sierra Leone','Singapore','Sint Maarten','Slovakia','Slovenia','Solomon Islands','Somalia','South Africa','South Korea','South Sudan','Spain','Sri Lanka','Sudan','Suriname','Sweden','Switzerland','Syria','Taiwan','Tajikistan','Tanzania','Thailand','Timor-Leste','Togo','Tonga','Trinidad and Tobago','Tunisia','Türkiye','Turkmenistan','Turks and Caicos Islands','Tuvalu','Uganda','Ukraine','United Arab Emirates','United Kingdom','United States','Uruguay','Uzbekistan','Vanuatu','Vatican City','Venezuela','Vietnam','Wallis and Futuna','Western Sahara','Yemen','Zambia','Zimbabwe','Other / multiple nationality'];
  try{COUNTRIES.splice(0,COUNTRIES.length,...ALL_COUNTRIES)}catch{}

  const clean=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim();
  const ALIAS={'turkey':'turkiye','republic of turkiye':'turkiye','czech republic':'czechia','republic of korea':'south korea','korea':'south korea','brunei darussalam':'brunei','lao pdr':'laos','burma':'myanmar','swaziland':'eswatini','cape verde':'cabo verde','gambia':'the gambia','gambia the':'the gambia','palestine':'palestinian territories','state of palestine':'palestinian territories','cote d ivoire':'cote divoire','ivory coast':'cote divoire','democratic republic of congo':'democratic republic of the congo','dr congo':'democratic republic of the congo','republic of congo':'republic of the congo','federated states of micronesia':'micronesia','micronesia federated states of':'micronesia','marshall islands':'republic of the marshall islands','republic of marshall islands':'republic of the marshall islands','taiwan':'chinese taipei','viet nam':'vietnam','timor leste':'timor-leste','united states of america':'united states','usa':'united states','uk':'united kingdom'};
  const canon=value=>{const c=clean(value);return ALIAS[c]||c};

  function refreshCountrySelects(){
    const p=currentProfile||{};
    const specs=[['obNat',p.nat||'','Select nationality'],['obResidence',p.residence||'','Select residence'],['obDegreeCountry',p.degreeCountry||'','Select degree country']];
    specs.forEach(([id,selected,placeholder])=>{const el=document.getElementById(id);if(!el)return;el.innerHTML=opts(COUNTRIES,selected,placeholder);el.value=selected});
  }
  const priorOpenOnboard=openOnboard;
  openOnboard=function(edit=false){priorOpenOnboard(edit);refreshCountrySelects()};
  window.openOnboard=openOnboard;
  refreshCountrySelects();

  function routeSet(o){return Array.isArray(o?.Country_Routes)?o.Country_Routes:[]}
  function routeDateScore(r){const d=r?.close_date?new Date(r.close_date+'T23:59:59Z').getTime():0;return Number.isFinite(d)?d:0}
  function chooseLatest(list){return [...list].sort((a,b)=>{
    const af=/open|expected|country-specific|varies|check/i.test(a.status||'')&&!/closed|not accepting/i.test(a.status||'');
    const bf=/open|expected|country-specific|varies|check/i.test(b.status||'')&&!/closed|not accepting/i.test(b.status||'');
    if(af!==bf)return bf-af;
    return routeDateScore(b)-routeDateScore(a)||String(b.cycle||'').localeCompare(String(a.cycle||''));
  })[0]||null}
  function routeInfo(o){
    const routes=routeSet(o),country=currentProfile?.nat||currentProfile?.residence||'';
    const exact=country?routes.filter(r=>canon(r.country)===canon(country)):[];
    const fallback=routes.filter(r=>r.country==='*');
    const primary=chooseLatest(exact)||chooseLatest(fallback);
    const directory=chooseLatest(fallback);
    return{primary,directory:primary&&directory&&primary!==directory?directory:null,country,exact:Boolean(exact.length)};
  }
  window.OpportunityCountryRoutes={routeInfo,canon};

  const parentDays=days;
  days=function(o){
    const r=routeInfo(o).primary;
    if(r?.close_date){const t=new Date(r.close_date+'T23:59:59').getTime();if(Number.isFinite(t))return Math.ceil((t-Date.now())/864e5)}
    return parentDays(o);
  };
  window.days=days;

  const parentDeadline=deadline;
  deadline=function(o){
    const r=routeInfo(o).primary;
    if(r){
      if(r.close_date){const d=days(o);if(d<0)return /not accepting/i.test(r.status||'')?'No intake this cycle':'Local cycle closed';if(d===0)return'Local deadline today';return`${d} days to local deadline`}
      if(r.deadline_text)return /varies|check|set by|published/i.test(r.deadline_text)?'Local deadline varies':r.deadline_text;
    }
    return parentDeadline(o);
  };
  window.deadline=deadline;

  if(!document.getElementById('countryRouteStyles')){
    const style=document.createElement('style');style.id='countryRouteStyles';style.textContent=`
      .countryRouteCard{margin:0 0 18px;padding:18px;border-radius:18px;background:linear-gradient(145deg,#11182f,#171d3b);color:#f7f5ef;box-shadow:0 16px 34px rgba(19,24,54,.16);border:1px solid rgba(255,255,255,.08)}
      .countryRouteTop{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.countryRouteEy{font-size:10px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;color:#c9ff58;margin-bottom:6px}.countryRouteCard h4{margin:0;font-size:18px;line-height:1.15}.routeStatus{white-space:nowrap;border:1px solid rgba(255,255,255,.13);background:rgba(255,255,255,.07);border-radius:999px;padding:6px 9px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.05em}.routeGrid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:15px 0}.routeFact{padding:10px 11px;border-radius:12px;background:rgba(255,255,255,.055)}.routeFact span{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.09em;opacity:.58;margin-bottom:4px}.routeFact b{display:block;font-size:12px;line-height:1.35}.routeNote{font-size:11px;line-height:1.55;color:rgba(247,245,239,.72);margin:0 0 13px}.routeActions{display:flex;gap:8px;flex-wrap:wrap}.routeActions a{display:inline-flex;align-items:center;text-decoration:none;border-radius:10px;padding:8px 10px;font-size:10px;font-weight:800}.routeApply{background:#c9ff58;color:#11182f}.routeSource{border:1px solid rgba(255,255,255,.14);color:#fff}.routeFallback{margin-top:11px;padding-top:11px;border-top:1px solid rgba(255,255,255,.09);font-size:10px;line-height:1.45;color:rgba(247,245,239,.6)}
      @media(max-width:700px){.routeGrid{grid-template-columns:1fr}.countryRouteTop{flex-direction:column}.routeStatus{align-self:flex-start}}
    `;document.head.appendChild(style);
  }

  function e(v){return esc(v||'')}
  function routeDeadlineText(r){if(r?.deadline_text)return r.deadline_text;if(r?.close_date)return r.close_date;return'Local deadline varies'}
  function routeMarkup(info){const r=info.primary;if(!r)return'';const label=r.country==='*'?(info.country?`${info.country} · provider directory`:'Provider country route'):`${r.country} · local route`;return `<section class="countryRouteCard"><div class="countryRouteTop"><div><div class="countryRouteEy">Your country route</div><h4>${e(label)}</h4></div><span class="routeStatus">${e(r.status||'Check current cycle')}</span></div><div class="routeGrid"><div class="routeFact"><span>Cycle</span><b>${e(r.cycle||'Current')}</b></div><div class="routeFact"><span>Local deadline</span><b>${e(routeDeadlineText(r))}</b></div><div class="routeFact"><span>Application channel</span><b>${e(r.application_channel||'Provider country route')}</b></div><div class="routeFact"><span>Route confidence</span><b>${e(r.confidence||'Verified source')}</b></div></div>${r.notes?`<p class="routeNote">${e(r.notes)}</p>`:''}<div class="routeActions">${r.application_url?`<a class="routeApply" target="_blank" rel="noopener" href="${e(r.application_url)}">Open route ↗</a>`:''}${r.official_source_url?`<a class="routeSource" target="_blank" rel="noopener" href="${e(r.official_source_url)}">Verify source ↗</a>`:''}</div>${info.directory?`<div class="routeFallback">Next-cycle or provider directory available separately. Local embassy/commission notices remain the source of truth when a new cycle opens.</div>`:''}</section>`}

  const parentOpenDetail=openDetail;
  openDetail=function(id){
    parentOpenDetail(id);
    const o=opps.find(x=>x.Opportunity_ID===id);if(!o)return;
    const info=routeInfo(o),r=info.primary;if(!r)return;
    const cols=document.querySelector('#detailInner .detailColumns');const right=cols?.children?.[1];
    if(right&&!right.querySelector('.countryRouteCard'))right.insertAdjacentHTML('afterbegin',routeMarkup(info));
    const hero=document.querySelector('#detailInner .detailDeadline');if(hero){hero.innerHTML=`<span>${e(r.status||o.Status||'Status varies')}</span><b>${e(routeDeadlineText(r))}</b>`}
    const parentApply=document.querySelector('#detailInner .applicationBtn');if(parentApply&&r.application_url){parentApply.href=r.application_url;parentApply.textContent=info.exact?'Open local route ↗':'Open country route ↗'}
  };
  window.openDetail=openDetail;

  try{renderAll()}catch{}
})();
