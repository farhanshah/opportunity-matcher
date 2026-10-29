(()=>{'use strict';
 const root=document.getElementById('verifiedOpenGrid');
 if(!root)return;
 const el=(tag,className,text)=>{const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n};
 async function load(){
  try{
   const res=await fetch('/api/home-openings',{cache:'no-store',headers:{Accept:'application/json'}});
   if(!res.ok)throw Error('Not available');
   const data=await res.json();
   if(data?.ok!==true||!Array.isArray(data.listings))throw Error('Invalid response');
   root.replaceChildren();
   if(!data.listings.length){
    const empty=el('div','verifiedEmpty','No individual vacancies currently meet the recent official-verification checks. Browse official programme pages while new postings are checked.');
    const link=el('a','','Browse official programme pages ↗');link.href='/latest';empty.append(link);root.append(empty);return;
   }
   for(const item of data.listings){
    if(!/^\/opportunities\/[a-z0-9]+(?:-[a-z0-9]+)*-[0-9]{3,15}$/.test(item.detail_url))continue;
    const card=el('article','verifiedOpenCard');
    card.append(el('span','verifiedOpenTag','Official posting checked'));
    const title=el('h3'),a=el('a','',item.title);a.href=item.detail_url;title.append(a);card.append(title);
    card.append(el('p','verifiedProvider',item.provider+' · '+item.location));
    card.append(el('p','verifiedDeadline','Advertised deadline: '+item.deadline));
    if(item.restriction)card.append(el('p','verifiedRestriction','Restriction: '+item.restriction));
    card.append(el('p','verifiedCaution','Confirm nationality, studies and work eligibility at the provider.'));
    const cta=el('a','verifiedOpenLink','View official vacancy details ↗');cta.href=item.detail_url;card.append(cta);
    root.append(card);
   }
  }catch{
   root.replaceChildren();
   const message=el('p','verifiedEmpty','Live posting status is temporarily unavailable. Visit the verified vacancies directory.');
   const a=el('a','','Open verified directory ↗');a.href='/opportunities';message.append(a);root.append(message);
  }
 }
 load();
})();
