/* Background music: a soft Indian classical soundscape generated live in the browser with the Web Audio API.
   No audio files, no samples, no third-party recordings, so there is nothing to license.
   - Tanpura drone: Pa - Sa - Sa - low Sa plucks in a slow cycle, with the bright "jivari" shimmer.
   - Bansuri-style flute: slow, breathy phrases in raga Yaman (an evening raga, Sa = D), with meend glides and long rests.
   Very low volume. Starts at the first tap/keypress if autoplay is blocked. Mute toggle in the header. */
(function(){
  var btn=document.getElementById('mute'); if(!btn) return;
  var label=btn.querySelector('.t'), KEY='lcf_music';
  var want=true; try{ want=localStorage.getItem(KEY)!=='off'; }catch(e){}
  var C=window.AudioContext||window.webkitAudioContext; if(!C){ btn.style.display='none'; return; }
  var ctx=null, master, dry, rev, jivari, timer=null, started=false, nextPluck=0, pluckI=0, nextPhrase=0, lastF=0, lastN=null, noiseBuf=null;
  var VOL=0.42, SA=146.83, CYC=[[1.5,0.9],[2,0.75],[2,0.75],[0.5,1.0]]; // [freq multiple of SA, gain] : Pa, Sa', Sa', low Sa
  // Yaman phrases as [semitones above flute-Sa, beats]; Sa=0 Re=2 Ga=4 Ma(tivra)=6 Pa=7 Dha=9 Ni=11, -1 = low Ni, -5 = low Pa, 12 = upper Sa
  var PH=[
    [[-1,2],[2,1.5],[4,3],[2,1.5],[0,0.5],[-1,2.5],[0,4]],
    [[4,2],[6,1.5],[7,3.5],[6,1],[4,2],[2,1.5],[4,1],[2,1.5],[0,4.5]],
    [[-1,1.5],[2,1.5],[4,1.5],[6,2],[7,2],[9,3],[7,1.5],[6,1.5],[4,2.5],[2,2],[0,5]],
    [[7,2],[9,2],[11,3.5],[9,1.5],[7,2],[6,1.5],[4,2.5],[2,1.5],[4,1],[0,4.5]],
    [[2,2],[4,2.5],[6,3],[4,1.5],[2,2],[-1,2.5],[0,5]]
  ];
  var BEAT=1.55;
  function ui(){ var on=want&&ctx&&ctx.state==='running'; btn.classList.toggle('on',!!on); if(label) label.textContent=want?'Music on':'Music off'; btn.setAttribute('aria-pressed',want?'true':'false'); }
  function impulse(c){ var len=c.sampleRate*3.2, b=c.createBuffer(2,len,c.sampleRate); for(var ch=0;ch<2;ch++){ var d=b.getChannelData(ch); for(var i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.4); } return b; }
  function build(){ if(ctx) return; ctx=new C(); master=ctx.createGain(); master.gain.value=0; master.connect(ctx.destination);
    rev=ctx.createConvolver(); rev.buffer=impulse(ctx); var rg=ctx.createGain(); rg.gain.value=.5; rev.connect(rg); rg.connect(master);
    dry=ctx.createGain(); dry.gain.value=.8; dry.connect(master);
    // jivari-style bright wave: harmonics bloom around the 4th to 7th partial
    var n=24, re=new Float32Array(n), im=new Float32Array(n);
    for(var k=1;k<n;k++){ im[k]=(1/k)*(1+2.2*Math.exp(-Math.pow(k-5.5,2)/5)); }
    jivari=ctx.createPeriodicWave(re,im);
    var nl=ctx.sampleRate*2; noiseBuf=ctx.createBuffer(1,nl,ctx.sampleRate); var nd=noiseBuf.getChannelData(0); for(var i=0;i<nl;i++) nd[i]=Math.random()*2-1;
  }
  function pluck(f,t,g){ [-3,3].forEach(function(det){ var o=ctx.createOscillator(), e=ctx.createGain(), lp=ctx.createBiquadFilter();
      o.setPeriodicWave(jivari); o.frequency.value=f; o.detune.value=det; lp.type='lowpass'; lp.Q.value=.5;
      lp.frequency.setValueAtTime(3800,t); lp.frequency.exponentialRampToValueAtTime(700,t+5.5);
      e.gain.setValueAtTime(0,t); e.gain.linearRampToValueAtTime(.085*g,t+.04); e.gain.exponentialRampToValueAtTime(.0005,t+6.2);
      o.connect(lp); lp.connect(e); e.connect(dry); e.connect(rev); o.start(t); o.stop(t+6.4); }); }
  function flute(semi,t,dur,prev){ var f=SA*2*Math.pow(2,semi/12); var o=ctx.createOscillator(), o2=ctx.createOscillator(), o3=ctx.createOscillator(), g=ctx.createGain(), g2=ctx.createGain(), g3=ctx.createGain(), mix=ctx.createGain();
    o.type='sine'; o2.type='sine'; o3.type='sine'; g2.gain.value=.22; g3.gain.value=.07;
    var start=prev?prev:f; o.frequency.setValueAtTime(start,t); o.frequency.exponentialRampToValueAtTime(f,t+(prev?.28:.01)); o2.frequency.setValueAtTime(start*2,t); o2.frequency.exponentialRampToValueAtTime(f*2,t+(prev?.28:.01)); o3.frequency.setValueAtTime(start*3,t); o3.frequency.exponentialRampToValueAtTime(f*3,t+(prev?.28:.01));
    var lfo=ctx.createOscillator(), lg=ctx.createGain(); lfo.frequency.value=4.6+Math.random()*.8; lg.gain.setValueAtTime(0,t); lg.gain.linearRampToValueAtTime(f*.0045,t+Math.min(1.2,dur*.6)); lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency);
    var peak=.05; g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(peak,t+.18); g.gain.setValueAtTime(peak,t+Math.max(.2,dur-.5)); g.gain.linearRampToValueAtTime(0,t+dur+.35);
    o.connect(mix); o2.connect(g2); g2.connect(mix); o3.connect(g3); g3.connect(mix); mix.connect(g);
    // breath
    var ns=ctx.createBufferSource(); ns.buffer=noiseBuf; ns.loop=true; var bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=f*2.2; bp.Q.value=1.2; var ng=ctx.createGain(); ng.gain.setValueAtTime(0,t); ng.gain.linearRampToValueAtTime(.011,t+.12); ng.gain.linearRampToValueAtTime(.004,t+.6); ng.gain.setValueAtTime(.004,t+dur); ng.gain.linearRampToValueAtTime(0,t+dur+.3);
    ns.connect(bp); bp.connect(ng); ng.connect(g);
    g.connect(dry); g.connect(rev); var end=t+dur+.5;
    [o,o2,o3,lfo,ns].forEach(function(x){ x.start(t); x.stop(end); });
    return f; }
  function tick(){ if(!ctx||ctx.state!=='running'||!want) return; var ahead=ctx.currentTime+1.2;
    while(nextPluck<ahead){ var c=CYC[pluckI%4]; pluck(SA*c[0],nextPluck,c[1]); pluckI++; nextPluck+=pluckI%4===0?1.9:1.5; }
    if(nextPhrase<ahead){ var ph=PH[Math.floor(Math.random()*PH.length)], t=nextPhrase;
      for(var i=0;i<ph.length;i++){ var d=ph[i][1]*BEAT; lastF=flute(ph[i][0],t,d,i?lastF:0); t+=d; }
      nextPhrase=t+4+Math.random()*5; } }
  function fadeTo(v,s){ if(!ctx) return; var t=ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value,t); master.gain.linearRampToValueAtTime(v,t+s); }
  function start(){ if(!want) return; build(); var go=function(){ if(ctx.state!=='running') return ui(); if(!started){ started=true; nextPluck=ctx.currentTime+.2; nextPhrase=ctx.currentTime+6; timer=setInterval(tick,300); } fadeTo(VOL,5); ui(); };
    var p=ctx.resume(); if(p&&p.then) p.then(go,ui); else go(); }
  function stop(){ fadeTo(0,.6); setTimeout(function(){ if(!want&&ctx) ctx.suspend(); ui(); },700); }
  function gesture(){ ['pointerdown','keydown','touchend'].forEach(function(e){ document.removeEventListener(e,gesture,true); }); if(want) start(); }
  btn.addEventListener('click',function(e){ e.stopPropagation(); want=!want; try{ localStorage.setItem(KEY,want?'on':'off'); }catch(x){} if(want) start(); else stop(); ui(); });
  document.addEventListener('visibilitychange',function(){ if(!ctx||!want) return; if(document.hidden){ fadeTo(0,.4); setTimeout(function(){ if(document.hidden) ctx.suspend(); },500); } else { start(); } });
  ['pointerdown','keydown','touchend'].forEach(function(e){ document.addEventListener(e,gesture,true); });
  ui();
  if(want){ try{ build(); ctx.resume().then(function(){ if(ctx.state==='running') start(); }).catch(function(){}); }catch(e){} }
})();
