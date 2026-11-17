let canvasLabels=[],labelBlockers=[],drawOffsetX=0,labelCamera=null;
const textWidths=new Map(),textWidthStats={hits:0,misses:0};
function measuredWidth(font,value){
  const key=font+'\u0000'+value;
  if(textWidths.has(key)){textWidthStats.hits++;return textWidths.get(key);}
  const width=ctx.measureText(value).width;textWidthStats.misses++;
  if(textWidths.size>=12000)textWidths.clear();textWidths.set(key,width);return width;
}
function text(value,x,y,size=38,options={}){
  const font=size*(state.fontSize||14)/14;
  canvasLabels.push({value:String(value),x:x+drawOffsetX,y,font,options,alpha:ctx.globalAlpha});
}
function label(value,x,y,size=60,options={}){text(value,x,y,size,{...options,major:true});}
function flushCanvasLabels(){
  geo.labels=[];labelCamera={...cam};ctx.save();let lastFont='';
  for(const t of canvasLabels.filter(t=>!t.options.fixed).concat(canvasLabels.filter(t=>t.options.fixed))){
    const o=t.options,sx=t.x*cam.s+cam.x,sy=t.y*cam.s+cam.y;
    if(!o.fixed&&labelBlockers.some(b=>sx>=b.x&&sx<=b.x+b.w&&sy>=b.y&&sy<=b.y+b.h))continue;
    const font=(o.weight||400)+' '+t.font+'px system-ui,"Malgun Gothic",sans-serif';if(font!==lastFont){ctx.font=font;lastFont=font;}
    ctx.textAlign=o.align||'left';ctx.textBaseline='alphabetic';ctx.fillStyle=o.color||C.ink;
    ctx.globalAlpha=t.alpha>=.7?1:t.alpha;ctx.fillText(t.value,t.x,t.y);
    geo.labels.push({text:t.value,font:t.font*cam.s,x:sx,y:sy,w:measuredWidth(font,t.value)*cam.s,h:t.font*cam.s});
  }
  ctx.restore();
}
