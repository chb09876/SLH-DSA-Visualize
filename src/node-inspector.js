function registerTreeNode(x,y,r,node,rect=null){
  const radius=Math.max(r,4/cam.s),hit={type:'treeNode',node,x:rect?rect.x:x-radius,y:rect?rect.y:y-radius,w:rect?rect.w:2*radius,h:rect?rect.h:2*radius};
  geo.treeNodes.push(hit);hitboxes.push(hit);
}
function pickSceneHit(x,y){
  if(!geo.treeNodes)render();
  let nearest=null,distance=Infinity;
  for(const hit of geo.treeNodes){
    if(x<hit.x||x>hit.x+hit.w||y<hit.y||y>hit.y+hit.h)continue;
    const d=(x-hit.x-hit.w/2)**2+(y-hit.y-hit.h/2)**2;
    if(d<distance){nearest=hit;distance=d;}
  }
  return nearest||hitboxes.find(b=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h);
}
function collectTreeNodes(){
  geo.treeNodes=[];
  if(execution.mode!=='keygen'){const f=geo.messageLayout.format;registerTreeNode(f.x+f.w/2,f.y+f.h/2,0,{kind:'messagePrime'},f);}
  for(const v of geo.wotsValues)registerTreeNode(v.x+v.w/2,v.y+v.h/2,0,v.node,v);
  for(const r of geo.wotsDigitRows)registerTreeNode(r.x+r.w/2,r.y+r.h/2,0,r.node,r);
  if(geo.wotsMessage){const r=geo.wotsMessage;registerTreeNode(r.x+r.w/2,r.y+r.h/2,0,{kind:'wotsMessage',layer:r.layer},r);}
  for(const n of geo.xmssNodes){
    const height=p.hp-n.depth,r=Math.min(15,geo.treeW/2**n.depth*.23),selectedLeaf=height===0&&n.index===state.digits[state.layer];
    registerTreeNode(n.x,n.y,r,{kind:'xmss',layer:state.layer,height,index:n.index},selectedLeaf?geo.wotsXmssLink.leaf:null);
  }
  for(const tree of geo.forsOverview)for(const n of tree.nodes)registerTreeNode(n.x,n.y,geo.forsLayout.radius,{kind:'fors',forsTree:tree.tree,height:p.a-n.depth,index:n.index});
  for(const n of geo.forsDetailNodes)registerTreeNode(n.x,n.y,n.r,{kind:'fors',forsTree:state.forsTree,height:n.height,index:n.index});
  const pk=geo.forsLayout.pk;registerTreeNode(pk.x+pk.w/2,pk.y+pk.h/2,0,{kind:'forsPk'},pk);
  for(const h of geo.overviewHashes)if(h.placeholder)registerTreeNode(h.x+h.w/2,h.y+h.h/2,0,{kind:'placeholder',layer:h.layer},h);
  for(const link of geo.htWotsLinks){
    const a=link.pk,b=link.signer;
    registerTreeNode(a.x+a.w/2,a.y+a.h/2,0,{kind:'xmss',layer:link.layer,height:0,index:link.keypair,view:'hypertree'},a);
    registerTreeNode(b.x+b.w/2,b.y+b.h/2,0,{kind:'wotsLink',layer:link.layer},b);
  }
  for(let layer=0;layer<p.d;layer++){
    const y=geo.htTop+(p.d-1-layer)*geo.pitch;
    const mini=(cx,top,w,h,depth,node)=>{
      const drawH=p.hp>depth?h*.9:h;
      for(let d=0;d<=depth;d++)for(let i=0;i<2**d;i++)registerTreeNode(cx-w/2+w*(i+.5)/2**d,top+drawH*d/depth,node.kind==='placeholder'?geo.htPeerRadius:geo.htRadius,{...node,height:p.hp-d,index:i});
    };
    mini(geo.htX,y,geo.tw,geo.th,Math.min(p.hp,3),{kind:'xmss',layer,view:'hypertree'});
    registerTreeNode(geo.htX-geo.tw/2+geo.tw*(state.digits[layer]+.5)/2**p.hp,y+geo.th,geo.htRadius,{kind:'xmss',layer,height:0,index:state.digits[layer],view:'hypertree'});
    if(layer<p.d-1)for(const side of [-1,1])mini(geo.htX+side*geo.htPeerOffset,y+geo.th*.15,geo.tw*.57,geo.th*.66,Math.min(p.hp,2),{kind:'placeholder',layer});
  }
}
function inspectTreeNode(request){
  if(request.kind==='wotsMessage')return inspectWotsMessage(request);
  if(request.kind==='messagePrime')return messageFormatModel();
  if(request.kind==='wots'||request.kind==='wotsSignature')return inspectWotsValue(request);
  const t=execution.trace,kind=request.kind,layer=request.layer??state.layer,forest=kind==='fors',height=request.height,index=request.index;
  if(kind==='wotsLink'){
    const value=t?.layers?.[layer],message=value?.message||t?.layers?.[layer-1]?.root||null;
    return {kind,title:'L'+layer+' WOTS+ '+(execution.mode==='verify'?'검증':'서명'),location:'L'+layer+' · keypair '+state.digits[layer]+' · 서명 메시지 = L'+(layer-1)+' root',bytes:(2*p.n+3)*p.n,hex:value?.signature||null,valueLabel:'SIG_WOTS',status:value?.signature?(execution.mode==='verify'?'입력 SIG_HT에서 읽음':'실제 생성한 서명'):'구조 미리보기 · 실행 후 값 표시',description:'하위 XMSS root '+p.n+' B를 메시지로 사용합니다. 메시지 니블과 체크섬이 각 체인의 서명 위치를 정합니다. 상위 XMSS 잎은 이 키쌍의 별도 WOTS+ 공개키이며, 하위 root를 그대로 잎에 복사하지 않습니다.',inputTitle:'WOTS+ 서명 메시지',inputs:[{label:'L'+(layer-1)+' XMSS root',bytes:p.n,hex:message}]};
  }
  if(kind==='placeholder')return {kind,title:'Hypertree · 주변 트리 예시',bytes:p.n,status:'축약 표시',description:'주변 XMSS 트리의 존재를 나타내는 도형입니다. 특정 트리의 계산값을 나타내지는 않습니다.',hex:null,inputs:[]};
  if(kind==='forsPk')return {kind,title:'FORS · 공개키',location:'FORS root '+p.k+'개 → T_k → FORS pk',bytes:p.n,hex:t?.forsPk||null,status:t?.forsPk?'실제 계산값':'구조 미리보기 · 실행하면 값 표시',description:'FORS 트리의 루트 '+p.k+'개를 순서대로 압축한 값입니다. 최하위 L0 WOTS+가 이 값을 서명합니다.',operation:'T_k',invocation:{id:'T_k',group:'fors'},inputs:[]};
  const max=forest?p.a:p.hp,treeNumber=request.forsTree??state.forsTree;
  if(height<0||height>max||index<0||index>=2**(max-height)||layer>=p.d||treeNumber>=p.k)return {kind,title:'노드 선택 갱신 필요',bytes:p.n,status:'파라미터 변경',description:'현재 파라미터의 트리에서 노드를 다시 선택하세요.',hex:null,inputs:[]};
  const selected=forest?geo.fors.trees[treeNumber].index:state.digits[layer],on=index===(selected>>height),auth=execution.mode!=='keygen'&&height<max&&index===((selected>>height)^1);
  const root=height===max,leaf=height===0,role=root?'루트':auth?'인증 경로 · AUTH['+height+']':leaf?'잎':on&&execution.mode!=='keygen'?'선택 경로의 중간 노드':'중간 노드';
  const nodes=forest?t?.nodes?.fors?.[treeNumber]:t?.nodes?.xmss?.[layer],entry=nodes?.[height+':'+index];
  const legacy=forest?t?.fors?.[treeNumber]:t?.layers?.[layer];
  let value=entry?.hex,source=entry?.source;
  if(!value&&root){value=legacy?.root||(!forest&&layer===p.d-1?t?.keygen?.root:null);source='computed';}
  if(!value&&auth&&legacy?.auth){value=legacy.auth.slice(height*p.n*2,(height+1)*p.n*2);source='auth';}
  if(!value&&forest&&leaf&&on&&legacy?.leaf){value=legacy.leaf;source='computed';}
  const operation=leaf?(forest?'F':'T_len'):'H',tree=addr(forest?0:layer).toString();
  const title=(forest?'FORS tree '+treeNumber:'XMSS · L'+layer)+' · '+role;
  const location='L'+(forest?0:layer)+' · tree 0x'+BigInt(tree).toString(16)+' · height '+height+' · index '+index;
  let description=leaf?(forest?'F가 FORS 비밀값 '+p.n+' B를 해싱한 잎입니다.':'T_len이 WOTS+ 체인 끝값 '+(2*p.n+3)+'개를 압축한 공개키입니다. XMSS 잎 하나가 됩니다.'):'왼쪽 자식 '+p.n+' B와 오른쪽 자식 '+p.n+' B를 순서대로 H에 넣은 '+p.n+' B 출력입니다.';
  let wotsContext=null;
  if(leaf&&!forest){
    description='이 XMSS 잎의 값은 keypair '+index+'의 WOTS+ 공개키 '+p.n+' B입니다. T_len이 '+(2*p.n+3)+'개 체인의 끝값 X15를 압축한 값입니다.';
    if(on&&execution.mode!=='keygen'){
      const messageLabel=layer===0?'FORS pk':'L'+(layer-1)+' XMSS root';
      description+=' 이 키쌍이 '+(execution.mode==='verify'?'검증하는':'서명하는')+' 메시지는 '+messageLabel+'이며, 메시지 자체가 XMSS 잎이 되는 것은 아닙니다.';
      wotsContext={messageLabel,bytes:p.n,hex:legacy?.message||(layer===0?t?.forsPk:null)||null,signatureBytes:(2*p.n+3)*p.n,verify:execution.mode==='verify'};
    }
  }
  if(!forest&&root)description+=layer===p.d-1?(execution.mode==='verify'?' 복원한 최상위 루트이며, 입력 PK.root와 비교합니다.':' 최상위 루트로, PK.root에 해당합니다.'):' 이 루트를 바로 위 계층의 WOTS+가 서명합니다.';
  if(auth)description+=' 선택 노드의 형제이며, 서명 AUTH['+height+']에 포함됩니다.';
  const invocation={id:operation,group:forest?'fors':leaf?'wots':'xmss',layer,height,index,forsTree:treeNumber,keypair:!forest&&leaf?index:undefined,forsNodeIndex:forest?index:undefined,forsLeaf:forest&&leaf?index:undefined};
  const unavailable=execution.busy?'계산 진행 중 · 완료 후 값 표시':!t?'구조 미리보기 · 실행하면 값 표시':execution.mode==='verify'?'Verify에서 계산하거나 입력받지 않는 노드':execution.mode==='keygen'?(forest?'KeyGen에서는 FORS를 계산하지 않습니다.':'KeyGen은 최상위 XMSS 트리만 계산합니다.'):'현재 실행에서 값이 기록되지 않은 노드';
  return {kind,title,location,layer:forest?0:layer,tree,forest,forsTree:treeNumber,height,index,role,bytes:p.n,hex:value||null,
    status:value?(source==='auth'?(execution.mode==='verify'?'입력 서명의 AUTH에서 읽음':'생성한 서명의 AUTH 값'):'실제 계산값'):unavailable,
    comparison:!forest&&root&&layer===p.d-1&&execution.mode==='verify'?t?.comparison:null,
    description,operation,invocation,wotsContext,valueLabel:leaf&&!forest?'XMSS 잎 · WOTS+ pk':null,inputs:leaf?[]:[0,1].map(side=>{
      const childIndex=index*2+side,child=nodes?.[(height-1)+':'+childIndex];
      let hex=child?.hex;
      if(!hex&&legacy?.auth&&childIndex===((selected>>(height-1))^1))hex=legacy.auth.slice((height-1)*p.n*2,height*p.n*2);
      return {side:side?'오른쪽':'왼쪽',height:height-1,index:childIndex,bytes:p.n,hex:hex||null};
    })};
}
