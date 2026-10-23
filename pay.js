/* Adya Capital - open-application fee (Rs 499), Razorpay Standard Checkout:
   1) backend creates a Rs 499 order (createfeeorder), 2) checkout.js modal with that order_id,
   3) backend verifies HMAC-SHA256(order_id|payment_id) signature + API status before accepting.
   Fallback provider: "link" (payment link URL). Empty provider = fee gate off. */
window.AdyaPay=(function(){
  var cfg=window.PAY_CONFIG||{};
  function enabled(){ return !!(cfg.provider&&(cfg.keyId||cfg.linkUrl)); }
  function loadScript(src){ return new Promise(function(res,rej){ var s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s); }); }
  function createOrder(opts){
    return fetch(window.BACKEND_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify({action:'createfeeorder',email:opts.email||'',name:opts.name||''})})
      .then(function(r){ return r.json(); })
      .then(function(j){ if(j&&j.error==='already_submitted'){ throw new Error('already_submitted'); } if(!j.ok||!j.order_id) throw new Error('order_failed'); return j.order_id; });
  }
  function charge(opts){ /* opts: {name,email,onSuccess({paymentId,orderId,signature}),onDismiss,onError} */
    if(cfg.provider==='razorpay'&&cfg.keyId){
      var go=function(orderId){
        var rzp=new window.Razorpay({
          key:cfg.keyId, amount:49900, currency:'INR', order_id:orderId,
          name:'Adya Capital', description:'Open application review fee',
          prefill:{name:opts.name||'',email:opts.email||''},
          theme:{color:'#2a0a14'},
          handler:function(resp){ opts.onSuccess({paymentId:resp.razorpay_payment_id||'',orderId:resp.razorpay_order_id||orderId,signature:resp.razorpay_signature||''}); },
          modal:{ondismiss:function(){ if(opts.onDismiss) opts.onDismiss(); }}
        });
        rzp.on('payment.failed',function(){ if(opts.onError) opts.onError('Payment did not go through. If your account was debited for this failed attempt, your bank usually returns it automatically.'); });
        rzp.open();
      };
      var start=function(){ createOrder(opts).then(go,function(e){ if(opts.onError){ if(e&&e.message==='already_submitted') opts.onError('An application with a paid fee already exists for this email. Your application details were emailed to you; if you cannot find them, use the query form on our FAQ page. Do not pay again.'); else opts.onError('Payment could not start. Please try again in a moment.'); } }); };
      if(window.Razorpay) start(); else loadScript('https://checkout.razorpay.com/v1/checkout.js').then(start,function(){ if(opts.onError) opts.onError('Payment could not load. Check your connection and try again.'); });
    } else if(cfg.linkUrl){
      window.open(cfg.linkUrl,'_blank','noopener');
      if(opts.onError) opts.onError('Complete the payment in the new tab, then return here.');
    } else if(opts.onError) opts.onError('Payments are being set up. Please try again shortly.');
  }
  /* Paid-state recovery: persist verified-checkout credentials so a failed/lost submit fetch
     can be retried with the SAME payment - checkout never reopens for a completed payment. */
  var CREDS_KEY='adya_fee_creds_v1', CREDS_TTL=6*3600*1000;
  function saveCreds(email,r){ try{ localStorage.setItem(CREDS_KEY, JSON.stringify({email:String(email||'').toLowerCase(),paymentId:r.paymentId,orderId:r.orderId,signature:r.signature,ts:Date.now()})); }catch(e){} }
  function loadCreds(email){ try{ var j=JSON.parse(localStorage.getItem(CREDS_KEY)||'null'); if(!j) return null; if(String(j.email)!==String(email||'').toLowerCase()) return null; if(Date.now()-(j.ts||0)>CREDS_TTL) return null; if(!j.paymentId||!j.orderId||!j.signature) return null; return j; }catch(e){ return null; } }
  function clearCreds(){ try{ localStorage.removeItem(CREDS_KEY); }catch(e){} }
  return {enabled:enabled,charge:charge,saveCreds:saveCreds,loadCreds:loadCreds,clearCreds:clearCreds};
})();
