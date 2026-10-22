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
  var GT='Request entry';
  $('gateForm').addEventListener('submit',function(e){ e.preventDefault(); var code=$('invite').value.trim().toUpperCase().replace(/\s+/g,'');
    if(!code) return gateMsg('Enter your invitation code to continue.',true);
    if(!apiUrl()) return gateMsg('Access is being set up. Please try again shortly.',true);
    var btn=$('gateBtn'); btn.disabled=true; $('gateTxt').textContent='Verifying...';
    warm(true); fetchJson(apiUrl()+'?action=checkref&code='+encodeURIComponent(code)).then(function(j){
      btn.disabled=false; $('gateTxt').textContent=GT;
      if(j.valid){ invite=code; LS.set('adya_invite',{code:code}); gateMsg('Invitation verified. Your application is the next test.'); setTimeout(function(){openGate(j.by);},500); }
      else gateMsg(j.exhausted?'This code has no nominations left. Ask the member who invited you for another, or accept that access is limited.':'This invitation code is not recognised. Access is by invitation only.',true);
    }).catch(function(){ btn.disabled=false; $('gateTxt').textContent=GT; gateMsg('Connection problem. Please try again.',true); });
  });
  function toStatus(e){ if(e) e.preventDefault(); $('formCard').classList.add('hidden'); $('gate').classList.add('open');
    setTimeout(function(){ $('gate').classList.add('hidden'); $('statusCard').scrollIntoView({behavior:'smooth'}); },420); setBadge('Status check'); }
  $('toStatus').addEventListener('click',toStatus);
  $('openApply').addEventListener('click',function(e){ e.preventDefault();
    invite='';
    setBadge('Open application');
    if($('feeNote')) $('feeNote').classList.remove('hidden');
    gateMsg('');
    $('gate').classList.add('open'); setTimeout(function(){ $('gate').classList.add('hidden'); window.scrollTo(0,0); },520);
  });
  if(location.hash==='#status') toStatus();
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
  function submitApp(payload){
    var btn=$('submitBtn'); btn.disabled=true; $('submitTxt').textContent='Submitting...';
    return fetch(apiUrl(),{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)})
     .then(function(r){ return r.json(); })
     .then(function(j){
       btn.disabled=false; $('submitTxt').textContent=ST;
       if(!j.ok){ var m={bad_email:'The email address looks invalid.',too_big:'The file is too large.',no_deck:'A deck is required.',payment_not_verified:'The payment could not be verified. If money was taken, it is auto-refunded by Razorpay - please try again or write to us.',fee_required:'The Rs 499 review fee is required for open applications.',bad_utr:'Enter the 12-digit UTR from your UPI app after paying.',bad_invite:'This invitation code is no longer valid.',invite_used_up:'This code has no nominations left.'}[j.error]||'Something went wrong on our side. Please try again.';
         if($('payCard')&&!$('payCard').classList.contains('hidden')){ $('payCard').classList.add('hidden'); $('formCard').classList.remove('hidden'); var pb2=$('payBtn'); if(pb2){ pb2.disabled=false; $('payTxt').textContent=rzpMode()?'Pay Rs 499 & submit':'Submit application'; } }
         return fail(m); }
       LS.set('adya_ticket',{email:payload.email,ticket:j.ticket,code:j.code});
       $('ticketNo').textContent=j.ticket; $('myCode').textContent=j.code; $('invLeft').textContent=j.invites;
       $('sEmail').value=payload.email; $('sTicket').value=j.ticket; setShare(j.code);
       if(payload.feeMethod==='razorpay'&&$('feePaidRzp')) $('feePaidRzp').classList.remove('hidden');
       $('formCard').classList.add('hidden'); if($('payCard')) $('payCard').classList.add('hidden'); $('doneCard').classList.remove('hidden');
       $('doneCard').scrollIntoView({behavior:'smooth'});
     })
     .catch(function(){ btn.disabled=false; $('submitTxt').textContent=ST; fail('Connection problem. Please try again.'); });
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
    $('payTxt').textContent=rzp?'Pay Rs 499 & submit':'Submit application';
  }
  $('payBtn').addEventListener('click',function(){
    var perr=$('payErr'); perr.textContent='';
    if(!pendingPayload){ perr.textContent='Your form details were lost. Please go back and submit again.'; return; }
    var pb=$('payBtn');
    if(rzpMode()){
      pb.disabled=true; $('payTxt').textContent='Opening secure payment...';
      AdyaPay.charge({ name:pendingPayload.name, email:pendingPayload.email,
        onSuccess:function(r){
          pendingPayload.feeInr=499; pendingPayload.feeMethod='razorpay';
          pendingPayload.feeRef=r.paymentId; pendingPayload.feeOrderId=r.orderId; pendingPayload.feeSignature=r.signature;
          pendingPayload.feeStatus='paid_unverified';
          $('payTxt').textContent='Submitting...';
          submitApp(pendingPayload);
        },
        onDismiss:function(){ pb.disabled=false; $('payTxt').textContent='Pay Rs 499 & submit'; perr.textContent='Payment was not completed. The application submits only after the Rs 499 payment goes through.'; },
        onError:function(m){ pb.disabled=false; $('payTxt').textContent='Pay Rs 499 & submit'; perr.textContent=m||'Payment failed. No money was taken - please try again.'; }
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
  function backToStart(){ out.className='status hidden'; out.innerHTML=''; $('doneCard').classList.add('hidden'); $('formCard').classList.remove('hidden'); setBadge('Member access');
    var g=$('gate'); g.classList.remove('hidden'); void g.offsetWidth; g.classList.remove('open'); window.scrollTo({top:0,behavior:'smooth'}); }
  $('statusBack').addEventListener('click',backToStart);
  $('homeBtn').addEventListener('click',backToStart);
  var st=LS.get('adya_ticket'); if(st){ $('sEmail').value=st.email; $('sTicket').value=st.ticket;
    if(st.code){ $('refCard').classList.remove('hidden'); $('refCode').textContent=st.code; setShare(st.code);
      if(apiUrl()) fetchJson(apiUrl()+'?action=nominations&code='+encodeURIComponent(st.code)).then(function(n){
        if(!n.ok) return;
        $('refLeft').textContent='You have '+n.remaining+' nomination'+(n.remaining===1?'':'s')+' left.'+(n.bonus>0?' +'+n.bonus+' earned back from admitted nominees.':'')+' Choose carefully.';
        var rows=(n.nominations||[]).map(function(x){ var chip=x.status==='approved'?'Admitted':(x.status==='declined'?'Declined':'Under review'); return '<div style="margin-top:3px">&middot; '+esc(x.name)+' - '+chip+'</div>'; }).join('');
        if(rows) $('nomList').innerHTML='<b>Your nominees</b>'+rows; }).catch(function(){}); } }
  $('refCopy').addEventListener('click',function(){ copyText($('refCode').textContent,this); });
  $('refCopyLink').addEventListener('click',function(){ copyText(shareUrl,this); });

  /* ---------- status ---------- */
  var out=$('statusOut');
  function show(cls,html){ out.className='status '+cls; out.innerHTML=html; }
  function refLine(j){ if(!j.code) return ''; var u=location.origin+location.pathname+'?ref='+encodeURIComponent(j.code); return '<div class="mini">Your invitation code: <b>'+esc(j.code)+'</b> <button type="button" class="copybtn" data-copy="'+esc(j.code)+'">Copy</button> &middot; '+esc(j.invitesLeft)+' nominations left<br><a href="'+esc(u)+'">'+esc(u)+'</a></div>'; }
  function waitBlock(){ var lessons=['How a venture fund makes money','How investors evaluate a company','How valuation is set','Funding readiness: when to raise','Reading a term sheet','Reaching investors','Common founder mistakes'];
    var l=lessons[new Date().getDay()%7];
    return '<div class="mini" style="margin-top:10px;opacity:.9"><b>While the Committee reads yours:</b> start with the Founder Academy lesson "'+esc(l)+'". Members get all 7 lessons, valuation calculators and the 52-fund Vault with partner LinkedIns, including Peak XV, Accel and Blume Ventures.</div>'; }
  $('statusForm').addEventListener('submit',function(e){
    e.preventDefault();
    var em=$('sEmail').value.trim(), t=$('sTicket').value.trim().toUpperCase();
    if(!em||!t) return show('rejected','Please enter both your email and your ticket.');
    if(!apiUrl()) return show('pending','Status checks are being set up. Please try again shortly.');
    show('pending','Checking your application...'); warm(true);
    var slowT=setTimeout(function(){ show('pending','Checking your application...<br><span class="mini">This can take a few seconds on the first request.</span>'); },6000);
    fetchJson(apiUrl()+'?action=status&email='+encodeURIComponent(em)+'&ticket='+encodeURIComponent(t)).then(function(j){ clearTimeout(slowT);
      var tick='<div class="mini">Ticket: <b>'+esc(t)+'</b> <button type="button" class="copybtn" data-copy="'+esc(t)+'">Copy</button></div>';
      var fb=j.founding?'<div style="margin-bottom:8px"><span style="display:inline-block;border:1px solid rgba(212,175,55,.65);color:#d4af37;padding:2px 10px;border-radius:999px;font-size:11px;letter-spacing:.14em;text-transform:uppercase">Founding Member</span></div>':'';
      var laneNote=(j.lane==='open'&&j.status==='pending')?'<div class="mini" style="margin-top:8px;opacity:.85">Open application. Nominated founders are reviewed first - a member\'s code moves you to the fast lane.</div>':'';
      if(j.status==='approved') show('approved',fb+'<b>Application approved. Welcome to Adya Capital.</b><br>'+esc(j.message)+'<br>Direct line to the Managing Partner:<span class="phone">'+esc(j.phone)+'</span>'+tick+refLine(j));
      else if(j.status==='rejected') show('rejected',fb+'<b>Not selected.</b><br>The Investment Committee has declined this application. Most are. You may reapply once the company shows materially stronger traction.'+tick+refLine(j));
      else if(j.status==='pending') show('pending',fb+'<b>Your application is under review by the Investment Committee.</b><br>Most applications are declined. Check back later.'+tick+refLine(j)+laneNote+waitBlock());
      else show('rejected','No application was found for this email and ticket. Please check both and try again.'+tick);
      fetchJson(apiUrl()+'?action=deckscore&email='+encodeURIComponent(em)+'&ticket='+encodeURIComponent(t)).then(function(s){
        if(!s.ok||!s.scored) return;
        var rows=(s.dims||[]).map(function(d){ return '<div style="margin-top:8px"><b>'+esc(d.label)+' - '+esc(d.score)+'/10</b><br><span class="mini">'+esc(d.works)+'</span><br><span class="mini" style="opacity:.85">Fix: '+esc(d.fix)+'</span></div>'; }).join('');
        var top=(s.top3||[]).map(function(x,i){ return '<div style="margin-top:3px">'+(i+1)+'. '+esc(x)+'</div>'; }).join('');
        out.insertAdjacentHTML('beforeend','<div style="margin-top:14px;border-top:1px solid rgba(212,175,55,.25);padding-top:12px"><b>Adya Deck Readiness Score: '+esc(s.total)+'/100 - '+esc(s.band)+'</b>'+rows+(top?'<div style="margin-top:10px"><b>Top 3 priority fixes</b>'+top+'</div>':'')+'<div class="mini" style="margin-top:8px">Fix these and re-submit - we re-score updated decks once.</div></div>');
      }).catch(function(){});
    }).catch(function(){ clearTimeout(slowT); show('rejected','Connection problem. Please try again.'); });
  });
})();
