const WOTS_EXPAND=2000;
const wotsLayoutCache=new Map(),wotsLayoutStats={hits:0,misses:0};
const wotsNodeXs=Array.from({length:16},(_,i)=>550+i*(775+WOTS_EXPAND)/15);
function initWotsLayout(len){
  const chain=state.wotsChain,selected=geo.wots.signatureElements[chain];
  const step=execution.mode==='verify'&&!geo.wots.illustrative?Math.min(14,selected.step):0;
  const key=String(len);let cached=wotsLayoutCache.get(key);
  if(!cached){
    wotsLayoutStats.misses++;
    const ys=Array.from({length:len},(_,i)=>650+i*1500/(len-1));
    cached={ys,starts:ys.map((y,i)=>({chain:i,x:wotsChainX(0),y})),fs:[],prfs:ys.map((y,chain)=>({x:335,y:y-9,w:130,h:18,chain}))};
    for(let i=0;i<len;i++)for(let j=0;j<15;j++){
      const expanded=false,w=38,h=18;
      cached.fs.push({x:(wotsChainX(j)+wotsChainX(j+1)-w)/2,y:ys[i]-h/2,w,h,chain:i,from:j,to:j+1,expanded});
    }
    if(wotsLayoutCache.size>=12)wotsLayoutCache.delete(wotsLayoutCache.keys().next().value);wotsLayoutCache.set(key,cached);
  }else wotsLayoutStats.hits++;
  geo.wotsChainLayout={chain,step,len,gap:1500/(len-1),extra:0,ys:cached.ys,starts:cached.starts};
  geo.wotsFs=cached.fs.map(f=>({...f,used:execution.mode!=='verify'||geo.wots.illustrative||f.from>=geo.wots.signatureElements[f.chain].step}));
  geo.wotsPrfs=execution.mode==='verify'?[]:cached.prfs;
  geo.wotsF=geo.wotsFs[chain*15+step];
}
function wotsChainX(step){return wotsNodeXs[step];}
function wotsChainY(chain){return geo.wotsChainLayout.ys[chain];}
function signWotsPrf(){
  drawSignKeyInputs();
}
function drawRegion(name,fn){
  const dx=name==='signature'?WOTS_EXPAND+SIGNATURE_SHIFT:['xmss','ht'].includes(name)?WOTS_EXPAND:0,start=hitboxes.length;
  ctx.save();ctx.translate(dx,0);drawOffsetX=dx;fn();drawOffsetX=0;ctx.restore();
  if(dx)for(let i=start;i<hitboxes.length;i++)hitboxes[i].x+=dx;
  if(name==='fors')geo.forsDigest.x+=dx;
}
function finishExpandedGeometry(){
  geo.leafX+=WOTS_EXPAND;geo.htX+=WOTS_EXPAND;geo.xmssLayout.left+=WOTS_EXPAND;
}
