(function(){
  var $=function(id){return document.getElementById(id);};
  function apiUrl(){return window.BACKEND_URL||'';}
  var LS={get:function(k){try{return JSON.parse(localStorage.getItem(k));}catch(e){return null;}},set:function(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}};

  /* Backend warm-up: Apps Script cold starts are the slow part, so ping a cheap endpoint on load. */
  var lastWarm=0;
  function warm(force){ if(!apiUrl()) return; var n=Date.now(); if(!force && n-lastWarm<240000) return; lastWarm=n;
    try{ fetch(apiUrl()+'?action=alive',{cache:'no-store'}).catch(function(){}); }catch(e){} }
  warm(true);
  document.addEventListener('pointerdown',function(){ warm(); },{passive:true});
  setInterval(function(){ if(!document.hidden) warm(); },240000);
  function fetchJson(url,retries){ retries=(retries==null?1:retries);
    return new Promise(function(res,rej){
      var ctl=('AbortController' in window)?new AbortController():null;
      var to=setTimeout(function(){ if(ctl) ctl.abort(); },20000);
      fetch(url,ctl?{signal:ctl.signal}:{}).then(function(r){ clearTimeout(to); return r.json(); }).then(res,function(e){ clearTimeout(to);
        if(retries>0) fetchJson(url,retries-1).then(res,rej); else rej(e); });
    });
  }
  function toast(m){ var t=$('toast'); t.textContent=m; t.classList.add('show'); clearTimeout(t._h); t._h=setTimeout(function(){t.classList.remove('show');},2200); }
  function esc(s){ var d=document.createElement('div'); d.textContent=s==null?'':String(s); return d.innerHTML; }
  ['lcf_invite','lcf_ticket'].forEach(function(oldK){ var nk=oldK.replace('lcf_','adya_'); try{ if(localStorage.getItem(nk)===null && localStorage.getItem(oldK)!==null){ localStorage.setItem(nk,localStorage.getItem(oldK)); localStorage.removeItem(oldK); } }catch(e){} });

  /* ---------- gate / invite ---------- */
  var params=new URLSearchParams(location.search), invite=null;
  var saved=LS.get('adya_invite'); var urlRef=(params.get('ref')||'').toUpperCase();
  if(urlRef) $('invite').value=urlRef; else if(saved) $('invite').value=saved.code;
  function setBadge(t){ $('vipBadge').textContent=t; }
  function openGate(by){ try{localStorage.setItem('adya_member','1');}catch(e){}
    if($('feeNote')) $('feeNote').classList.add('hidden');
    $('gate').classList.add('open'); setTimeout(function(){ $('gate').classList.add('hidden'); window.scrollTo(0,0); },520);
    setBadge('Invitation '+invite+((by&&by!=='Adya Capital'&&by!=='a member'&&by!=='ek member')?' - nominated by '+by:'')); }
  function gateMsg(m,bad){ var g=$('gateMsg'); g.textContent=m; g.className='gmsg'+(bad?' bad':''); }
  var GT='Continue';
  $('gateForm').addEventListener('submit',function(e){ e.preventDefault(); var code=$('invite').value.trim().toUpperCase().replace(/\s+/g,'');
    if(!code){$('openApply').click();return;}
    if(!apiUrl()) return gateMsg('Access is being set up. Please try again shortly.',true);
    var btn=$('gateBtn'); btn.disabled=true; $('gateTxt').textContent='Verifying...';
    warm(true); fetchJson(apiUrl()+'?action=checkref&code='+encodeURIComponent(code)).then(function(j){
      btn.disabled=false; $('gateTxt').textContent=GT;
      if(j.valid){ invite=code; LS.set('adya_invite',{code:code}); gateMsg('Invitation verified. Your application is the next test.'); setTimeout(function(){openGate(j.by);},500); }
      else gateMsg(j.exhausted?'This code has no nominations left. Ask the member who invited you for another, or accept that access is limited.':'This invitation code is not recognised. Access is by invitation only.',true);
    }).catch(function(){ btn.disabled=false; $('gateTxt').textContent=GT; gateMsg('Connection problem. Please try again.',true); });
  });
  $('openApply').addEventListener('click',function(e){ e.preventDefault();
    invite='';
    setBadge('Open application');
    if($('feeNote')) $('feeNote').classList.remove('hidden');
    gateMsg('');
    $('gate').classList.add('open'); setTimeout(function(){ $('gate').classList.add('hidden'); window.scrollTo(0,0); },520);
  });
  if(location.hash==='#apply') setTimeout(function(){ $('invite').focus(); },300);
  Array.prototype.forEach.call(document.querySelectorAll('.nav .cta[href="#invite"]'),function(a){ a.addEventListener('click',function(e){ e.preventDefault(); $('invite').focus(); }); });

  /* ---------- application form ---------- */
  var target='Any';
  Array.prototype.forEach.call(document.querySelectorAll('.chip'),function(c){ c.addEventListener('click',function(){ target=c.dataset.v; Array.prototype.forEach.call(document.querySelectorAll('.chip'),function(x){x.classList.toggle('on',x===c);}); }); });
  var mode='link';
  Array.prototype.forEach.call(document.querySelectorAll('.tab'),function(b){ b.addEventListener('click',function(){ mode=b.dataset.t; Array.prototype.forEach.call(document.querySelectorAll('.tab'),function(x){x.classList.toggle('active',x===b);}); $('pane-link').classList.toggle('hidden',mode!=='link'); $('pane-pdf').classList.toggle('hidden',mode!=='pdf'); }); });
  $('pdf').addEventListener('change',function(){ var f=this.files[0]; if(f) $('dropTxt').textContent=f.name; });
  var err=$('err');
  function fail(m){ err.textContent=m; }
  function b64(file){ return new Promise(function(res,rej){ var r=new FileReader(); r.onload=function(){ res(String(r.result).split(',')[1]); }; r.onerror=rej; r.readAsDataURL(file); }); }
  var ST='Submit application';
  var pendingPayload=null;
  function showDone(payload,ticket,code,recovered,invites){
    LS.set('adya_ticket',{email:payload.email,ticket:ticket,code:code});
    $('ticketNo').textContent=ticket; $('myCode').textContent=code||'-'; $('invLeft').textContent=(invites==null?'':invites);
    if(code) setShare(code);
    if(payload.feeMethod==='razorpay'&&$('feePaidRzp')) $('feePaidRzp').classList.remove('hidden');
    $('formCard').classList.add('hidden'); if($('payCard')) $('payCard').classList.add('hidden'); $('doneCard').classList.remove('hidden');
    $('doneCard').scrollIntoView({behavior:'smooth'});
    if(recovered){ var dn=$('doneCard'); var note=document.createElement('p'); note.className='muted'; note.textContent='Your payment and application were already recorded - this is your existing ticket.'; dn.appendChild(note); }
  }
  function paidUncertain(){
    /* Payment succeeded at checkout but we cannot confirm the application. NEVER reopen checkout
       or ask for another payment: keep the same credentials and allow a same-credential retry. */
    var perr=$('payErr');
    if($('payCard')){ $('formCard').classList.add('hidden'); $('payCard').classList.remove('hidden'); $('payCard').scrollIntoView({behavior:'smooth'}); }
    var pb=$('payBtn'); if(pb){ pb.disabled=false; }
    $('payTxt').textContent='Retry submission (payment already done)';
    if(perr) perr.textContent='We could not confirm your application after payment. If your account was debited, do not pay again. Use the query form on our FAQ page with the same application email so we can check the payment and submission status. If a refund is due, it typically reaches your original payment method within 5-7 working days after the refund is initiated.';
  }
  function submitApp(payload){
    var btn=$('submitBtn'); btn.disabled=true; $('submitTxt').textContent='Submitting...';
    return fetch(apiUrl(),{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)})
     .then(function(r){ return r.json(); })
     .then(function(j){
       btn.disabled=false; $('submitTxt').textContent=ST;
       if(!j.ok){
         if(payload.feeMethod==='razorpay'&&payload.feeRef){
           if(j.error==='payment_already_used'){ AdyaPay.clearCreds();
             if($('payCard')){ $('formCard').classList.add('hidden'); $('payCard').classList.remove('hidden'); }
             var pbu=$('payBtn'); if(pbu) pbu.disabled=true;
             $('payTxt').textContent='Payment already recorded';
             var peru=$('payErr'); if(peru) peru.textContent='This payment is already linked to an application. Your application details were emailed to you when it was recorded. If you cannot find them, use the query form on our FAQ page with the same application email - do not pay again.';
             return; }
           return paidUncertain();
         }
         var m={bad_email:'The email address looks invalid.',too_big:'The file is too large.',no_deck:'A deck is required.',payment_not_verified:'We could not confirm your application after payment. If your account was debited, do not pay again. Use the query form on our FAQ page with the same application email so we can check the payment and submission status. If a refund is due, it typically reaches your original payment method within 5-7 working days after the refund is initiated.',fee_required:'The Rs 499 review fee is required for open applications.',bad_utr:'Enter the 12-digit UTR from your UPI app after paying.',bad_invite:'This invitation code is no longer valid.',invite_used_up:'This code has no nominations left.'}[j.error]||'Something went wrong on our side. Please try again.';
         if($('payCard')&&!$('payCard').classList.contains('hidden')){ $('payCard').classList.add('hidden'); $('formCard').classList.remove('hidden'); var pb2=$('payBtn'); if(pb2){ pb2.disabled=false; $('payTxt').textContent=rzpMode()?'Pay Rs 499 & submit':'Submit application'; } }
         return fail(m); }
       AdyaPay.clearCreds();
       showDone(payload,j.ticket,j.code,false,j.invites);
     })
     .catch(function(){ btn.disabled=false; $('submitTxt').textContent=ST;
       if(payload.feeMethod==='razorpay'&&payload.feeRef) return paidUncertain();
       fail('Connection problem. Please try again.'); });
  }
  $('pitch').addEventListener('submit',function(e){
    e.preventDefault(); err.textContent='';
    var f=e.target, email=f.email.value.trim();
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail('Please enter a valid email address.');
    var payload={email:email,name:f.name.value.trim(),startup:f.startup.value.trim(),target:target}, p=Promise.resolve(); if(invite) payload.invite=invite;
    if(mode==='link'){ var l=f.driveLink.value.trim(); if(!/^https?:\/\/\S+\.\S+/.test(l)) return fail('Please add a link to your deck, or upload a PDF.'); payload.driveLink=l; }
    else { var file=$('pdf').files[0]; if(!file) return fail('Please choose a PDF to upload.'); if(!/pdf$/i.test(file.type)&&!/\.pdf$/i.test(file.name)) return fail('Only PDF files are accepted.'); if(file.size>10*1024*1024) return fail('The file is larger than 10 MB. Please upload a smaller PDF or share a link.'); p=b64(file).then(function(d){ payload.fileData=d; payload.fileName=file.name; }); }
    payload.clientBuild='rzp-preview';
    if(!apiUrl()) return fail('Submissions are being set up. Please try again shortly.');
    p.then(function(){
      if(!invite){
        pendingPayload=payload;
        $('payErr').textContent='';
        setupPayCard();
        $('formCard').classList.add('hidden'); $('payCard').classList.remove('hidden');
        $('payCard').scrollIntoView({behavior:'smooth'});
        return;
      }
      submitApp(payload);
    });
  });

  /* ---------- open-application fee (Rs 499) ---------- */
  $('payBack').addEventListener('click',function(){ $('payCard').classList.add('hidden'); $('formCard').classList.remove('hidden'); $('formCard').scrollIntoView({behavior:'smooth'}); var pb=$('payBtn'); pb.disabled=false; $('payTxt').textContent=rzpMode()?'Pay Rs 499 & submit':'Submit application'; });
  function rzpMode(){ return window.AdyaPay&&AdyaPay.enabled()&&(window.PAY_CONFIG||{}).provider==='razorpay'; }
  function setupPayCard(){
    var rzp=rzpMode();
    var saved=rzp&&pendingPayload?AdyaPay.loadCreds(pendingPayload.email):null;
    $('payTxt').textContent=saved?'Submit application (payment already done)':(rzp?'Pay Rs 499 & submit':'Submit application');
  }
  $('payBtn').addEventListener('click',function(){
    var perr=$('payErr'); perr.textContent='';
    if(!pendingPayload){ perr.textContent='Your form details were lost. Please go back and submit again.'; return; }
    var pb=$('payBtn');
    if(rzpMode()){
      var saved=AdyaPay.loadCreds(pendingPayload.email);
      if(saved){
        pb.disabled=true; $('payTxt').textContent='Submitting...';
        pendingPayload.feeInr=499; pendingPayload.feeMethod='razorpay';
        pendingPayload.feeRef=saved.paymentId; pendingPayload.feeOrderId=saved.orderId; pendingPayload.feeSignature=saved.signature;
        pendingPayload.feeStatus='paid_unverified';
        submitApp(pendingPayload);
        return;
      }
      pb.disabled=true; $('payTxt').textContent='Opening secure payment...';
      AdyaPay.charge({ name:pendingPayload.name, email:pendingPayload.email,
        onSuccess:function(r){
          AdyaPay.saveCreds(pendingPayload.email,r);
          pendingPayload.feeInr=499; pendingPayload.feeMethod='razorpay';
          pendingPayload.feeRef=r.paymentId; pendingPayload.feeOrderId=r.orderId; pendingPayload.feeSignature=r.signature;
          pendingPayload.feeStatus='paid_unverified';
          $('payTxt').textContent='Submitting...';
          submitApp(pendingPayload);
        },
        onDismiss:function(){ pb.disabled=false; $('payTxt').textContent='Pay Rs 499 & submit'; perr.textContent='Payment was not completed. The application submits only after the Rs 499 payment goes through.'; },
        onError:function(m){ pb.disabled=false; $('payTxt').textContent='Pay Rs 499 & submit'; perr.textContent=m||'We could not confirm your application after payment. If your account was debited, do not pay again. Use the query form on our FAQ page with the same application email so we can check the payment and submission status. If a refund is due, it typically reaches your original payment method within 5-7 working days after the refund is initiated.'; }
      });
      return;
    }
    perr.textContent='Payments are being set up. Please try again shortly.';
  });

  /* ---------- copy / share ---------- */
  function copyText(t,btn){ t=String(t||'').trim(); if(!t) return;
    function feedback(){ toast('Copied'); if(btn){ var o=btn.dataset.label||btn.textContent; btn.dataset.label=o; btn.textContent='Copied'; btn.classList.add('ok'); clearTimeout(btn._ct); btn._ct=setTimeout(function(){ btn.textContent=o; btn.classList.remove('ok'); },1600); } }
    function fallback(){ var ta=document.createElement('textarea'); ta.value=t; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); feedback(); }catch(e){ prompt('Copy this:',t); } ta.remove(); }
    if(navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(feedback,fallback); else fallback(); }
  $('copyTicket').addEventListener('click',function(){ copyText($('ticketNo').textContent,this); });
  $('copyCode').addEventListener('click',function(){ copyText($('myCode').textContent,this); });
  document.addEventListener('click',function(e){ var b=e.target.closest('.copybtn[data-copy]'); if(b) copyText(b.dataset.copy,b); });
  var shareUrl='';
  function setShare(code){ shareUrl=location.origin+location.pathname+'?ref='+encodeURIComponent(code);
    var msg='You have been nominated to apply to Adya Capital, an invitation-only founder network. Access is earned and most applicants are declined. Your invitation code: '+code+'. '+shareUrl;
    $('waShare').href='https://wa.me/?text='+encodeURIComponent(msg);
    var rw=$('refWa'); if(rw) rw.href=$('waShare').href; }
  $('copyLink').addEventListener('click',function(){ copyText(shareUrl,null); });
  $('again').addEventListener('click',function(){ $('pitch').reset(); $('dropTxt').textContent='Choose a PDF (max 10 MB)'; $('doneCard').classList.add('hidden'); $('formCard').classList.remove('hidden'); $('formCard').scrollIntoView({behavior:'smooth'}); });
  function backToStart(){ $('doneCard').classList.add('hidden'); $('formCard').classList.remove('hidden'); setBadge('Member access');
    var g=$('gate'); g.classList.remove('hidden'); void g.offsetWidth; g.classList.remove('open'); window.scrollTo({top:0,behavior:'smooth'}); }
  $('homeBtn').addEventListener('click',backToStart);
  var st=LS.get('adya_ticket'); if(st){ 
    if(st.code){ $('refCard').classList.remove('hidden'); $('refCode').textContent=st.code; setShare(st.code);
      if(apiUrl()) fetchJson(apiUrl()+'?action=nominations&code='+encodeURIComponent(st.code)).then(function(n){
        if(!n.ok) return;
        $('refLeft').textContent='You have '+n.remaining+' nomination'+(n.remaining===1?'':'s')+' left.'+(n.bonus>0?' +'+n.bonus+' earned back from admitted nominees.':'')+' Choose carefully.';
        var rows=(n.nominations||[]).map(function(x){ var chip=x.status==='approved'?'Admitted':(x.status==='declined'?'Declined':'Under review'); return '<div style="margin-top:3px">&middot; '+esc(x.name)+' - '+chip+'</div>'; }).join('');
        if(rows) $('nomList').innerHTML='<b>Your nominees</b>'+rows; }).catch(function(){}); } }
  $('refCopy').addEventListener('click',function(){ copyText($('refCode').textContent,this); });
  $('refCopyLink').addEventListener('click',function(){ copyText(shareUrl,this); });

})();
