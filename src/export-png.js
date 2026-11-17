 $('export').addEventListener('click',()=>{
   const button=$('export');button.disabled=true;button.textContent='저장 중…';
   setTimeout(()=>{
     // A larger world needs one bounded export surface, not two full-size copies
     // or a resize of the visible board. All diagram elements are still drawn.
     const scale=Math.min(1,Math.sqrt(64*1024*1024/(world.w*world.h))),surface=document.createElement('canvas');
     surface.width=Math.ceil(world.w*scale);surface.height=Math.ceil(world.h*scale);
     const screenContext=ctx,originalCamera={...cam};
     try{
       ctx=surface.getContext('2d');cam={x:-world.x*scale,y:0,s:scale};exporting=true;
       ctx.setTransform(scale,0,0,scale,-world.x*scale,0);ctx.fillStyle=C.paper;ctx.fillRect(world.x,0,world.w,world.h);drawScene();
     }finally{ctx=screenContext;cam=originalCamera;exporting=false;invalidateScene();requestDraw();}
     surface.toBlob(blob=>{
       if(blob){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=state.parameter+'-canvas.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
       button.disabled=false;button.textContent='PNG 저장';surface.width=surface.height=1;
     },'image/png');
   },30);
 });
