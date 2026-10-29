import crypto from 'node:crypto';
export const PRICE=99900;
export const ROLES=['HNI','Seed Investor','Family Office']; // UNHI held until owner confirms its meaning.
export const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
export function equal(a,b){const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&crypto.timingSafeEqual(x,y);}
export function signature(secret,body,sig){return equal(crypto.createHmac('sha256',secret).update(body).digest('hex'),sig);}
export function clean(s,max=300){return String(s||'').trim().slice(0,max);}
export function validateProfile(p){
 const name=clean(p.name,120),email=clean(p.email,254).toLowerCase(),phone=clean(p.phone,24),firm=clean(p.firm,180),country=clean(p.country,80),amount=Number(p.amount),currency=clean(p.currency,3).toUpperCase(),role=clean(p.role,40);
 if(!name||!firm||!country||!/^\S+@\S+\.\S+$/.test(email)||!/^\+[1-9]\d{7,14}$/.test(phone)||!Number.isFinite(amount)||amount<=0||!['INR','USD','EUR','GBP','AED','SGD'].includes(currency)||!ROLES.includes(role)||p.whatsapp!==true||p.consent!==true)throw new Error('Complete every field, use an international phone number, and confirm contact consent.');
 return {name,email,phone,firm,country,amount,currency,role,whatsappSelfDeclared:true,consentVersion:'investor-contact-v1'};
}
export function visible(row,now=Date.now()){
 const expires=Date.parse(row.expiresAt),verified=Date.parse(row.lastVerifiedAt);
 if(row.publication!=='approved'||!Number.isFinite(expires)||expires<=now||!Number.isFinite(verified)||verified>now||row.raisingStatus!=='seeking')return false;
 if(row.origin==='onboarded')return row.publicationConsent==='yes'&&!!row.consentRef;
 return row.origin==='public'&&row.sourcePermission==='approved'&&/^https:\/\//.test(row.sourceUrl||'')&&!!row.sourceExcerpt;
}
export function project(row){return Object.fromEntries(['id','name','industry','country','stage','summary','ask','askCurrency','origin','sourceUrl','lastVerifiedAt','expiresAt'].map(k=>[k,row[k]??'']));}
export function canRead(access,now=Date.now()){return !!access&&access.status==='active'&&Date.parse(access.endsAt)>now;}
export function verifiedPayment(payment,order,userId){return payment.status==='captured'&&payment.currency==='INR'&&payment.amount===PRICE&&payment.order_id===order.providerOrderId&&order.userId===userId&&order.amount===PRICE&&order.currency==='INR';}
export function safeCell(x){const s=String(x??'');return /^[=+@\-\t\r]/.test(s)?"'"+s:s;}
export class Serial{constructor(){this.tail=Promise.resolve();}run(fn){const p=this.tail.then(fn,fn);this.tail=p.catch(()=>{});return p;}}
