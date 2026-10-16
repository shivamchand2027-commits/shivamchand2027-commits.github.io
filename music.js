/* Background music: "Wind from the Mountain - Raga Pahad" by Saseendran (Pixabay).
   Free for use under the Pixabay Content License, no attribution required.
   https://pixabay.com/music/india-wind-from-the-mountain-raga-pahad-364841/
   Loops seamlessly as a decoded Web Audio buffer, soft volume, 2.5s fade-in.
   Starts at the first tap/keypress when autoplay is blocked. Mute toggle in the header. */
(function(){
  var btn=document.getElementById('mute'); if(!btn) return;
  var label=btn.querySelector('.t'), KEY='adya_music';
  try{ if(localStorage.getItem(KEY)===null && localStorage.getItem('lcf_music')!==null){ localStorage.setItem(KEY,localStorage.getItem('lcf_music')); localStorage.removeItem('lcf_music'); } }catch(e){}
  var want=true; try{ want=localStorage.getItem(KEY)!=='off'; }catch(e){}
  var C=window.AudioContext||window.webkitAudioContext; if(!C){ btn.style.display='none'; return; }
  var SRC='raga-pahad-wind.b64', VOL=0.16, FADE=2.5;
  var ctx=null, master=null, buf=null, src=null, started=false, loading=false;
  function ui(){ var on=want&&ctx&&ctx.state==='running'; btn.classList.toggle('on',!!on); if(label) label.textContent=want?'Music on':'Music off'; btn.setAttribute('aria-pressed',want?'true':'false'); }
  function build(){ if(ctx) return; ctx=new C(); master=ctx.createGain(); master.gain.value=0; master.connect(ctx.destination); }
  function load(){ if(buf||loading) return; loading=true;
    fetch(SRC).then(function(r){ if(!r.ok) throw 0; return r.text(); })
      .then(function(t){ var bin=atob(t.replace(/\s/g,'')), ab=new Uint8Array(bin.length); for(var i=0;i<bin.length;i++) ab[i]=bin.charCodeAt(i); build(); return ctx.decodeAudioData(ab.buffer); })
      .then(function(b){ buf=b; if(started) play(); })
      .catch(function(){ loading=false; }); }
  function play(){ if(!buf||!ctx) return;
    if(src){ try{ src.stop(); }catch(e){} }
    src=ctx.createBufferSource(); src.buffer=buf; src.loop=true; src.connect(master); src.start(); }
  function fadeTo(v,s){ if(!ctx) return; var t=ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value,t); master.gain.linearRampToValueAtTime(v,t+s); }
  function start(){ if(!want) return; build(); load();
    var go=function(){ if(ctx.state!=='running') return ui(); if(!started){ started=true; if(buf) play(); } fadeTo(VOL,FADE); ui(); };
    var p=ctx.resume(); if(p&&p.then) p.then(go,ui); else go(); }
  function stop(){ fadeTo(0,.6); setTimeout(function(){ if(!want&&ctx) ctx.suspend(); ui(); },700); }
  function gesture(){ ['pointerdown','keydown','touchend'].forEach(function(e){ document.removeEventListener(e,gesture,true); }); if(want) start(); }
  btn.addEventListener('click',function(e){ e.stopPropagation(); want=!want; try{ localStorage.setItem(KEY,want?'on':'off'); }catch(x){} if(want) start(); else stop(); ui(); });
  document.addEventListener('visibilitychange',function(){ if(!ctx||!want) return; if(document.hidden){ fadeTo(0,.4); setTimeout(function(){ if(document.hidden) ctx.suspend(); },500); } else { start(); } });
  ['pointerdown','keydown','touchend'].forEach(function(e){ document.addEventListener(e,gesture,true); });
  ui(); load();
  if(want){ try{ build(); ctx.resume().then(function(){ if(ctx.state==='running') start(); }).catch(function(){}); }catch(e){} }
})();
