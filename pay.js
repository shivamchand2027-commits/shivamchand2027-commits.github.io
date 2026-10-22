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
      .then(function(j){ if(!j.ok||!j.order_id) throw new Error('order_failed'); return j.order_id; });
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
        rzp.on('payment.failed',function(){ if(opts.onError) opts.onError('Payment failed. No money was taken - please try again.'); });
        rzp.open();
      };
      var start=function(){ createOrder(opts).then(go,function(){ if(opts.onError) opts.onError('Payment could not start. Please try again in a moment.'); }); };
      if(window.Razorpay) start(); else loadScript('https://checkout.razorpay.com/v1/checkout.js').then(start,function(){ if(opts.onError) opts.onError('Payment could not load. Check your connection and try again.'); });
    } else if(cfg.linkUrl){
      window.open(cfg.linkUrl,'_blank','noopener');
      if(opts.onError) opts.onError('Complete the payment in the new tab, then return here.');
    } else if(opts.onError) opts.onError('Payments are being set up. Please try again shortly.');
  }
  return {enabled:enabled,charge:charge};
})();
