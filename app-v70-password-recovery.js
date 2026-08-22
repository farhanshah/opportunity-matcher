(()=>{
  const client=window.OpportunityCloudClient;
  if(!client?.auth)return;
  const html=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const modal=()=>document.getElementById('cloudAuthModal');
  const card=()=>document.getElementById('cloudAuthCard');
  const show=()=>modal()?.classList.remove('hide');
  const feedback=(text,error=false)=>{const el=document.getElementById('cloudAuthFeedback');if(el)el.innerHTML=`<div class="${error?'cloudError':'cloudMessage'}">${html(text)}</div>`};

  function decorateSignIn(){
    const c=card();
    if(!c||!c.querySelector('#cloudPassword')||c.querySelector('[data-forgot-password]'))return;
    const submit=c.querySelector('#cloudSubmit');
    if(!submit)return;
    const b=document.createElement('button');
    b.type='button';b.dataset.forgotPassword='1';b.className='cloudForgot';b.textContent='Forgot password?';
    b.style.cssText='border:0;background:transparent;color:#7667ff;font:inherit;font-size:11px;font-weight:800;cursor:pointer;padding:8px 0 2px;text-align:left';
    b.onclick=renderForgot;
    submit.insertAdjacentElement('afterend',b);
  }

  function renderForgot(){
    const c=card();if(!c)return;
    c.innerHTML=`<button class="cloudClose" data-recover-close>×</button><div class="cloudEy">Password recovery</div><h2>Reset your password.</h2><p class="cloudLead">Enter the email used for your OppMatcher account. We’ll send a secure reset link.</p><div class="cloudField"><label>Email</label><input id="recoverEmail" type="email" autocomplete="email" placeholder="you@example.com"></div><button id="recoverSend" class="cloudSubmit">Send reset link</button><button id="recoverBack" class="cloudGoogle" style="margin-top:10px">Back to sign in</button><div id="cloudAuthFeedback"></div>`;
    c.querySelector('[data-recover-close]').onclick=()=>modal()?.classList.add('hide');
    c.querySelector('#recoverBack').onclick=()=>window.OpportunityCloud?.setMode?.('signin');
    c.querySelector('#recoverSend').onclick=sendReset;
    show();
  }

  async function sendReset(){
    const email=document.getElementById('recoverEmail')?.value.trim();
    if(!email){feedback('Enter your email address.',true);return}
    const btn=document.getElementById('recoverSend');if(btn){btn.disabled=true;btn.textContent='Sending…'}
    try{
      const result=await client.auth.forgetPassword({email,redirectTo:`${location.origin}/?reset=1`});
      if(result?.error)throw new Error(result.error.message||String(result.error));
      feedback('If an account exists for that email, a password reset link has been sent. Check your inbox and spam folder.');
      if(btn)btn.textContent='Reset link sent';
    }catch(e){feedback(e.message||'Could not send the reset email. Please try again.',true);if(btn){btn.disabled=false;btn.textContent='Send reset link'}}
  }

  function resetParams(){const p=new URLSearchParams(location.search);return{token:p.get('token'),error:p.get('error'),reset:p.get('reset')}}
  function maybeOpenReset(){
    const {token,error,reset}=resetParams();
    if(!token&&!error&&reset!=='1')return;
    const c=card();if(!c)return;
    if(error){
      c.innerHTML=`<button class="cloudClose" data-recover-close>×</button><div class="cloudEy">Password recovery</div><h2>That reset link can’t be used.</h2><p class="cloudLead">It may have expired or already been used. Request a new password reset email.</p><button id="recoverAgain" class="cloudSubmit">Request a new link</button>`;
      c.querySelector('[data-recover-close]').onclick=cleanAndClose;c.querySelector('#recoverAgain').onclick=renderForgot;show();return;
    }
    if(!token)return;
    c.innerHTML=`<button class="cloudClose" data-recover-close>×</button><div class="cloudEy">Password recovery</div><h2>Choose a new password.</h2><p class="cloudLead">Use at least 8 characters. After saving it, you can sign in normally.</p><div class="cloudField"><label>New password</label><input id="recoverPassword" type="password" autocomplete="new-password" placeholder="At least 8 characters"></div><div class="cloudField"><label>Confirm password</label><input id="recoverConfirm" type="password" autocomplete="new-password" placeholder="Repeat password"></div><button id="recoverSave" class="cloudSubmit">Save new password</button><div id="cloudAuthFeedback"></div>`;
    c.querySelector('[data-recover-close]').onclick=cleanAndClose;c.querySelector('#recoverSave').onclick=()=>savePassword(token);show();
  }

  async function savePassword(token){
    const password=document.getElementById('recoverPassword')?.value||'';const confirm=document.getElementById('recoverConfirm')?.value||'';
    if(password.length<8){feedback('Use a password with at least 8 characters.',true);return}
    if(password!==confirm){feedback('The passwords do not match.',true);return}
    const btn=document.getElementById('recoverSave');if(btn){btn.disabled=true;btn.textContent='Saving…'}
    try{
      const result=await client.auth.resetPassword({newPassword:password,token});
      if(result?.error)throw new Error(result.error.message||String(result.error));
      history.replaceState({},'',location.pathname);
      feedback('Password updated. You can sign in with your new password.');
      if(btn){btn.disabled=false;btn.textContent='Password updated'}
      setTimeout(()=>window.OpportunityCloud?.setMode?.('signin'),1200);
    }catch(e){feedback(e.message||'Could not reset the password. Request a new reset link and try again.',true);if(btn){btn.disabled=false;btn.textContent='Save new password'}}
  }
  function cleanAndClose(){history.replaceState({},'',location.pathname);modal()?.classList.add('hide')}

  const obs=new MutationObserver(()=>{decorateSignIn();maybeOpenReset()});
  obs.observe(document.body,{subtree:true,childList:true});
  setTimeout(()=>{decorateSignIn();maybeOpenReset()},300);
  window.OpportunityPasswordRecovery={forgot:renderForgot,openReset:maybeOpenReset};
})();