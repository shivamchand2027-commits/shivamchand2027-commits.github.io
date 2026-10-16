(function(){
  if(window.ADYA_LOCKED) return;
  // Accordion: click a step header to open its module
  function setOpen(head, open){
    var body = document.getElementById(head.dataset.acc);
    head.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (body) body.classList.toggle('open', open);
  }
  var heads = document.querySelectorAll('.acc-head');
  Array.prototype.forEach.call(heads, function(h){
    h.addEventListener('click', function(){
      setOpen(h, h.getAttribute('aria-expanded') !== 'true');
    });
  });
  function openHash(){
    var id = (location.hash || '').replace('#','');
    if (!id) return;
    var sec = document.getElementById(id);
    var head = sec && sec.querySelector('.acc-head');
    if (head) setOpen(head, true);
  }
  openHash();
  window.addEventListener('hashchange', function(){ openHash(); });
  if (!location.hash && heads.length) setOpen(heads[0], true);

  var $=function(i){return document.getElementById(i);};
  function n(i){ var v=parseFloat($(i).value); return isNaN(v)?0:v; }
  function f(x){ return (Math.round(x*100)/100).toLocaleString('en-IN'); }
  function calcA(){ var pre=n('cPre'),raise=n('cRaise'),own=n('cOwn'),es=n('cEsop'); var post=pre+raise; var el=$('rA');
    if(post<=0||raise<0){ el.innerHTML='Enter valid numbers.'; return; }
    var inv=raise/post*100, after=own*(1-inv/100-es/100);
    if(after<0) after=0;
    el.innerHTML='Post-money valuation: <b>'+f(post)+'</b><br>New investor ownership: <b>'+f(inv)+'%</b><br>'+(es>0?'New option pool: <b>'+f(es)+'%</b><br>':'')+'Founder ownership after the round: <b>'+f(after)+'%</b> (before: '+f(own)+'%)<br>Total dilution: <b>'+f(own-after)+' percentage points</b>';
    if(es>0) el.innerHTML+='<br><span style="opacity:.8">Note: if the option pool is counted in the pre-money, the effective pre-money valuation is lower.</span>'; }
  function calcB(){ var ex=n('vExit'),m=n('vMult'),d=n('vDil'),r=n('vRaise'),el=$('rB');
    if(m<1||ex<=0||d>=100){ el.innerHTML='Enter valid numbers.'; return; }
    var post=ex*(1-d/100)/m, pre=post-r, own=post>0?r/post*100:0;
    el.innerHTML='Implied post-money valuation: <b>'+f(post)+'</b><br>Implied pre-money: <b>'+f(pre)+'</b><br>Investor ownership for this round: <b>'+f(own)+'%</b>'+(pre<=0?'<br><span style="opacity:.85">The amount raised exceeds the implied valuation. Raise a smaller amount or revisit the exit assumption.</span>':'')+'<br><span style="opacity:.8">Logic: the investor wants '+f(m)+'x and expects '+f(d)+'% dilution later, so post-money today = exit value x (1 - dilution) / multiple.</span>'; }
  ['cPre','cRaise','cOwn','cEsop'].forEach(function(i){$(i).addEventListener('input',calcA);}); ['vExit','vMult','vDil','vRaise'].forEach(function(i){$(i).addEventListener('input',calcB);}); calcA(); calcB();


  $('copyTpl').addEventListener('click',function(){ var t=$('tpl').innerText, b=this;
    function done(){ b.textContent='Copied'; setTimeout(function(){b.innerHTML='Copy template<span class="i">&rarr;</span>';},1800); }
    if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(t).then(done,function(){ fb(t); done(); }); } else { fb(t); done(); } });
  function fb(t){ var a=document.createElement('textarea'); a.value=t; document.body.appendChild(a); a.select(); try{document.execCommand('copy');}catch(e){} document.body.removeChild(a); }
})();
