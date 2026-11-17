// FIPS 205 §4.2: serialize logical addresses in big-endian order. SHA2 selects
// byte 3, bytes 8..15, byte 19 and bytes 20..31; it does not hash a 32 B ADRS.
function operationAddress(id,invocation=null){
  if(['PRF_msg','H_msg'].includes(id))return null;
  const clamp=(v,max,fallback)=>Number.isInteger(v)?Math.max(0,Math.min(max,v)):fallback;
  const exact=invocation?.id===id&&(['T_len','T_k'].includes(id)||Number.isInteger(invocation.chain)||Number.isInteger(invocation.height)||Number.isInteger(invocation.forsTree));
  const forest=['PRF','F','H','T_k'].includes(id)&&(invocation?.group==='fors'||id==='T_k');
  const layer=forest?0:clamp(invocation?.layer,p.d-1,state.layer),tree=addr(layer),keypair=forest?state.digits[0]:clamp(invocation?.keypair,2**p.hp-1,state.digits[layer]);
  const chain=clamp(invocation?.chain,2*p.n+2,state.wotsChain);
  const step=clamp(invocation?.from,14,execution.mode==='verify'&&!geo.wots.illustrative?Math.min(14,geo.wots.digits[chain]):0);
  const fi=clamp(invocation?.forsTree,p.k-1,state.forsTree),leaf=clamp(invocation?.forsLeaf,2**p.a-1,geo.fors.trees[fi].index);
  let type,tail,location,height=null,index=null,used=currentOpModels[id]?.used!==false;
  const word=(name,value,offset,bytes=4,meaning='')=>({name,value:String(value),offset,bytes,meaning});
  if(forest){
    if(id==='T_k'){
      type=4;tail=[word('Key pair',keypair,20,4,'L0 WOTS+ 키쌍 / FORS 키'),word('Padding',0,24,8,'미사용 필드 · 0으로 초기화')];
      location='FORS · '+p.k+'개 root → FORS pk';
    }else{
      height=id==='H'?clamp(invocation?.height,p.a,1):0;height=id==='H'?Math.max(1,height):0;
      index=fi*2**(p.a-height)+(id==='H'?clamp(invocation?.forsNodeIndex,2**(p.a-height)-1,Math.floor(leaf/2**height)):leaf);type=id==='PRF'?6:3;
      tail=[word('Key pair',keypair,20,4,'L0 WOTS+ 키쌍 / FORS 키'),word('Tree height',height,24,4,id==='PRF'?'비밀값 생성 시 0':height===0?'잎 생성':'생성하는 부모 노드의 높이'),word('Tree index',index,28,4,'k개 FORS 트리를 이어서 센 전역 인덱스')];
      location='FORS tree '+fi+' · leaf '+leaf+(id==='H'?' · 부모 height '+height+' / index '+index:id==='PRF'?' · 비밀값 생성':' · 잎 생성');
    }
    used=used&&execution.mode!=='keygen';
    if(id==='H'&&execution.mode==='verify')used=used&&(index-fi*2**(p.a-height))===(leaf>>height);
  }else if(id==='H'){
    type=2;height=Math.max(1,clamp(invocation?.group==='xmss'?invocation.height:null,p.hp,1));
    index=clamp(invocation?.group==='xmss'?invocation.index:null,2**(p.hp-height)-1,keypair>>height);
    tail=[word('Padding',0,20,4,'TREE 형식에서는 키쌍 필드를 사용하지 않음'),word('Tree height',height,24,4,'생성하는 부모 노드의 높이 · 잎은 0'),word('Tree index',index,28,4,'해당 높이에서 부모 노드의 인덱스')];
    location='XMSS · 부모 height '+height+' / index '+index;
    if(execution.mode==='verify')used=index===(keypair>>height);
  }else if(id==='T_len'){
    type=1;tail=[word('Key pair',keypair,20,4,'XMSS 안의 WOTS+ 키쌍 인덱스'),word('Padding',0,24,8,'미사용 필드 · 0으로 초기화')];
    location='WOTS+ · '+(2*p.n+3)+'개 체인 끝값 → pk';
  }else{
    type=id==='PRF'?5:0;
    tail=[word('Key pair',keypair,20,4,'XMSS 안의 WOTS+ 키쌍 인덱스'),word('Chain',chain,24,4,chain<2*p.n?'메시지용 체인':'체크섬용 체인'),word('Hash',id==='PRF'?0:step,28,4,id==='PRF'?'비밀값 생성 시 0':'F 입력 X의 단계 인덱스')];
    location='WOTS+ · chain '+chain+(id==='PRF'?' · sk['+chain+'] 생성':' · X'+step+' → F → X'+(step+1));
    if(id==='F'&&execution.mode==='verify'&&!geo.wots.illustrative)used=step>=geo.wots.digits[chain];
  }
  const typeNames=['WOTS_HASH','WOTS_PK','TREE','FORS_TREE','FORS_ROOTS','WOTS_PRF','FORS_PRF'];
  const fields=[word('Layer',layer,0,4,'Hypertree 계층 · 최하위 L0'),word('Tree',tree,4,12,'해당 계층의 XMSS 트리 인덱스'),word('Type',type,16,4,'함수 용도에 따른 도메인 구분'),...tail];
  const bytes=new Uint8Array(32);
  for(const field of fields){let v=BigInt(field.value);for(let j=field.offset+field.bytes-1;j>=field.offset;j--){bytes[j]=Number(v&255n);v>>=8n;}}
  const hex=values=>Array.from(values,b=>b.toString(16).padStart(2,'0')).join('');
  const compressed=state.parameter.includes('SHA2'),indices=compressed?[3,8,9,10,11,12,13,14,15,19,...Array.from({length:12},(_,i)=>20+i)]:Array.from({length:32},(_,i)=>i);
  for(const field of fields){
    field.hex=hex(bytes.slice(field.offset,field.offset+field.bytes));
    field.kept=indices.filter(i=>i>=field.offset&&i<field.offset+field.bytes);
  }
  const prefix=compressed?(p.n!==16&&['H','T_len','T_k'].includes(id)?128:64):p.n;
  const known=execution.mode==='keygen'?!forest:!!execution.trace?.digest;
  return {id,type,typeName:typeNames[type],layer,tree:String(tree),keypair,chain,step,height,index,forest,forsTree:fi,leaf,
    exact,used,known,status:known?(execution.mode==='keygen'?'KeyGen · 주소는 내부 카운터로 결정':'계산 결과의 위치 반영'):'구조 미리보기 · 실행 후 실제 위치 반영',
    location:'L'+layer+' · tree 0x'+tree.toString(16)+' · '+location,fields,bytes:Array.from(bytes),hex:hex(bytes),
    compressed,indices,encoded:indices.map(i=>bytes[i]),encodedHex:hex(indices.map(i=>bytes[i])),prefix,
    inputOffset:prefix,inputEnd:prefix+indices.length};
}
