const SOURCE_BLUE='#245cd4',CONTROL_PURPLE='#8056b8';
function sourceRecord(kind,name,x,y,w,h,extra={}){
  geo.provenance.push({kind,name,x:x+drawOffsetX,y,w,h,...extra});
}
function externalPort(x,y,w,h,title,sub,output=false){
  ctx.save();ctx.fillStyle='#edf3ff';ctx.strokeStyle=SOURCE_BLUE;ctx.lineWidth=Math.max(3,screenStroke(1.3));
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w-28,y);ctx.lineTo(x+w,y+h/2);ctx.lineTo(x+w-28,y+h);ctx.lineTo(x,y+h);ctx.closePath();ctx.fill();ctx.stroke();
  text(output?'OUT':'IN',x+16,y+29,22,{weight:600,color:SOURCE_BLUE});
  label(title,x+w/2,y+h*.48,49,{align:'center',color:SOURCE_BLUE});
  text(sub,x+w/2,y+h*.79,29,{align:'center',color:'#486589'});ctx.restore();
  sourceRecord(output?'output':'external',title,x,y,w,h);
}
function keyField(x,y,w,h,title,sub,origin){
  ctx.save();ctx.fillStyle='#f1f5f9';ctx.strokeStyle='#91a8bd';ctx.lineWidth=Math.max(2,screenStroke(.9));
  ctx.beginPath();ctx.roundRect(x,y,w,h,7);ctx.fill();ctx.stroke();
  ctx.fillStyle='#91a8bd';ctx.fillRect(x,y,9,h);
  label(title,x+w/2,y+h*.45,44,{align:'center'});
  text(sub,x+w/2,y+h*.79,27,{align:'center',color:'#61758b'});ctx.restore();
  sourceRecord('field',title,x,y,w,h,{origin});
}
function fieldFile(x,y,w,h,title,fields,origin){
  box(x,y,w,h,'neutral',10);label(title,x+w/2,y+64,44,{align:'center',color:'#4c667d'});
  const rowH=(h-100)/fields.length,ports={};
  fields.forEach(([name,bytes,offset],i)=>{
    const yy=y+100+i*rowH;
    ctx.save();ctx.fillStyle='#f1f5f9';ctx.fillRect(x+8,yy,w-16,rowH-5);ctx.restore();
    label(name,x+30,yy+rowH*.43,38);text(bytes.toLocaleString()+' B',x+w-25,yy+rowH*.43,31,{align:'right'});
    text(origin+'['+offset+':'+(offset+bytes)+']',x+30,yy+rowH*.79,24,{color:C.muted});
    ports[name]={x:x+w,y:yy+rowH/2};sourceRecord('field',name,x+8,yy,w-16,rowH-5,{origin,bytes,offset});
  });return ports;
}
function controlPath(points){path(points,CONTROL_PURPLE,3,[9,7],true);}
function drawWotsPrfInputs(sources){
  const last=geo.wotsStarts.at(-1).y;
  geo.wotsSeedBuses=[
    {name:'SK.seed',x:245,top:520,offset:-3,source:sources['SK.seed'],rail:-760},
    {name:'PK.seed',x:285,top:580,offset:3,source:sources['PK.seed'],rail:-720}
  ];
  for(const bus of geo.wotsSeedBuses){
    const s=bus.source;
    path([[s.x+12,s.y],[bus.rail,s.y],[bus.rail,bus.top],[bus.x,bus.top],[bus.x,last+bus.offset]],SOURCE_BLUE,3);
    for(const prf of geo.wotsPrfs){
      const y=prf.y+prf.h/2+bus.offset;
      line(bus.x,y,prf.x-4,y,SOURCE_BLUE,2);
      ctx.save();ctx.fillStyle=SOURCE_BLUE;ctx.beginPath();ctx.arc(bus.x,y,3,0,Math.PI*2);ctx.fill();ctx.restore();
    }
  }
  for(const prf of geo.wotsPrfs){
    const y=prf.y+prf.h/2;
    line(prf.x+prf.w+4,y,wotsChainX(0)-24,y,C.blue,2,[],true);
  }
}
function drawKeygenInputs(){
  heading('KeyGen · 입력','외부 시드 → PRF → 체인 시작값',-1300,245);
  externalPort(-1300,650,520,160,'SK.seed · '+p.n+' B','외부 입력 / 외부 RBG');
  externalPort(-1300,950,520,160,'PK.seed · '+p.n+' B','외부 입력 / 외부 RBG');
  externalPort(-1300,1350,520,160,'SK.prf · '+p.n+' B','외부 입력 / 외부 RBG');
  drawWotsPrfInputs({'SK.seed':{x:-780,y:730},'PK.seed':{x:-780,y:1030}});
  text('키에 보관 → Sign의 PRF_msg에서 사용',-1300,1590,31,{color:C.muted});
  text('최상위 계층 / tree 0 고정 · 나머지는 내부 카운터',-1300,1830,30,{color:CONTROL_PURPLE});
  text('SK = SK.seed ‖ SK.prf ‖ PK.seed ‖ PK.root',-1300,2070,35);
  text('키 출력: SK '+4*p.n+' B · PK '+2*p.n+' B',-1300,2170,36,{color:C.muted});
  geo.keygenInput={x:-1300,y:650,prfs:geo.wotsPrfs};
}
function drawSignKeyInputs(){
  heading('Sign · 키 입력','외부 SK → 내부 필드 분리',-1300,245);
  externalPort(-1300,450,520,160,'SK · '+4*p.n+' B','외부 키 입력');
  line(-1040,630,-1040,730,SOURCE_BLUE,4,[],true);
  const f=fieldFile(-1300,750,520,680,'SK 필드 분리',[
    ['SK.seed',p.n,0],['SK.prf',p.n,p.n],['PK.seed',p.n,2*p.n],['PK.root',p.n,3*p.n]],'SK');
  drawWotsPrfInputs(f);
}
function drawVerifyInputs(){
  heading('Verify · 입력','외부 PK / SIG → 필드 분리',-1300,245);
  externalPort(-1300,450,520,160,'PK · '+2*p.n+' B','외부 공개키 입력');line(-1040,630,-1040,730,SOURCE_BLUE,4,[],true);
  fieldFile(-1300,750,520,400,'PK 필드 분리',[['PK.seed',p.n,0],['PK.root',p.n,p.n]],'PK');
  const len=2*p.n+3,fs=p.k*(p.a+1)*p.n,ht=p.d*(len+p.hp)*p.n;
  externalPort(-1300,1400,520,160,'SIG · '+(p.n+fs+ht).toLocaleString()+' B','외부 서명 입력');line(-1040,1580,-1040,1690,SOURCE_BLUE,4,[],true);
  const fields=fieldFile(-1300,1710,520,650,'SIG 필드 분리',[['R',p.n,0],['SIG_FORS',fs,p.n],['SIG_HT',ht,p.n+fs]],'SIG');
  keyField(-650,1700,520,160,'SIG_WOTS · '+len*p.n+' B','SIG_HT → L'+state.layer+'의 WOTS+ 서명','SIG_HT');
  path([[fields.SIG_HT.x+12,fields.SIG_HT.y],[-720,fields.SIG_HT.y],[-720,1780],[-670,1780]],C.blue,4,[],true);
  path([[-110,1780],[30,1780],[30,geo.wotsStarts[0].y]],SOURCE_BLUE,3);
  line(30,geo.wotsStarts[0].y,30,geo.wotsStarts.at(-1).y,SOURCE_BLUE,3);
  for(const start of geo.wotsStarts){
    line(30,start.y,70,start.y,SOURCE_BLUE,2,[],true);
    if(geo.wots.illustrative){
      box(75,start.y-9,150,18,'auth',2);
      text('SIG['+start.chain+']',150,start.y+5,13,{align:'center',color:C.orange});
    }
  }
}
function drawMessageProvenance(){
  const verify=execution.mode==='verify',cfg=window.slhApp?.config||{},models=operationModels(),g=geo.messageLayout;
  const {x:dx,y:dy}=g.offset;
  geo.messageWires=[];
  const wire=(id,signal,local)=>{const points=local.map(([x,y])=>[x+dx,y+dy]);geo.messageWires.push({id,signal,points});path(points,C.blue,4,[],true);};
  heading('메시지 → 랜덤화 → 해시','외부 입력 / 키 필드 / 내부 결과',180+dx,2810+dy);
  externalPort(180+dx,2930+dy,520,180,'M + ctx','외부 메시지 / ctx ≤255 B');
  drawMessageFormatter();
  wire('message-format','M',[[720,3020],[780,3020]]);
  wire('formatted-message','M′',[[1340,3020],[1430,3020],[1430,3400],[1580,3400]]);
  if(verify)keyField(g.prf.x,g.prf.y,g.prf.w,g.prf.h,'R · '+p.n+' B','SIG[0:'+p.n+']','SIG');
  else{
    block(g.prf.x,g.prf.y,g.prf.w,g.prf.h,'PRF_msg','', 'active');
    wire('formatted-randomizer','M′',[[1430,3020],[1430,2980],[1580,2980]]);
    keyField(2600+dx,2930+dy,600,160,'SK.prf · '+p.n+' B','SK에서 분리','SK');
    wire('randomizer-key','SK.prf',[[2580,3010],[2270,3010]]);
    if(cfg.randomness==='hedged')externalPort(2600+dx,3160+dy,600,140,'addrnd · '+p.n+' B','외부 난수 / 외부 RBG');
    else keyField(2600+dx,3160+dy,600,140,'opt_rand = PK.seed','SK에서 분리 · '+p.n+' B','SK');
    wire('optional-randomness','opt_rand',[[2580,3230],[2380,3230],[2380,3050],[2270,3050]]);
  }
  block(g.hash.x,g.hash.y,g.hash.w,g.hash.h,'H_msg','', 'active');
  wire('randomizer-output','R',[[1925,3105],[1925,3345]]);text('R · '+p.n+' B',1970+dx,3220+dy,36);
  keyField(2600+dx,3360+dy,600,160,'PK.seed / PK.root',(verify?'PK':'SK')+'에서 분리 · 각 '+p.n+' B',verify?'PK':'SK');
  wire('message-public-key','PK.seed / PK.root',[[2580,3440],[2270,3440]]);
  block(g.digest.x,g.digest.y,g.digest.w,g.digest.h,'digest · '+p.m+' B','md / idx_tree / idx_leaf','active');
  wire('message-hash-output','digest',[[1925,3535],[1925,3685]]);text(p.m+' B',1970+dx,3630+dy,34);
}
