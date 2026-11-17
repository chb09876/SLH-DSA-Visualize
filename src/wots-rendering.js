function drawUniformWots(){
  const len=2*p.n+3,model=geo.wots,showSignature=execution.mode!=='keygen'&&!model.illustrative;
  heading('WOTS+',len+(execution.mode==='keygen'?' CHAINS · w = 16 · 15 × F':' CHAINS'),180,245);
  text(execution.mode==='keygen'?'KeyGen: SK에서 체인 끝값을 계산해 공개키 생성':model.illustrative?'실행 후 서명 위치 표시':'실제 계산값 · 니블로 위치 결정',180,375,execution.mode==='keygen'?33:28,{color:C.muted});
  if(execution.mode!=='keygen')text('w = 16 · 체인당 최대 15 × F',180,425,26,{color:C.muted});
  initWotsLayout(len);geo.wotsRows=[];geo.wotsStarts=geo.wotsChainLayout.starts;geo.wotsValues=[];
  geo.wotsDigitRows=[];geo.wotsMessage=null;
  if(execution.mode!=='keygen'){
    const card={x:700,y:170,w:2700,h:270},known=!model.illustrative;
    box(card.x,card.y,card.w,card.h,'active',12);
    label('WOTS+ 서명 입력 · L'+state.layer+' · '+model.messageSource+' · '+p.n+' B',735,230,36);
    text(known?'HEX  '+model.messageHex.toUpperCase():'실행 후 실제 WOTS+ 입력 HEX 표시',735,295,p.n===32?30:34,{color:C.blue});
    const cs=known?model.checksum.toString(16).toUpperCase().padStart(3,'0'):'???';
    text('체크섬 Σ(15 − m[i]) = 0x'+cs+'  →  C0='+cs[0]+' · C1='+cs[1]+' · C2='+cs[2],735,355,28,{color:C.orange});
    text('chain 0 ← 첫 니블 · C0~C2 ← 체크섬 니블',735,405,26,{color:C.muted});
    const header={x:-640,y:450,w:560,h:50};
    box(header.x,header.y,header.w,header.h,'neutral',8);text('니블 → b[i] → 서명 위치',-360,485,28,{align:'center'});
    const points=[[card.x,card.y],[-360,card.y],[-360,header.y]];path(points,C.ink,3,[8,6],true);
    geo.wotsMessage={...card,layer:state.layer,source:model.messageSource,bytes:p.n,hex:known?model.messageHex:null,checksum:known?model.checksum:null,checksumDigits:known?model.checksumDigits:null,control:{points,target:'signature-position'}};
  }
  for(let i=0;i<len;i++){
    const y=wotsChainY(i),b=model.digits[i];
    if(execution.mode!=='keygen'){
      const known=!model.illustrative,checksum=i>=2*p.n,source=checksum?'C'+(i-2*p.n):'m['+i+']',digit=known?b.toString(16).toUpperCase():'?',h=Math.min(30,geo.wotsChainLayout.gap*.88),font=Math.min(26,geo.wotsChainLayout.gap*.78),r={x:-640,y:y-h/2,w:560,h};
      box(r.x,r.y,r.w,r.h,checksum?'auth':'neutral',3);
      text(source+'  '+digit+' → b='+(known?b:'?')+' → X'+(known?b:'?'),r.x+16,y+font*.34,font,{color:checksum?C.orange:C.ink});
      geo.wotsDigitRows.push({...r,chain:i,source,digit:known?b:null,checksum,node:{kind:'wotsSignature',layer:state.layer,chain:i}});
    }
    if(i%4===0||i>=2*p.n)text(i<2*p.n?i:'C'+(i-2*p.n),50,y+7,30,{align:'right',color:i<2*p.n?C.muted:C.orange});
    if(i===2*p.n)line(315,y-20,3425,y-20,C.orange,2,[8,7]);
    for(let j=0;j<16;j++){
      const x=wotsChainX(j),used=execution.mode!=='verify'||!showSignature||!!model.signatureElements[i].hashes[j];
      ctx.save();if(!used)ctx.globalAlpha*=.22;
      box(x-19,y-9,38,18,showSignature&&j===b?'auth':j===15||execution.mode==='keygen'&&j===0?'active':'neutral',1);
      text(j,x,y+5,13,{align:'center'});ctx.restore();
      geo.wotsValues.push({x:x-19,y:y-9,w:38,h:18,node:{kind:'wots',layer:state.layer,chain:i,step:j}});
    }
    if(showSignature){
      box(75,y-9,150,18,'auth',1);text('X['+i+','+b+']',150,y+5,13,{align:'center',color:C.orange});
      geo.wotsValues.push({x:75,y:y-9,w:150,h:18,node:{kind:'wotsSignature',layer:state.layer,chain:i}});
    }
    line(wotsChainX(15)+22,y,1470+WOTS_EXPAND,y,C.line,2);
    geo.wotsRows.push({chain:i,selectedSteps:showSignature?[b]:[],element:model.signatureElements[i].symbol,signatureOffset:i*p.n});
  }
  if(showSignature)label('SIG',150,495,49,{align:'center',color:C.orange});
  text('i',50,495,32,{align:'center',color:C.muted});
  if(execution.mode!=='verify')label('PRF',400,540,40,{align:'center',color:'#12695f'});
  for(const j of [0,5,10,15])label(j===0?'X₀':'X'+j,wotsChainX(j),540,j===0?40:49,{align:'center'});
  text(p.n+' B',wotsChainX(0),605,28,{align:'center',color:C.muted});
  if(showSignature){label('SIG_WOTS · '+len*p.n+' B',70,2260,42,{color:C.orange});text(len+' × '+p.n+' B',70,2325,34,{color:C.orange});}
  wotsToXmss();if(execution.mode==='sign')signWotsPrf();else if(execution.mode==='verify'){
    drawVerifyInputs();
    if(!showSignature)for(let i=0;i<len;i++)geo.wotsValues.push({x:75,y:wotsChainY(i)-9,w:150,h:18,node:{kind:'wotsSignature',layer:state.layer,chain:i}});
  }
  text('X 값 / SIG 블록 클릭 → 값 확인 · F 클릭 → 연산 입력 / ADRS 확인',180,2550,36,{color:C.muted});
}
function inspectWotsValue(request){
  const layer=request.layer??state.layer,chain=request.chain,t=execution.trace,l=t?.layers?.[layer],signature=request.kind==='wotsSignature';
  if(layer<0||layer>=p.d||chain<0||chain>=2*p.n+3||(!signature&&(request.step<0||request.step>15)))return {kind:'wots',title:'WOTS+ 선택 갱신 필요',bytes:p.n,status:'파라미터 변경',description:'현재 파라미터의 WOTS+ 값 블록을 다시 선택하세요.',hex:null,inputs:[]};
  let digit=null,digitSource=null;
  if(l?.message){const digits=l.message.split('').map(x=>parseInt(x,16)),sum=digits.reduce((s,v)=>s+15-v,0);digit=[...digits,(sum>>8)&15,(sum>>4)&15,sum&15][chain];digitSource=chain<2*p.n?'서명 입력의 메시지 니블 m['+chain+']':'체크섬 니블 C'+(chain-2*p.n);}
  const step=signature?digit:request.step,keypair=state.digits[layer],hashes=l?.chains?.[chain]||{};
  let value=signature?l?.signature?.slice(chain*p.n*2,(chain+1)*p.n*2):hashes[step];
  if(execution.mode==='keygen'&&l?.chainLeaf!==undefined&&l.chainLeaf!==keypair)value=null;
  const signed=digit!==null&&step===digit,tree=addr(layer).toString(),role=signature?'서명 블록 SIG_WOTS['+chain+']':step===0?'시작값 sk['+chain+']':step===15?'체인 끝값 X15':'중간값 X'+step;
  let description=signature?'SIG_WOTS 내부 ['+chain*p.n+':'+(chain+1)*p.n+')의 '+p.n+' B 블록입니다.':step===0?'PRF가 SK.seed와 이 체인의 ADRS로 생성한 '+p.n+' B 시작값입니다.':'F가 X'+(step-1)+'을 해싱해 만든 '+p.n+' B 출력입니다.';
  if(digit!==null)description+=' '+digitSource+' = 0x'+digit.toString(16).toUpperCase()+' ('+digit+')이므로 b='+digit+'입니다. '+(signed?'현재 값이':'X'+digit+'이')+' SIG_WOTS['+chain+']에 포함됩니다.';
  if(step===15&&!signature)description+=' 모든 체인의 X15를 모아 T_len에 넣습니다.';
  const operation=step===null?null:step===0?'PRF':'F';
  const unavailable=execution.busy?'계산 진행 중 · 완료 후 값 표시':!t?'구조 미리보기 · 실행하면 값 표시':execution.mode==='verify'&&digit!==null&&step<digit?'Verify는 서명에서 받은 X'+digit+'부터 계산하므로 이 값은 없습니다.':'현재 실행에서 값이 기록되지 않았습니다.';
  return {kind:'wots',title:'WOTS+ · chain '+chain+' · '+role,location:'L'+layer+' · tree 0x'+BigInt(tree).toString(16)+' · keypair '+keypair+' · chain '+chain+' · '+(step===null?'서명 위치 미계산':'X'+step),bytes:p.n,hex:value||null,
    status:value?(execution.mode==='verify'&&signed?'입력 SIG_WOTS에서 읽음':signature?'실제 서명에 포함된 값':'실제 계산값'):unavailable,description,operation,
    invocation:operation?{id:operation,group:'wots',layer,keypair,chain,from:Math.max(0,step-1)}:null,
    inputTitle:'F 입력 · X'+(step-1),inputs:step>0?[{label:'X'+(step-1),bytes:p.n,hex:hashes[step-1]||null}]:[]};
}
function inspectWotsMessage(request){
  const layer=request.layer??state.layer,hex=execution.trace?.layers?.[layer]?.message||null,source=layer===0?'FORS pk':'L'+(layer-1)+' XMSS root';
  const digits=hex?hex.split('').map(x=>parseInt(x,16)):null,checksum=digits?.reduce((sum,v)=>sum+15-v,0)??null;
  return {kind:'wotsMessage',title:'WOTS+ 서명 입력 · L'+layer,location:source+' · '+p.n+' B',bytes:p.n,hex,status:hex?'실제 WOTS+ 서명에 사용한 값':'구조 미리보기 · 실행 후 값 표시',
    description:'이 값의 각 바이트를 상위 니블부터 4 bit씩 분해해 '+2*p.n+'개 체인의 b[i]를 정합니다. 뒤의 3개 체인은 Σ(15 − m[i])의 체크섬 니블을 사용합니다. 이 값이 PRF나 F의 체인 데이터 입력으로 들어가는 것은 아닙니다.',
    digitContext:digits?{digits:hex.toUpperCase(),checksum,checksumDigits:checksum.toString(16).toUpperCase().padStart(3,'0'),len1:2*p.n,len:2*p.n+3}:null,inputs:[]};
}
