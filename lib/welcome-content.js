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
      '<p>Build your Opportunity Passport to discover scholarships, internships and fellowships matched to your background. Your saved applications stay linked to your account.</p>'+
      '<p><a href="https://oppmatcher.tech/" style="color:#5027b5">Open your Opportunity Passport</a></p>'+
      '<p style="font-size:12px;color:#687487">This is a one-time account confirmation, not a marketing subscription. You can manage optional email updates in your account.</p>'+
      '</div>'
  };
}
