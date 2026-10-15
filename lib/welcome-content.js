function safe(value){
  return String(value||'').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
export function welcomeMessage(name){
  const first=String(name||'').trim().split(/\s+/)[0].slice(0,45);
  const greeting=first?'Hi '+first+',':'Hello,';
  return {
    subject:'Welcome to OppMatcher — your Opportunity Passport',
    html:'<div style="max-width:560px;margin:auto;font-family:Arial,sans-serif;color:#1c2636">'+
      '<h1 style="font-size:25px">Welcome to OppMatcher</h1>'+
      '<p>'+safe(greeting)+' your account has been created successfully.</p>'+
      '<p>You have taken the first step toward finding your next scholarship, internship or fellowship. Complete your Opportunity Passport and explore opportunities selected for your background.</p>'+
      '<p><a href="https://oppmatcher.tech/discover" style="display:inline-block;background:#5837c6;color:#fff;padding:12px 17px;border-radius:8px;text-decoration:none">Explore your opportunities</a></p>'+
      '<p style="font-size:12px;color:#687487">This is a one-time account confirmation, not a marketing subscription. You can manage optional email updates in your account.</p>'+
      '</div>'
  };
}
