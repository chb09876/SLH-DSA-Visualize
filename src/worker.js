import * as algorithms from '@noble/post-quantum/slh-dsa.js';
import {sha256,sha512} from '@noble/hashes/sha2.js';
import {shake128,shake256} from '@noble/hashes/sha3.js';
const hex=b=>Array.from(b||[],v=>v.toString(16).padStart(2,'0')).join('');
const unhex=s=>Uint8Array.from((s||'').match(/../g)||[],v=>parseInt(v,16));
const concat=(...parts)=>{const out=new Uint8Array(parts.reduce((n,b)=>n+b.length,0));let at=0;for(const b of parts){out.set(b,at);at+=b.length;}return out;};
const parameters={'128s':[16,63,7,9,14,12],'128f':[16,66,22,3,33,6],'192s':[24,63,7,9,17,14],'192f':[24,66,22,3,33,8],'256s':[32,64,8,8,22,14],'256f':[32,68,17,4,35,9]};
let trace,phase='operation',job;
const snapshots=v=>{
 if(v instanceof Uint8Array)return hex(v);
 if(v instanceof Uint32Array)return Array.from(v);
 if(typeof v==='bigint')return v.toString();
 if(Array.isArray(v))return v.map(snapshots);
 if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,snapshots(x)]));
 return v;
};
globalThis.__SLH_TRACE__=(type,data)=>{
 if(!trace)return;
 if(type==='treeNode'){
  const nodes=trace.nodes||(trace.nodes={xmss:{},fors:{}}),group=nodes[data.kind];
  const key=data.kind==='fors'?data.tree:data.layer,tree=group[key]||(group[key]={});
  tree[data.height+':'+data.index]={hex:hex(data.value.subarray(0,job.n)),source:data.source};return;
 }
 if(type==='chainNode'){
  const l=trace.layers[data.layer]||(trace.layers[data.layer]={layer:data.layer,chains:{}});
  if(data.leaf!==undefined)l.chainLeaf=data.leaf;
  const chain=l.chains[data.chain]||(l.chains[data.chain]={});
  chain[data.step]=hex(data.value.subarray(0,job.n));return;
 }
 const e=snapshots(data);
 if(type==='digest'){
  trace.digest=e;self.postMessage({type:'progress',stage:'digest',detail:e});
 }else if(type==='keygenProgress'){
  self.postMessage({type:'progress',stage:'keygen',detail:e});
 }else if(type==='forsTree'){
  trace.fors[e.tree]=e;
  self.postMessage({type:'progress',stage:'fors',detail:{tree:e.tree,index:e.index,root:e.root,completed:e.tree+1,total:job.k}});
 }else if(type==='forsPk'){
  trace.forsPk=e.value;
 }else if(type==='xmssInput'){
  const l=trace.layers[e.layer]||(trace.layers[e.layer]={layer:e.layer,chains:{}});Object.assign(l,e);
  self.postMessage({type:'progress',stage:'wots',detail:e});
 }else if(type==='xmssResult'){
  const l=trace.layers[e.layer]||(trace.layers[e.layer]={layer:e.layer,chains:{}});Object.assign(l,e);
  self.postMessage({type:'progress',stage:'hypertree',detail:{...e,completed:e.layer+1,total:job.d}});
 }else if(type==='keygenResult')trace.keygen=e;
 else if(type==='rootComparison')trace.comparison=e;
};
function formatMessage(input){
 const message=unhex(input.message),context=unhex(input.context);
 if(context.length>255)throw new Error('컨텍스트는 255바이트 이하여야 합니다.');
 let digest=new Uint8Array(),oid=new Uint8Array();
 if(input.format==='hash'){
  const ph=input.prehash;
  if((ph==='SHA-256'||ph==='SHAKE128')&&input.level!=='128')throw new Error('SHA-256과 SHAKE128 pre-hash는 128 세트에서만 선택할 수 있습니다.');
  const functions={'SHA-256':m=>sha256(m),'SHA-512':m=>sha512(m),'SHAKE128':m=>shake128(m,{dkLen:32}),'SHAKE256':m=>shake256(m,{dkLen:64})};
  const suffix={'SHA-256':1,'SHA-512':3,'SHAKE128':11,'SHAKE256':12};
  digest=functions[ph](message);oid=Uint8Array.from([6,9,0x60,0x86,0x48,1,0x65,3,4,2,suffix[ph]]);
 }
 const formatted=concat(Uint8Array.of(input.format==='hash'?1:0,context.length),context,oid,input.format==='hash'?digest:message);
 return {message:formatted,prehash:hex(digest),oid:hex(oid),formattedPrefix:hex(formatted.subarray(0,128)),formattedLength:formatted.length};
}
self.onmessage=({data:input})=>{
 const started=performance.now();
 try{
  const [n,h,d,hp,k,a]=parameters[input.level+input.profile];job={n,h,d,hp,k,a};
  const algo=algorithms['slh_dsa_'+input.family.toLowerCase()+'_'+input.level+input.profile];
  if(!algo)throw new Error('지원하지 않는 파라미터 세트입니다.');
  trace={mode:input.mode,digest:null,fors:[],layers:{},forsPk:null,comparison:null};
  let result={};
  if(input.mode==='keygen'){
   self.postMessage({type:'progress',stage:'seeds',detail:{}});
   const seed=unhex(input.seed);if(seed.length!==3*n)throw new Error('세 시드는 각각 '+n+'바이트여야 합니다.');
   const keys=algo.keygen(seed);result={secretKey:hex(keys.secretKey),publicKey:hex(keys.publicKey)};
  }else{
   const formatted=formatMessage(input);trace.format={...formatted,message:undefined};
   self.postMessage({type:'progress',stage:'format',detail:trace.format});
   if(input.mode==='sign'){
    const sk=unhex(input.secretKey);if(sk.length!==4*n)throw new Error('비밀키는 '+4*n+'바이트여야 합니다.');
    const extraEntropy=input.randomness==='deterministic'?false:unhex(input.addrnd);
    if(extraEntropy!==false&&extraEntropy.length!==n)throw new Error('추가 난수는 '+n+'바이트여야 합니다.');
    trace.randomness={variant:input.randomness,optRand:extraEntropy===false?hex(sk.subarray(2*n,3*n)):hex(extraEntropy)};
    const signature=algo.internal.sign(formatted.message,sk,{extraEntropy});
    result={signature:hex(signature),publicKey:hex(sk.subarray(2*n)),randomizer:hex(signature.subarray(0,n))};
   }else{
    const pk=unhex(input.publicKey);if(pk.length!==2*n)throw new Error('공개키는 '+2*n+'바이트여야 합니다.');
    const sig=unhex(input.signature);const valid=algo.internal.verify(sig,formatted.message,pk);
    result={valid,signatureBytes:sig.length,expectedSignatureBytes:algo.lengths.signature,publicKey:hex(pk)};
   }
  }
  self.postMessage({type:'result',result,trace,elapsed:performance.now()-started});
 }catch(error){self.postMessage({type:'error',message:error?.message||String(error),elapsed:performance.now()-started});}
};
