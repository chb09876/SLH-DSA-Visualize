const READING_SCALE=.5;
function fitRegion(name='all'){
  if(name==='read'){
    cam.s=READING_SCALE;cam.x=28-world.x*READING_SCALE;cam.y=24;
  }else{
    const r=regions[name]||regions.all,pad=32;
    const scale=name==='all'?Math.min((cssW-pad*2)/r.w,(cssH-pad*2)/r.h):READING_SCALE;
    cam.s=Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,scale));
    cam.x=cssW/2-(r.x+r.w/2)*cam.s;cam.y=cssH/2-(r.y+r.h/2)*cam.s;
    if(name!=='all'){
      if(r.w*cam.s>cssW-80)cam.x=40-r.x*cam.s;
      if(r.h*cam.s>cssH-80)cam.y=(['ht','fors'].includes(name)?96:40)-r.y*cam.s;
    }
  }
  viewMode=name;$('focus').value=name;
  document.querySelectorAll('[data-focus]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.focus===name)));
  requestDraw();
}
function updateNavigator(){
  const mini=$('navigator');if(!mini)return;
  const c=mini.getContext('2d'),w=200,h=124,s=w/world.w,sy=h/world.h;
  c.clearRect(0,0,w,h);c.fillStyle='#f7f9fc';c.fillRect(0,0,w,h);
  c.font='10px system-ui';c.textAlign='center';c.textBaseline='middle';
  for(const [id,title] of [['wots','WOTS+'],['xmss','XMSS'],['ht','HT'],['fors','FORS'],['message','입력'],['signature','출력']]){
    const r=regions[id];c.fillStyle='#e7edf5';c.fillRect((r.x-world.x)*s,r.y*sy,r.w*s-2,r.h*sy-2);
    c.fillStyle='#54647a';c.fillText(title,(r.x-world.x+r.w/2)*s,(r.y+r.h/2)*sy);
  }
  c.fillStyle='#245cd41a';c.strokeStyle='#245cd4';c.lineWidth=1.5;
  c.fillRect((-cam.x/cam.s-world.x)*s,-cam.y/cam.s*sy,cssW/cam.s*s,cssH/cam.s*sy);
  c.strokeRect((-cam.x/cam.s-world.x)*s,-cam.y/cam.s*sy,cssW/cam.s*s,cssH/cam.s*sy);
}
