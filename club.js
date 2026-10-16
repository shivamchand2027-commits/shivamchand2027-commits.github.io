(function(){
  var ok=false; try{ ok=localStorage.getItem('adya_member')!==null||localStorage.getItem('lcf_member')!==null; if(ok) localStorage.setItem('adya_member','1'); }catch(e){}
  window.ADYA_MEMBER=ok;
  if(ok) return;
  window.ADYA_LOCKED=true;
  var m=document.querySelector('main'); if(m) m.style.display='none';
  var hb=document.querySelector('.hero-body');
  if(hb) hb.innerHTML='<div><div class="pills"><span class="pill">Members only</span></div><h1 class="title">Not for the public.<br>Earn your way in.</h1></div><div class="hero-low"><div><p class="sub">This section is reserved for admitted members. Enter a valid invitation code on the start page to be considered.</p><a class="btn lg" href="index.html">Enter invitation code<span class="i">&rarr;</span></a></div></div>';
})();
