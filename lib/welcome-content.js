function safe(value){
  return String(value||'').replace(/[&<>"']/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));
}
const logo='https://oppmatcher.tech/api/brand-image?kind=email';
export function welcomeMessage(name){
  const first=String(name||'').trim().split(/\s+/)[0].slice(0,45);
  const greeting=first?'Hi '+first+',':'Hello,';
  return {
    subject:'Welcome to OppMatcher — your Opportunity Passport',
    html:`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#f3f5f9;font-family:Arial,Helvetica,sans-serif;color:#182238">
<div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e7ee;border-radius:16px;overflow:hidden">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#10131c;color:#ffffff">
<tr><td style="padding:26px 30px">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:middle;padding-right:12px"><img src="${logo}" width="54" height="54" alt="OppMatcher logo" style="display:block;width:54px;height:54px;border:0;border-radius:12px"></td>
<td style="vertical-align:middle"><div style="font-size:24px;line-height:29px;font-weight:800;letter-spacing:-.5px;color:#ffffff">OppMatcher</div><div style="font-size:11px;line-height:18px;color:#d8ff69;letter-spacing:1.5px">OPPORTUNITY GLOBAL MATCHER</div></td>
</tr></table></td></tr></table>
<div style="padding:30px 30px 18px">
<p style="margin:0 0 12px;font-weight:bold;color:#4e42a9;font-size:12px;letter-spacing:1px">WELCOME ABOARD</p>
<h1 style="font-size:29px;line-height:1.2;margin:0 0 22px;color:#161d2a">Your next opportunity starts here.</h1>
<p style="font-size:16px;line-height:1.65;margin:0 0 14px;color:#253044">${safe(greeting)} your OppMatcher account is ready.</p>
<p style="font-size:15px;line-height:1.7;margin:0 0 24px;color:#475569">You've taken the first step toward finding scholarships, internships and fellowships that fit your background. Complete your Opportunity Passport to see tailored routes with official sources attached.</p>
<p style="margin:0 0 23px"><a href="https://oppmatcher.tech/discover" style="display:inline-block;background:#d8ff69;color:#121924;font-size:15px;font-weight:bold;padding:15px 20px;border-radius:9px;text-decoration:none">Explore your opportunities &rarr;</a></p>
<div style="border-top:1px solid #e8eaf0;padding-top:19px;font-size:13px;line-height:1.65;color:#697386">Opportunity matching is a guide, not a guarantee of eligibility or funding. Always check the official provider before applying.</div>
</div>
<div style="background:#f7f8fb;border-top:1px solid #e7e9ee;padding:18px 30px">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="padding-right:10px;vertical-align:middle"><img src="${logo}" alt="" width="30" height="30" style="display:block;border:0;width:30px;height:30px;border-radius:8px"></td>
<td style="vertical-align:middle"><b style="font-size:13px;color:#222a37">OppMatcher</b><div><a href="https://oppmatcher.tech/" style="color:#5c5ba2;font-size:12px;text-decoration:none">oppmatcher.tech</a></div></td>
</tr></table>
<p style="margin:13px 0 0;font-size:12px;line-height:1.6;color:#727b8a">This one-time account confirmation is a transactional email, not a marketing subscription. Optional opportunity alerts require your consent and can be managed in your account.</p>
</div>
</div></body></html>`
  };
}
