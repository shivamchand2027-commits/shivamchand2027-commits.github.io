(function(){
  var form = document.getElementById('qform');
  form.addEventListener('submit', function(ev){
    ev.preventDefault();
    var btn = document.getElementById('qSend');
    var name = document.getElementById('qName').value.trim();
    var email = document.getElementById('qEmail').value.trim().toLowerCase();
    var topic = document.getElementById('qTopic').value;
    var text = document.getElementById('qText').value.trim();
    if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || text.length < 10) {
      alert('Please fill your name, a valid email, and a question of at least 10 characters.');
      return;
    }
    btn.disabled = true; btn.textContent = 'Sending...';
    fetch(window.BACKEND_URL, {method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'},
      body: JSON.stringify({type:'query', name:name, email:email, topic:topic, question:text})})
    .then(function(r){ return r.json(); })
    .then(function(res){
      btn.disabled = false; btn.innerHTML = 'Send to the Committee<span class="i">&rarr;</span>';
      var box = document.getElementById('qSent');
      box.style.display = 'block';
      if (res && res.ok) {
        box.innerHTML = '<b>Query ' + res.qid + ' received.</b> The Committee reads every question. If it needs a personal answer, it comes to your email.';
        form.reset();
      } else {
        box.innerHTML = '<b>Could not send.</b> Please try again in a moment - the ledger sometimes wakes slowly.';
      }
    })
    .catch(function(){
      btn.disabled = false; btn.innerHTML = 'Send to the Committee<span class="i">&rarr;</span>';
      var box = document.getElementById('qSent');
      box.style.display = 'block';
      box.innerHTML = '<b>Connection problem.</b> Please try again in a few seconds.';
    });
  });
})();
