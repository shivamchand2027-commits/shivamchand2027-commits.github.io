(function(){
  if(window.ADYA_LOCKED) return;
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

  var items=[['At least one founder works full-time and the founders have complementary skills.',2],['I have spoken to 20+ real customers about the problem.',2],['I have a working product or pilot.',2],['I have paying customers or clear usage traction.',3],['I can show retention or repeat-usage numbers.',2],['I know my CAC and gross margin.',2],['I have a bottom-up market size with a credible path to $1B+.',2],['My cap table is clean and founder shares vest.',2],['The company is incorporated and IP is held in its name.',1],['I have a 10 to 12 slide deck and a one-page numbers summary.',1],['I know how much to raise and which milestone it reaches.',2],['I have at least 4 to 6 months of runway today.',1],['I have a researched list of 20+ target investors.',1],['I have at least 2 warm introduction paths.',1]];
  var max=items.reduce(function(a,b){return a+b[1];},0);
  $('checks').innerHTML=items.map(function(it,i){return '<label class="check"><input type="checkbox" data-w="'+it[1]+'" id="ck'+i+'"><span>'+it[0]+'</span></label>';}).join('');
  function score(){ var s=0,c=0; Array.prototype.forEach.call(document.querySelectorAll('#checks input'),function(x){ if(x.checked){ s+=+x.dataset.w; c++; } });
    var p=Math.round(s/max*100); $('meterBar').style.width=p+'%'; var msg;
    if(c===0) msg='Tick the statements that are true today. Your score appears here.';
    else if(p<35) msg='<b>Too early ('+p+'%).</b> Talk to more customers, build a product or pilot and show some traction first. Meanwhile consider angels, grants or bootstrapping.';
    else if(p<65) msg='<b>On your way ('+p+'%).</b> You could start angel or pre-seed conversations, but close the unticked gaps first: they will be the investor\'s first questions.';
    else if(p<85) msg='<b>Well prepared ('+p+'%).</b> Ready to start seed conversations. Close the remaining gaps and run a process of 15 to 20 meetings.';
    else msg='<b>Ready to raise ('+p+'%).</b> Now it is about execution: a tight deck, warm introductions and concentrated meetings over one to two weeks.';
    $('rReady').innerHTML=msg+'<br><span style="opacity:.8">'+c+' of '+items.length+' ticked. This is a learning checklist, not a guarantee from any investor.</span>'; }
  $('checks').addEventListener('change',score); score();

  $('copyTpl').addEventListener('click',function(){ var t=$('tpl').innerText, b=this;
    function done(){ b.textContent='Copied'; setTimeout(function(){b.innerHTML='Copy template<span class="i">&rarr;</span>';},1800); }
    if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(t).then(done,function(){ fb(t); done(); }); } else { fb(t); done(); } });
  function fb(t){ var a=document.createElement('textarea'); a.value=t; document.body.appendChild(a); a.select(); try{document.execCommand('copy');}catch(e){} document.body.removeChild(a); }
})();
