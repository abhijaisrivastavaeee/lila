/* Maya doors (2 Nov 2026): one link that never changes, for links whose real address (a Cloudflare quick tunnel)
   changes whenever the Mac's network drops. The Mac writes its current address ENCRYPTED to a secret gist
   (~/Maya/tunnelkeeper/addrgist.py: AES-256-GCM, key = PBKDF2-SHA256(secret, "lila-addr-v1", 150000)).
   This page holds the secret only in the #fragment (never sent to any server) and in this browser's storage,
   decrypts the address here, checks it answers, and moves there. If not, it waits calmly and retries every 10 s. */
(()=>{
const C=window.DOOR,G='681e3f3ef70fbbcaac90a4b99902d5c5',OWN='abhijaisrivastavaeee',SK='door-'+C.name;
const $=id=>document.getElementById(id),te=new TextEncoder(),b64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
let key=(location.hash||'').slice(1);
try{if(key)localStorage.setItem(SK,key);else key=localStorage.getItem(SK)||''}catch(e){}
function show(state,line){document.body.dataset.state=state;$('line').textContent=line}
if(!key){show('nokey','Open this from the link Maya sent you once. After that it remembers.');return}
let last=null,lastRead=0;
try{last=JSON.parse(localStorage.getItem(SK+'-last')||'null')}catch(e){}
async function read(){
  let t=null;
  try{const r=await fetch('https://api.github.com/gists/'+G,{cache:'no-store'});if(r.ok){const j=await r.json();t=j.files&&j.files[C.file]&&j.files[C.file].content}}catch(e){}
  if(!t){try{const r=await fetch('https://gist.githubusercontent.com/'+OWN+'/'+G+'/raw/'+C.file+'?t='+Date.now(),{cache:'no-store'});if(r.ok)t=await r.text()}catch(e){}}
  if(!t)return null;
  const d=JSON.parse(t);
  const km=await crypto.subtle.importKey('raw',te.encode(key),'PBKDF2',false,['deriveKey']);
  const k=await crypto.subtle.deriveKey({name:'PBKDF2',salt:te.encode('lila-addr-v1'),iterations:150000,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['decrypt']);
  return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(d.iv)},k,b64(d.ct))));
}
function target(p){
  if(!p)return null;
  if(p.u&&/^https:\/\/[a-z0-9.-]+\//.test(p.u))return p.u;
  if(p.o&&/^https:\/\/[a-z0-9.-]+$/.test(p.o))return p.o+'/'+key+'/';
  return null;
}
function probe(url){return new Promise(res=>{const i=new Image();const t=setTimeout(()=>{i.src='';res(false)},9000);
  i.onload=()=>{clearTimeout(t);res(true)};i.onerror=()=>{clearTimeout(t);res(false)};i.src=url+C.probe+'?door='+Date.now()})}
let timer=null,left=0,busy=false;
async function attempt(){
  if(busy)return;busy=true;clearInterval(timer);
  show('checking','Finding '+C.title+'…');
  try{
    if(!last||Date.now()-lastRead>=50000){
      lastRead=Date.now();
      try{const p=await read();if(p){last=p;try{localStorage.setItem(SK+'-last',JSON.stringify(p))}catch(e){}}}
      catch(e){show('nokey','This link is missing its secret part. Open it again from the message Maya sent you.');busy=false;return}
    }
    const u=target(last);
    if(u&&await probe(u)){show('going','Opening '+C.title+'…');location.replace(u);return}
  }catch(e){}
  busy=false;left=10;
  show('asleep',C.title+' is asleep. The Mac is off or offline. Trying again in '+left+' s.');
  timer=setInterval(()=>{left--;if(left<=0){attempt();return}
    show('asleep',C.title+' is asleep. The Mac is off or offline. Trying again in '+left+' s.')},1000);
}
$('now').onclick=()=>{lastRead=0;attempt()};
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&document.body.dataset.state==='asleep'){lastRead=0;attempt()}});
window.addEventListener('pageshow',e=>{if(e.persisted){lastRead=0;attempt()}});
attempt();
})();
