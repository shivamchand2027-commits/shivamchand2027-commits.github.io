(function(){
  if(window.ADYA_LOCKED) return;
  var F=window.ADYA_FUNDS||[], $=function(i){return document.getElementById(i);};
  function stages(f){ var s=f.stage.join(' ').toLowerCase(), o=[];
    if(s.indexOf('venture debt')>=0) return ['Venture debt'];
    if(s.indexOf('to growth')>=0){ return ['Seed','Early','Growth']; }
    if(s.indexOf('pre-seed')>=0) o.push('Pre-seed'); if(/(^|[^-])seed/.test(s)) o.push('Seed');
    if(s.indexOf('early')>=0) o.push('Early'); if(s.indexOf('growth')>=0) o.push('Growth'); return o; }
  F.forEach(function(f){ f._st=stages(f); var t=f.type; f.type=/Accelerator/.test(t)?'Accelerator':/Angel/.test(t)?'Angel network':/Growth/.test(t)?'Growth / Crossover':t==='Venture capital'?'Venture capital':t; });
  var sel={stage:null,geo:null,sec:null,type:null};
  function uniq(fn){ var m={}; F.forEach(function(f){ fn(f).forEach(function(v){ m[v]=(m[v]||0)+1; }); }); return Object.keys(m).sort(function(a,b){return m[b]-m[a]||a.localeCompare(b);}); }
  function pills(id,key,vals){ var h='<button class="fp on" data-k="'+key+'" data-v="">All</button>'+vals.map(function(v){return '<button class="fp" data-k="'+key+'" data-v="'+v.replace(/"/g,'&quot;')+'">'+v+'</button>';}).join(''); $(id).innerHTML=h; }
  pills('fStage','stage',['Pre-seed','Seed','Early','Growth','Venture debt']);
  pills('fGeo','geo',uniq(function(f){return f.geo;}).slice(0,8));
  pills('fSec','sec',uniq(function(f){return f.sectors;}).filter(function(s){return ['Generalist','Consumer','Fintech','SaaS','AI','Deeptech','Healthcare','Enterprise'].indexOf(s)>=0;}));
  pills('fType','type',uniq(function(f){return [f.type];}));
  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function match(f,q){ if(sel.stage&&f._st.indexOf(sel.stage)<0) return false; if(sel.geo&&f.geo.indexOf(sel.geo)<0) return false;
    if(sel.sec&&f.sectors.indexOf(sel.sec)<0) return false; if(sel.type&&f.type!==sel.type) return false;
    if(!q) return true; var hay=(f.name+' '+f.geo.join(' ')+' '+f.stage.join(' ')+' '+f.sectors.join(' ')+' '+f.type+' '+f.people.map(function(p){return p.name;}).join(' ')).toLowerCase();
    return q.toLowerCase().split(/\s+/).every(function(t){return hay.indexOf(t)>=0;}); }
  function card(f){ var host=f.site.replace(/^https?:\/\/(www\.)?/,'').replace(/\/$/,'');
    return '<article class="fund"><h3>'+esc(f.name)+'</h3><div class="meta">'+esc(f.type)+' · '+esc(f.geo.join(', '))+'</div>'+
      '<div class="tags">'+f.stage.map(function(s){return '<span class="tag">'+esc(s)+'</span>';}).join('')+f.sectors.map(function(s){return '<span class="tag s">'+esc(s)+'</span>';}).join('')+'</div>'+
      (f.people.length?'<div class="people">Partners: '+f.people.map(function(p){return '<a href="'+esc(p.linkedin)+'" target="_blank" rel="noopener noreferrer">'+esc(p.name)+'</a>';}).join(' · ')+'</div>':'')+
      '<div class="flinks"><a href="'+esc(f.site)+'" target="_blank" rel="noopener noreferrer">'+esc(host)+'</a>'+(f.linkedin?'<a class="in" href="'+esc(f.linkedin)+'" target="_blank" rel="noopener noreferrer">LinkedIn</a>':'')+'</div></article>'; }
  function render(){ var q=$('q').value.trim(), r=F.filter(function(f){return match(f,q);});
    $('count').textContent=r.length+' of '+F.length+' funds'; $('grid').innerHTML=r.length?r.map(card).join(''):'<div class="empty" style="grid-column:1/-1">No funds match your search. Try fewer filters or a different spelling.</div>'; }
  document.addEventListener('click',function(e){ var b=e.target.closest('.fp'); if(!b) return; var k=b.dataset.k, v=b.dataset.v||null;
    var all=b.parentNode.querySelectorAll('.fp'); Array.prototype.forEach.call(all,function(x){x.classList.remove('on');}); b.classList.add('on'); sel[k]=v; render(); });
  $('q').addEventListener('input',render);
  $('asof').innerHTML='Compiled from public sources, current as of '+esc(window.ADYA_FUNDS_ASOF||'')+'. Stage and sector tags are indicative, and funds change focus over time. Check each fund\'s website for its current thesis and team before reaching out. This directory is for information only and is not an endorsement or investment advice.';
  render();
})();
