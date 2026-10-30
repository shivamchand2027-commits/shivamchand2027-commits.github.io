/* In-browser handoff only. No lead-storage or marketing claim. */
(function(){try{var c=JSON.parse(sessionStorage.getItem('adya_contact_handoff')||'null');if(!c)return;var f=document.getElementById('pitch');f.elements.email.value=c.email||'';f.elements.name.value=c.name||'';sessionStorage.removeItem('adya_contact_handoff');}catch(e){}})();

(function(){var b=document.getElementById('applicationBack');b.addEventListener('click',function(){var g=document.getElementById('gate');g.classList.remove('hidden','open');window.scrollTo(0,0);});})();
