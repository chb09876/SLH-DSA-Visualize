let sceneVersion=0,lastUIVersion=-1,raster=null,zoomDeadline=0,zoomTimer=null;
const scenePerf={frames:0,sceneBuilds:0,rasterHits:0,rasterBuilds:0,geometryBuilds:0,lastRenderMs:0,cacheBytes:0};
function invalidateScene(){sceneVersion++;}
function deferZoomRefresh(){
  zoomDeadline=performance.now()+90;clearTimeout(zoomTimer);
  zoomTimer=setTimeout(()=>requestDraw(),100);
}
function geometrySnapshot(){
  if(!geo)return null;
  const out=JSON.parse(JSON.stringify(geo));
  if(labelCamera){const ratio=cam.s/labelCamera.s;for(const label of out.labels||[]){
    label.x=(label.x-labelCamera.x)*ratio+cam.x;label.y=(label.y-labelCamera.y)*ratio+cam.y;
    label.font*=ratio;label.w*=ratio;label.h*=ratio;
  }}return out;
}
function rasterPlacement(cache){
  const ratio=cam.s/cache.scale;
  return {x:cam.x-(cache.originX+cache.pad)*ratio,y:cam.y-(cache.originY+cache.pad)*ratio,
    w:cache.surface.width/cache.dpr*ratio,h:cache.surface.height/cache.dpr*ratio};
}
function rasterCovers(r){return r.x<=0&&r.y<=0&&r.x+r.w>=cssW&&r.y+r.h>=cssH;}
function buildRaster(){
  let pad=384;const maxPixels=24*1024*1024;
  while((cssW+pad*2)*(cssH+pad*2)*dpr*dpr>maxPixels&&pad>48)pad=Math.floor(pad/2);
  if(cssW*cssH*dpr*dpr>maxPixels)return null;
  const surface=raster?.surface||document.createElement('canvas');
  const width=Math.ceil((cssW+pad*2)*dpr),height=Math.ceil((cssH+pad*2)*dpr);
  if(surface.width!==width)surface.width=width;if(surface.height!==height)surface.height=height;
  const painter=surface.getContext('2d'),screenContext=ctx;
  painter.setTransform(1,0,0,1,0,0);painter.clearRect(0,0,width,height);
  painter.setTransform(dpr*cam.s,0,0,dpr*cam.s,dpr*(cam.x+pad),dpr*(cam.y+pad));
  // No element is omitted here. Reuse the complete draw pass between content changes.
  try{ctx=painter;drawScene();scenePerf.sceneBuilds++;}finally{ctx=screenContext;}
  scenePerf.rasterBuilds++;scenePerf.cacheBytes=width*height*4;
  return {surface,pad,version:sceneVersion,scale:cam.s,dpr,viewW:cssW,viewH:cssH,originX:cam.x,originY:cam.y};
}
function drawCachedScene(){
  let reusable=false;
  if(raster&&raster.version===sceneVersion&&raster.dpr===dpr&&raster.viewW===cssW&&raster.viewH===cssH){
    const placement=rasterPlacement(raster),sameScale=Math.abs(raster.scale-cam.s)<1e-10;
    reusable=rasterCovers(placement)&&(sameScale||performance.now()<zoomDeadline);
  }
  if(!reusable)raster=buildRaster();else scenePerf.rasterHits++;
  if(raster){
    const r=rasterPlacement(raster);ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.drawImage(raster.surface,r.x,r.y,r.w,r.h);
  }else{
    ctx.setTransform(dpr*cam.s,0,0,dpr*cam.s,dpr*cam.x,dpr*cam.y);drawScene();scenePerf.sceneBuilds++;
  }
}
function render(){
  const started=performance.now();
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=C.paper;ctx.fillRect(0,0,cssW,cssH);
  const gs=24;ctx.fillStyle=C.grid;
  for(let x=((cam.x%gs)+gs)%gs;x<cssW;x+=gs)for(let y=((cam.y%gs)+gs)%gs;y<cssH;y+=gs){ctx.beginPath();ctx.arc(x,y,.65,0,Math.PI*2);ctx.fill();}
  drawCachedScene();
  const zoomText=Math.round(cam.s*100)+'%';if($('zoom').textContent!==zoomText)$('zoom').textContent=zoomText;
  updateNavigator();
  if(lastUIVersion!==sceneVersion){
    const chosen=geo.wots.signatureElements[state.wotsChain];
    const status=execution.mode.toUpperCase()+' · L'+state.layer+' · tree 0x'+addr(state.layer).toString(16)+' · leaf '+state.digits[state.layer]+(geo.wots.illustrative?' · 미계산':' · SIG_WOTS['+chosen.chain+']='+chosen.symbol);
    if($('status').textContent!==status)$('status').textContent=status;
    lastUIVersion=sceneVersion;window.dispatchEvent(new CustomEvent('slh-scene-change'));
  }
  scenePerf.frames++;scenePerf.lastRenderMs=performance.now()-started;
}
