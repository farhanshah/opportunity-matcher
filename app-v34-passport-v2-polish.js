(()=>{
  const previousSummary=renderPassportSummary;
  renderPassportSummary=function(){
    document.querySelectorAll('.passportPrecisionCard').forEach(el=>el.remove());
    previousSummary();
  };
  window.renderPassportSummary=renderPassportSummary;

  const previousOpen=openOnboard;
  openOnboard=function(edit=false){
    previousOpen(edit);
    const grad=document.getElementById('obGradDate');
    const label=grad?.closest('.field')?.querySelector('label');
    if(label)label.textContent='Graduation / expected graduation date';
  };
  window.openOnboard=openOnboard;

  const graduationYear=p=>{
    if(p?.graduationDate){const y=Number(String(p.graduationDate).slice(0,4));if(Number.isFinite(y)&&y>1900)return y}
    const y=Number(p?.graduationYear||0);return Number.isFinite(y)&&y>1900?y:null;
  };
  async function persistV2Once(){
    const client=window.OpportunityCloudClient,state=window.OpportunityState;if(!client||!state)return false;
    try{
      const sessionResult=await client.auth.getSession();const data=sessionResult?.data??sessionResult;const user=data?.user;if(!user)return false;
      const p=state.getProfile();
      const r=await client.from('user_passports').update({degree_status:p.degreeStatus||null,degree_name:p.degreeName||null,graduation_year:graduationYear(p)}).eq('auth_user_id',user.id);
      if(r?.error)throw r.error;return true;
    }catch(e){console.warn('Passport v2 initial cloud persistence skipped',e);return false}
  }
  let attempts=0;const timer=setInterval(async()=>{attempts++;if(await persistV2Once()||attempts>20)clearInterval(timer)},500);
  try{renderPassportSummary()}catch{}
})();
