(function(){
  var $=function(id){return document.getElementById(id);};
  function apiUrl(){return window.BACKEND_URL||'';}
  var LS={get:function(k){try{return JSON.parse(localStorage.getItem(k));}catch(e){return null;}}};

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
  function toast(m){ var t=$('toast'); if(!t) return; t.textContent=m; t.classList.add('show'); clearTimeout(t._h); t._h=setTimeout(function(){t.classList.remove('show');},2200); }
  function esc(s){ var d=document.createElement('div'); d.textContent=s==null?'':String(s); return d.innerHTML; }
  function copyText(t,btn){ t=String(t||'').trim(); if(!t) return;
    function feedback(){ toast('Copied'); if(btn){ var o=btn.dataset.label||btn.textContent; btn.dataset.label=o; btn.textContent='Copied'; btn.classList.add('ok'); clearTimeout(btn._ct); btn._ct=setTimeout(function(){ btn.textContent=o; btn.classList.remove('ok'); },1600); } }
    function fallback(){ var ta=document.createElement('textarea'); ta.value=t; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); feedback(); }catch(e){ prompt('Copy this:',t); } ta.remove(); }
    if(navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(feedback,fallback); else fallback(); }
  document.addEventListener('click',function(e){ var b=e.target.closest('.copybtn[data-copy]'); if(b) copyText(b.dataset.copy,b); });

  /* Pre-fill from the last application made on this device. */
  var st=LS.get('adya_ticket'); if(st){ $('sEmail').value=st.email||''; $('sTicket').value=st.ticket||''; }

  /* ---------- status ---------- */
  var out=$('statusOut');
  function show(cls,html){ out.className='status '+cls; out.innerHTML=html; }
  function refLine(j){ if(!j.code) return ''; var u='https://adyacapital.me/index.html?ref='+encodeURIComponent(j.code); return '<div class="mini">Your invitation code: <b>'+esc(j.code)+'</b> <button type="button" class="copybtn" data-copy="'+esc(j.code)+'">Copy</button> &middot; '+esc(j.invitesLeft)+' nominations left<br><a href="'+esc(u)+'">'+esc(u)+'</a></div>'; }
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
      var phoneLine=j.phone?'<div class="mini" style="margin-top:8px">Direct line: <b>'+esc(j.phone)+'</b></div>':'';
      if(j.status==='approved') show('approved',fb+'<b>Application approved. Welcome to Adya Capital.</b><br>'+esc(j.message)+'<br>Your details and startup information are now with the Partners of Adya Capital. Partner details and meeting timing and place are shared next.'+phoneLine+tick+refLine(j));
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
