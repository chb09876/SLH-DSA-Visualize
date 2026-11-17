let currentOpModels={},operationBoxes=[];
function operationModels(){
  const n=p.n,len=2*n+3,cfg=window.slhApp?.config||{},shake=state.parameter.includes('SHAKE'),wide=n!==16;
  const fmt=x=>x===null?'가변':x.toLocaleString()+' B';
  const read=(id,enc)=>{const s=$(id).value;if(enc!=='hex')return new TextEncoder().encode(s).length;const h=s.trim().replace(/^0x/i,'').replace(/\s/g,'');return /^[a-f\d]*$/i.test(h)&&h.length%2===0?h.length/2:null;};
  const msg=read('message',cfg.messageEncoding),contextBytes=read('context',cfg.contextEncoding),ph=['SHA-256','SHAKE128'].includes(cfg.prehash)?32:64;
  const mp=msg===null||contextBytes===null?null:2+contextBytes+(cfg.format==='hash'?11+ph:msg);
  const models={};
  for(const [id,payload,where] of [
    ['PRF',n,'WOTS+ 체인 시작값 / FORS 비밀값 생성'],['F',n,'WOTS+ 체인 한 단계 / FORS 잎 생성'],
    ['H',2*n,'XMSS / FORS에서 자식 두 개를 부모로 결합'],['T_len',len*n,'WOTS+ 끝값 '+len+'개 → 공개키 = XMSS 잎'],['T_k',p.k*n,'FORS root '+p.k+'개 → FORS pk = L0 WOTS+ 입력']]){
    const large=['H','T_len','T_k'].includes(id)&&wide,seed=shake?n:large?128:64;
    const parts=shake?[['PK.seed',n],['ADRS',32],['payload',payload]]:
      [['PK.seed',n],['0 채움',seed-n],['ADRSᶜ',22],['payload',payload]];
    const raw=parts.reduce((a,s)=>a+s[1],0),core=shake?'SHAKE256':large?'SHA-512':'SHA-256';
    models[id]={id,where,payload,output:n,core,parts,raw,used:id==='PRF'?execution.mode!=='verify':id==='T_k'?execution.mode!=='keygen':true,
      detail:shake?'흡수 블록 136 B × '+(Math.floor(raw/136)+1)+'개 · 구분자·패딩 포함':
        '전체 '+Math.ceil((raw+(large?17:9))/(large?128:64))+'블록 → digest '+(large?64:32)+' B → 앞 n B',
      note:shake?'표시한 IN은 SHAKE 패딩 전 길이입니다.':'PK.seed + 0 채움은 첫 해시 블록입니다. 이 상태를 캐시해 반복 호출에서 재사용할 수 있습니다.'};
  }
  const v=wide?64:32,sha=wide?'SHA-512':'SHA-256';
  models.PRF_msg={id:'PRF_msg',where:'Sign에서 서명 랜덤화 값 R 생성',output:n,payload:mp===null?null:n+mp,used:execution.mode==='sign',
    core:shake?'SHAKE256':'HMAC-'+sha,raw:mp===null?null:(shake?2*n:n)+mp,
    parts:shake?[['SK.prf',n],['opt_rand',n],['M′',mp]]:[['opt_rand',n],['M′',mp]],
    detail:shake?'출력 R = '+n+' B':'HMAC 키 SK.prf = '+n+' B · digest '+v+' B → 앞 n B',
    note:'opt_rand는 deterministic이면 PK.seed, hedged이면 추가 난수입니다. '+(shake?'':'IN은 HMAC data 길이이며 키·ipad·opad 처리는 별도입니다.')};
  models.H_msg={id:'H_msg',where:'Sign / Verify에서 FORS 선택값과 Hypertree 주소 추출',output:p.m,payload:mp,used:execution.mode!=='keygen',
    core:shake?'SHAKE256':sha+' + MGF1-'+sha,raw:mp===null?null:3*n+mp,
    parts:[['R',n],['PK.seed',n],['PK.root',n],['M′',mp]],
    detail:shake?'digest '+p.m+' B':'첫 SHA 입력 → '+v+' B · MGF1 입력 '+(2*n+v+4)+' B × '+Math.ceil(p.m/v)+'회',
    note:'md '+Math.ceil(p.k*p.a/8)+' B ('+p.k*p.a+' bit) · idx_tree '+Math.ceil((p.h-p.hp)/8)+' B ('+(p.h-p.hp)+' bit) · idx_leaf '+Math.ceil(p.hp/8)+' B ('+p.hp+' bit). '+(shake?'':'MGF1에는 R ‖ PK.seed ‖ inner digest ‖ 4 B counter를 넣고 앞 m B를 사용합니다.')};
  if(shake)for(const model of Object.values(models)){
    const count=model.raw===null?null:Math.floor(model.raw/136)+1;
    model.detail=count===null?'absorb 횟수 미정 · 입력 길이 확정 후 계산':'absorb '+count.toLocaleString()+'회 · 136 B × '+count.toLocaleString()+'블록 (구분자·패딩 포함)';
  }
  return models;
}
function operationHit(id,x,y,w,h,group){
  const model=currentOpModels[id];if(!model.used)return;
  const hit={type:'operation',operation:id,id,x,y,w,h,group,payload:model.payload,output:model.output};
  operationBoxes.push(hit);geo.operations.push(hit);
}
function opBadge(id,x,y,w,group,caption,h=76,fontOverride=null,module=group,interactive=true){
  const model=currentOpModels[id],active=execution.activeModules;
  const font=state.fontSize||14,title=caption||id+' · '+model.payload+' → '+model.output+' B';
  if(!((id==='F'&&group==='wots')||(id==='H'&&group==='xmss')||(['H','F'].includes(id)&&h<=32)))labelBlockers.push({x:x*cam.s+cam.x,y:y*cam.s+cam.y,w:w*cam.s,h:h*cam.s});
  ctx.save();if(!model.used)ctx.globalAlpha*=.18;else if(active&&!active.includes(module))ctx.globalAlpha*=.3;
  ctx.fillStyle='#edf7f5';ctx.strokeStyle='#177d72';ctx.lineWidth=Math.max(2,screenStroke(1));
  ctx.beginPath();ctx.roundRect(x,y,w,h,10);ctx.fill();ctx.stroke();
  label(title,x+w/2,h>160&&caption===id?y+h/2+18:y+h*.67,fontOverride??(['F','PRF'].includes(id)&&h<=18?13:caption===id&&id.length<=3?49:Math.min(49,w/12.5)),{align:'center',color:'#12695f',fixed:true});
  ctx.restore();if(interactive)operationHit(id,x,y,w,h,group);
}
function annotateOperations(){
  geo.operations=[];operationBoxes=[];currentOpModels=operationModels();
  for(const f of geo.wotsFs){
    const y=f.y+f.h/2;
    const half=f.expanded?35:19;
    ctx.save();if(!f.used)ctx.globalAlpha*=.15;
    line(wotsChainX(f.from)+half,y,f.x-5,y,C.blue,2,[],true);
    line(f.x+f.w+4,y,wotsChainX(f.to)-half-5,y,C.blue,2,[],true);
    opBadge('F',f.x,f.y,f.w,'wots','F',f.h);
    Object.assign(geo.operations.at(-1),{chain:f.chain,from:f.from,to:f.to,used:f.used});ctx.restore();
  }
  for(const prf of geo.wotsPrfs){
    opBadge('PRF',prf.x,prf.y,prf.w,'wots','PRF',prf.h);
    Object.assign(geo.operations.at(-1),{chain:prf.chain,layer:state.layer,keypair:state.digits[state.layer]});
  }
  const t=geo.wotsXmssLink.compression;
  opBadge('T_len',t.x,t.y,t.w,'wots','T_len',t.h);
  for(const h of geo.xmssHashes){
    ctx.save();if(!h.used)ctx.globalAlpha*=.15;else if(!h.active)ctx.globalAlpha*=.5;
    opBadge('H',h.x,h.y,h.w,'xmss','H',h.h,Math.min(36,h.w*.7,h.h*.85));
    Object.assign(geo.operations.at(-1),{parent:h.parent,children:h.children,height:h.height,index:h.index,used:h.used});
    ctx.restore();
  }
  for(const h of geo.overviewHashes){
    ctx.save();if(!h.used)ctx.globalAlpha*=.2;else if(!h.active)ctx.globalAlpha*=.55;
    opBadge('H',h.x,h.y,h.w,h.group,'H',h.h,h.h*.78,h.module,!h.placeholder);
    if(!h.placeholder)Object.assign(geo.operations.at(-1),{layer:h.layer,height:h.height,index:h.index,forsTree:h.forsTree,forsNodeIndex:h.forsNodeIndex,used:h.used,view:'overview'});
    ctx.restore();
  }
  for(const f of geo.overviewLeafFs){
    ctx.save();if(!f.used)ctx.globalAlpha*=.2;
    opBadge('F',f.x,f.y,f.w,'fors','F',f.h,24);
    Object.assign(geo.operations.at(-1),{forsTree:f.forsTree,forsLeaf:f.forsLeaf,used:f.used,view:'overview'});ctx.restore();
  }
  // Annotate the existing FORS compression block and the detailed leaf F box.
  const tk=geo.forsLayout.compression;opBadge('T_k',tk.x,tk.y,tk.w,'fors',null,tk.h);
  const leafF=geo.forsDetailLeafF;opBadge('F',leafF.x,leafF.y,leafF.w,'fors','F',leafF.h);
  Object.assign(geo.operations.at(-1),{forsTree:state.forsTree});
  for(const h of geo.forsDetailHashes){
    opBadge('H',h.x,h.y,h.w,'fors','H',h.h,36);
    Object.assign(geo.operations.at(-1),{forsTree:state.forsTree,height:h.height});
  }
  ctx.save();if(execution.mode==='keygen')ctx.globalAlpha*=.2;
  const opsY=geo.forsLayout.detail.y+p.a*geo.forsLayout.detail.pitch+520;
  const opsX=geo.forsLayout.detail.headingX;label('FORS 연산',opsX,opsY,65);
  ctx.restore();
  opBadge('F',opsX,opsY+70,1500,'fors');opBadge('H',opsX,opsY+190,1500,'fors');opBadge('T_k',opsX,opsY+310,1500,'fors');
  if(execution.mode!=='keygen'){
    const message=geo.messageLayout;
    if(execution.mode!=='verify')opBadge('PRF_msg',message.prf.x,message.prf.y,message.prf.w,'message','PRF_msg → R '+p.n+' B',message.prf.h);
    opBadge('H_msg',message.hash.x,message.hash.y,message.hash.w,'message','H_msg → '+p.m+' B',message.hash.h);
  }
  hitboxes=operationBoxes.reverse().concat(hitboxes);
}
