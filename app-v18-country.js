(()=>{
  const previousEvaluate=evaluate;
  const clean=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim();
  const ALIASES={
    'turkey':'turkiye','republic of turkiye':'turkiye','czech republic':'czechia','slovak republic':'slovakia',
    'korea':'south korea','republic of korea':'south korea','korea republic of':'south korea','korea south':'south korea',
    'democratic people s republic of korea':'north korea','korea north':'north korea','dpr korea':'north korea',
    'brunei darussalam':'brunei','lao pdr':'laos','lao people s democratic republic':'laos','burma':'myanmar',
    'swaziland':'eswatini','cabo verde':'cape verde','gambia':'the gambia','gambia the':'the gambia',
    'palestine':'palestinian territories','state of palestine':'palestinian territories','west bank':'palestinian territories',
    'cote d ivoire':'cote divoire','ivory coast':'cote divoire','cote divoire':'cote divoire',
    'democratic republic of congo':'democratic republic of the congo','dr congo':'democratic republic of the congo','congo democratic republic of the':'democratic republic of the congo','congo dem rep':'democratic republic of the congo',
    'republic of congo':'republic of the congo','congo republic of the':'republic of the congo','congo rep':'republic of the congo',
    'federated states of micronesia':'micronesia','micronesia federated states of':'micronesia',
    'marshall islands':'republic of the marshall islands','republic of marshall islands':'republic of the marshall islands',
    'taiwan':'chinese taipei','republic of china':'chinese taipei','hong kong sar':'hong kong','china hong kong sar':'hong kong',
    'macao':'macau','macao sar':'macau','china macau sar':'macau','viet nam':'vietnam','timor leste':'timor-leste',
    'north macedonia':'north macedonia','macedonia':'north macedonia','russian federation':'russia',
    'united states of america':'united states','usa':'united states','u s':'united states','uk':'united kingdom','u k':'united kingdom',
    'saint kitts and nevis':'st kitts and nevis','saint lucia':'st lucia','saint vincent and the grenadines':'st vincent and the grenadines',
    'sao tome and principe':'sao tome and principe','syrian arab republic':'syria','iran islamic republic of':'iran',
    'moldova republic of':'moldova','tanzania united republic of':'tanzania','bolivia plurinational state of':'bolivia',
    'venezuela bolivarian republic of':'venezuela'
  };
  const canon=value=>{const c=clean(value);return ALIASES[c]||c};
  const inList=(country,list=[])=>{const c=canon(country);return Boolean(c)&&list.some(x=>canon(x)===c)};
  const setOf=list=>new Set(list.map(canon));

  const SUB_SAHARAN=setOf(['Angola','Benin','Botswana','Burkina Faso','Burundi','Cameroon','Cape Verde','Central African Republic','Chad','Comoros','Democratic Republic of the Congo','Republic of the Congo','Cote dIvoire','Equatorial Guinea','Eritrea','Eswatini','Ethiopia','Gabon','The Gambia','Ghana','Guinea','Guinea-Bissau','Kenya','Lesotho','Liberia','Madagascar','Malawi','Mali','Mauritania','Mauritius','Mozambique','Namibia','Niger','Nigeria','Rwanda','Sao Tome and Principe','Senegal','Seychelles','Sierra Leone','Somalia','South Africa','South Sudan','Sudan','Tanzania','Togo','Uganda','Zambia','Zimbabwe']);
  const OECD=setOf(['Australia','Austria','Belgium','Canada','Chile','Colombia','Costa Rica','Czechia','Denmark','Estonia','Finland','France','Germany','Greece','Hungary','Iceland','Ireland','Israel','Italy','Japan','South Korea','Latvia','Lithuania','Luxembourg','Mexico','Netherlands','New Zealand','Norway','Poland','Portugal','Slovakia','Slovenia','Spain','Sweden','Switzerland','Türkiye','United Kingdom','United States']);
  const ESA=setOf(['Austria','Belgium','Czechia','Denmark','Estonia','Finland','France','Germany','Greece','Hungary','Ireland','Italy','Luxembourg','Netherlands','Norway','Poland','Portugal','Romania','Slovenia','Spain','Sweden','Switzerland','United Kingdom','Cyprus','Slovakia','Latvia','Lithuania','Canada','Bulgaria','Croatia','Malta']);

  const outcome=(rule,status,detail,hard=true)=>({label:'Country eligibility',status,detail,hard,source_url:rule.source_url||'',source_note:rule.source_note||'',rule_code:'country_scope'});
  function explicit(rule,p,v){
    const countries=Array.isArray(v.countries)?v.countries:[];
    const residenceBased=Boolean(v.residence_based);
    if(residenceBased){
      if(!p.residence)return outcome(rule,'review','Add country of residence to test this programme’s geographic rule.');
      if(!inList(p.residence,countries))return outcome(rule,'fail',`${p.residence} is outside the verified residence-country scope.`);
    }else{
      if(!p.nat)return outcome(rule,'review','Add nationality to test this programme’s country rule.');
      if(!inList(p.nat,countries))return outcome(rule,'fail',`${p.nat} is outside the verified eligible-country scope.`);
    }
    if(v.requires_residence||v.requires_citizenship_and_residence){
      if(!p.residence)return outcome(rule,'review','Your nationality is covered, but the programme also requires residence in an eligible country.');
      if(!inList(p.residence,countries))return outcome(rule,'fail',`${p.residence} does not satisfy the verified residence-country requirement.`);
    }
    if(v.requires_home_residence_and_work){
      if(!p.residence)return outcome(rule,'review','The country is covered, but the provider also requires living and working in your home country.');
      if(canon(p.residence)!==canon(p.nat))return outcome(rule,'fail','The provider requires you to live and work in your home country.');
      return outcome(rule,'review','Country and residence fit; current work location still needs confirmation.');
    }
    const caveats=[];
    if(v.country_profile_rules)caveats.push('country-profile rules also apply');
    if(v.country_and_course_specific)caveats.push('an eligible course is also required');
    if(v.individual_opportunities_may_limit_origin_countries)caveats.push('individual projects may narrow eligibility');
    if(v.fiji_postgraduate_only&&canon(p.nat)==='fiji')caveats.push('Fiji is postgraduate-only for this tertiary scheme');
    return outcome(rule,'pass',`Your ${residenceBased?'residence':'nationality'} is inside the verified country scope${caveats.length?`; ${caveats.join('; ')}`:''}.`);
  }
  function memberGroup(rule,p,v,allowExceptions=false){
    if(!p.nat)return outcome(rule,'review','Add nationality to test the membership-based country rule.');
    const group=clean(v.group||'');
    let set=null;
    if(group.includes('oecd member'))set=OECD;
    if(group.includes('esa eligible'))set=ESA;
    if(set){
      if(set.has(canon(p.nat)))return outcome(rule,'pass',`${p.nat} is in the verified ${v.group} scope.`);
      return allowExceptions?outcome(rule,'review',`${p.nat} is not an OECD member, but this programme can accept non-member nationals for specific projects.`):outcome(rule,'fail',`${p.nat} is outside the verified ${v.group} scope.`);
    }
    return outcome(rule,'review',`This opportunity uses the provider’s current ${v.group||'member-country'} list; membership still needs provider-backed resolution.`);
  }
  function countryScope(rule,p){
    const v=rule?.value&&typeof rule.value==='object'?rule.value:{};
    const scope=v.scope||'';
    if(rule.certainty&&rule.certainty!=='confirmed')return outcome(rule,'review','The provider country wording still needs confirmation.');
    if(scope==='worldwide')return outcome(rule,'pass','The verified programme is open worldwide.');
    if(scope==='worldwide_except'){
      if(!p.nat)return outcome(rule,'review','Add nationality to test the programme exclusion rule.');
      if(inList(p.nat,v.excluded||[]))return outcome(rule,'fail',`${p.nat} is excluded by the verified nationality rule.`);
      const caveat=v.dual_french_nationality_ineligible?' Based on the nationality stored in your Passport; dual French citizenship would need a separate check.':'';
      return outcome(rule,'pass','Your stored nationality does not hit a verified exclusion.'+caveat);
    }
    if(['explicit_list','explicit_list_country_specific_route','explicit_list_with_level_limits','explicit_list_with_opportunity_limits'].includes(scope))return explicit(rule,p,v);
    if(scope==='explicit_list_plus_nomination_exception'){
      if(!p.nat)return outcome(rule,'review','Add nationality to test the country rule.');
      if(inList(p.nat,v.countries||[]))return outcome(rule,'pass',`${p.nat} is in the programme’s standard country network.`);
      return outcome(rule,'review','Your country is outside the standard list, but the provider allows a formal nomination exception.');
    }
    if(scope==='regional_group'){
      if(!p.nat)return outcome(rule,'review','Add nationality to test the regional rule.');
      if(clean(v.group).includes('sub saharan africa')){
        if(!SUB_SAHARAN.has(canon(p.nat)))return outcome(rule,'fail',`${p.nat} is outside the programme’s Sub-Saharan Africa scope.`);
        if(v.requires_citizenship_and_residence){
          if(!p.residence)return outcome(rule,'review','Nationality fits the region; add residence to confirm the second country condition.');
          if(!SUB_SAHARAN.has(canon(p.residence)))return outcome(rule,'fail','The programme also requires residence in an eligible Sub-Saharan African country.');
        }
        return outcome(rule,'pass','Nationality and available residence signals fit the verified regional scope.');
      }
      return outcome(rule,'review','The programme uses a regional country group that still needs a maintained membership map.');
    }
    if(scope==='member_group')return memberGroup(rule,p,v,false);
    if(scope==='member_group_with_project_exceptions')return memberGroup(rule,p,v,true);
    if(scope==='residence_region'){
      if(!p.residence)return outcome(rule,'review','Add country of residence to test this regional fellowship.');
      if(canon(p.residence)===canon(v.region))return outcome(rule,'pass',`Your residence matches the verified ${v.region} regional route.`);
      return v.exceptions_possible_for_concrete_connection?outcome(rule,'review',`You do not currently reside in ${v.region}, but the provider allows limited connection-based exceptions.`):outcome(rule,'fail',`This route requires residence in ${v.region}.`);
    }
    if(scope==='vacancy_specific')return outcome(rule,'review','The base programme is international, but nationality/residence must be checked on the specific vacancy.');
    if(scope==='country_specific_route')return outcome(rule,'review','Eligibility is administered through a country-specific provider route; use the official country selector or local office before we call it confirmed.');
    if(scope==='cycle_specific_country_route')return outcome(rule,'review','Country quotas and application routes change by cycle; the next official cycle list must be checked.');
    if(scope==='cycle_specific_country_list')return outcome(rule,'review','The eligible-country list changes each cycle and the next current list is not yet published.');
    if(scope==='provider_explicit_list')return outcome(rule,'review','The provider publishes a large residence-country list; this record is linked to it but the full list still needs machine-normalisation.');
    if(scope==='provider_country_group')return outcome(rule,'review',`The provider maintains the authoritative ${v.group||'country group'} list; exact membership still needs machine-normalisation.`);
    if(scope==='program_specific_exception')return outcome(rule,'review','This programme is an exception to the provider’s standard country rule; verify the current cycle notice.');
    return outcome(rule,'review',rule.source_note||'Country eligibility requires provider-specific review.');
  }

  evaluate=function(o){
    const base=previousEvaluate(o);
    const rule=(Array.isArray(o.Eligibility_Rules)?o.Eligibility_Rules:[]).find(r=>r.code==='country_scope');
    if(!rule)return base;
    const country=countryScope(rule,currentProfile);
    const checks=(base.checks||[]).filter(c=>c.rule_code!=='country_scope'&&!(c.label==='Nationality'&&!c.rule_code));
    checks.unshift(country);
    const fails=checks.filter(c=>c.status==='fail'&&c.hard!==false).length;
    const reviews=checks.filter(c=>c.status==='review').length;
    const passes=checks.filter(c=>c.status==='pass').length;
    const hardReviews=checks.filter(c=>c.status==='review'&&c.hard!==false).length;
    let label='Needs review',cls='review',rank=1;
    if(fails){label='Not eligible';cls='ineligible';rank=0}
    else if(hardReviews){if(passes>=2){label='Possible match';cls='possible';rank=3}}
    else if(passes>=3){label=base.relevance>=1?'Strong match':'Likely eligible';cls='eligible';rank=4}
    else if(passes>=2){label='Possible match';cls='possible';rank=3}
    return{...base,checks,fails,reviews,passes,hardReviews,label,cls,rank,countryNormalized:true};
  };
  try{renderAll()}catch{}
})();