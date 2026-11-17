const TREE_FLOW={htX:9600,signatureX:14900,referenceRail:6900,outputRail:14160,signatureRail:13200};
const SIGNATURE_SHIFT=TREE_FLOW.signatureX-7480;
function updateLargeTreeGeometry(){
  geo.wotsOutputY=2290;geo.rootY=675;geo.leafY=geo.rootY+p.hp*155;
  geo.htX=TREE_FLOW.htX-WOTS_EXPAND;geo.htTop=380;geo.pitch=900;geo.th=540;geo.tw=1170;geo.htPeerOffset=1230;geo.htRadius=18;geo.htPeerRadius=14;
  geo.htBottom=geo.htTop+(p.d-1)*geo.pitch;
  geo.overviewHashes=[];geo.overviewLeafFs=[];
  const treeH=480+(p.a-3)*160,cellH=treeH+500,leafY=geo.htBottom+geo.th,forsBase=leafY+400,forestTop=forsBase+1030,detailY=forestTop+treeH+1000;
  geo.forsLayout={left:7800,top:forestTop,cols:p.k,rows:1,cellW:900,cellH,treeH,radius:14,busY:forestTop-160,
    headingX:8400,headingY:forsBase+270,
    detail:{x:9600,y:detailY,headingX:8400,headingY:detailY-270,pitch:110,authGap:470,radius:16},
    pk:{x:9290,y:forsBase+500,w:620,h:140},compression:{x:9290,y:forsBase+720,w:620,h:110},
    bottom:detailY+p.a*110+1000};
  geo.forsDigest={x:8380,y:forsBase+480};
  geo.messageLayout={format:{x:800,y:2930,w:520,h:235},prf:{x:1600,y:2930,w:650,h:160},hash:{x:1600,y:3360,w:650,h:160},digest:{x:1600,y:3700,w:650,h:140}};
  geo.messageLayout.offset={x:4080,y:geo.forsDigest.y-3770};
  for(const id of ['format','prf','hash','digest']){geo.messageLayout[id].x+=geo.messageLayout.offset.x;geo.messageLayout[id].y+=geo.messageLayout.offset.y;}
  geo.routes=[];geo.flowLayout={...TREE_FLOW};
  const forestRight=geo.forsLayout.left+p.k*geo.forsLayout.cellW;
  world.w=Math.max(TREE_FLOW.signatureX+1700,forestRight+200)-world.x;world.h=Math.max(geo.forsLayout.bottom+180,geo.htBottom+geo.th+1000,7600);
  regions.all={x:world.x,y:0,w:world.w,h:world.h};
  regions.ht={x:TREE_FLOW.htX-2250,y:45,w:execution.mode==='sign'?6200:4800,h:leafY+(execution.mode==='keygen'?160:500)};
  regions.fors={x:7700,y:forsBase+210,w:forestRight-7700+100,h:geo.forsLayout.bottom+120-forsBase-210};
  if(execution.mode!=='keygen')regions.message={x:120+geo.messageLayout.offset.x,y:2670+geo.messageLayout.offset.y,w:3170,h:1350};
  regions.signature={x:TREE_FLOW.signatureX-140,y:130,w:1540,h:3450};
}
function drawLargeHypertree(){
  const {htX:x,htTop:top,pitch,tw,th}=geo,kg=execution.mode==='keygen',left=x-2100,right=x+2050;
  heading('HYPERTREE','d = '+p.d+' · h = '+p.h+' · h′ = '+p.hp,left,85);
  geo.htShapes=[];geo.htSignatureOutputs=[];geo.htSignatureInputs=[];geo.htWotsLinks=[];
  for(let l=p.d-1;l>=0;l--){
    ctx.save();if(kg&&l!==p.d-1)ctx.globalAlpha*=.10;
    const y=top+(p.d-1-l)*pitch,selected=kg?l===p.d-1:l===state.layer,kind=selected?'active':'neutral';
    simpleTriangle(x,y,tw,th,kind,true,{group:'xmss',module:'ht',layer:l});
    const leafX=x-tw/2+tw*(state.digits[l]+.5)/2**p.hp;
    box(leafX-geo.htRadius,y+th-geo.htRadius,geo.htRadius*2,geo.htRadius*2,'active',4);
    label('L'+l,left,y+th*.65,58,{color:selected?C.blue:C.ink});
    const exp=(p.d-1-l)*p.hp;text(exp===0?'트리 1개':'트리 2^'+exp+'개',right,y+th*.65,39,{color:C.muted});
    if(execution.mode==='sign'){
      const wotsBytes=(2*p.n+3)*p.n,authBytes=p.hp*p.n,port={layer:l,x:right+WOTS_EXPAND,y:y+440,w:900,h:130,bytes:wotsBytes+authBytes,wotsBytes,authBytes};
      block(right,port.y,port.w,port.h,'SIG_XMSS · '+port.bytes.toLocaleString()+' B','L'+l+' · WOTS '+wotsBytes+' B ‖ AUTH '+authBytes+' B','auth');
      geo.htSignatureOutputs.push(port);
    }else if(execution.mode==='verify'){
      const port={layer:l,x:right+WOTS_EXPAND,y:y+440,w:900,h:130,bytes:(2*p.n+3)*p.n};
      keyField(right,port.y,port.w,port.h,'SIG_WOTS · '+port.bytes.toLocaleString()+' B','SIG_HT에서 읽음 · L'+l,'SIG_HT');geo.htSignatureInputs.push(port);
    }
    if(l<p.d-1){
      const upper=y-pitch,target=x-tw/2+tw*(state.digits[l+1]+.5)/2**p.hp;
      if(!kg)drawHypertreeWotsLink(l,l+1,x,y,target,upper+th);
      for(const sign of [-1,1]){
        const peerX=x+sign*geo.htPeerOffset;simpleTriangle(peerX,y+th*.15,tw*.57,th*.66,'neutral',false,{group:'xmss',module:'ht',layer:l,placeholder:true});
      }
    }
    hitboxes.push({x:x-tw/2-30,y:y-20,w:tw+60,h:th+40,type:'layer',layer:l});
    geo.htShapes.push({layer:l,x:x+WOTS_EXPAND,y,w:tw,h:th});ctx.restore();
  }
  label('PK.root',x,top-75,64,{align:'center'});
  const bottom=geo.htBottom+th;
  text(kg?'KeyGen: 최상위 XMSS만 계산':'하위 root는 상위 WOTS+의 메시지 입력',left,245,36,{color:C.muted});
  text('회색 점선: 동일 키쌍 관계 · 주변 트리: 구조 예시',left,305,30,{color:C.muted});
}
function drawHypertreeWotsLink(lowerLayer,layer,rootX,rootY,leafX,leafY){
  const verify=execution.mode==='verify',pk={x:leafX-260,y:leafY+65,w:520,h:105},signer={x:leafX+650,y:leafY+130,w:600,h:160};
  const route=(id,points,color,width,dash=[],arrow=true)=>{path(points,color,width,dash,arrow);geo.routes.push({id,points:points.map(([x,y])=>[x+WOTS_EXPAND,y]),color,dash,arrow});};
  box(pk.x,pk.y,pk.w,pk.h,'active',12);label('WOTS+ pk',leafX,pk.y+45,40,{align:'center'});text(p.n+' B · L'+layer+' XMSS 잎',leafX,pk.y+85,28,{align:'center',color:C.muted});
  box(signer.x,signer.y,signer.w,signer.h,'active',12);
  label('L'+layer+' WOTS+ '+(verify?'검증':'서명'),signer.x+signer.w/2,signer.y+48,36,{align:'center'});
  text('keypair '+state.digits[layer],signer.x+signer.w/2,signer.y+91,28,{align:'center',color:C.muted});
  text('SIG_WOTS · '+(2*p.n+3)*p.n+' B',signer.x+signer.w/2,signer.y+135,28,{align:'center',color:C.orange});
  const messagePoints=[[rootX,rootY-geo.htRadius],[rootX,leafY+330],[signer.x+signer.w/2,leafY+330],[signer.x+signer.w/2,signer.y+signer.h]];
  route('layer-message-'+lowerLayer,messagePoints,C.blue,3);
  text('M = L'+lowerLayer+' root · '+p.n+' B',rootX-60,leafY+310,26,{align:'right',color:C.blue});
  route('layer-wots-pk-'+layer,[[leafX,pk.y],[leafX,leafY+geo.htRadius]],C.blue,3);
  const association=[[pk.x+pk.w,pk.y+pk.h/2],[signer.x-60,pk.y+pk.h/2],[signer.x-60,signer.y+signer.h/2],[signer.x,signer.y+signer.h/2]];
  route('layer-keypair-'+layer,verify?association.slice().reverse():association,verify?C.blue:C.ref,2,verify?[]:[5,8],verify);
  text(verify?'공개키 복원':'동일 키쌍',leafX+310,leafY+100,24,{color:verify?C.blue:C.ref});
  const port=(verify?geo.htSignatureInputs:geo.htSignatureOutputs).find(port=>port.layer===layer),portX=port.x-WOTS_EXPAND,rail=portX-140;
  const sigPoints=[[signer.x+signer.w,signer.y+signer.h/2],[rail,signer.y+signer.h/2],[rail,port.y+port.h/2],[portX,port.y+port.h/2]];
  route('layer-wots-signature-'+layer,verify?sigPoints.slice().reverse():sigPoints,C.orange,3);
  geo.htWotsLinks.push({lowerLayer,layer,keypair:state.digits[layer],pk:{...pk,x:pk.x+WOTS_EXPAND},signer:{...signer,x:signer.x+WOTS_EXPAND},message:{x:rootX+WOTS_EXPAND,y:rootY-geo.htRadius},leaf:{x:leafX+WOTS_EXPAND,y:leafY+geo.htRadius},signatureBytes:(2*p.n+3)*p.n});
}
function drawLargeForest(){
  const g=geo.forsLayout,selected=state.forsTree;geo.forsOverview=[];
  for(let i=0;i<p.k;i++){
    const row=Math.floor(i/g.cols),col=i%g.cols,cx=g.left+(col+.5)*g.cellW,y=g.top+row*g.cellH,w=g.cellW-80;
    const index=geo.fors.trees[i].index,depth=3,topH=480;
    const at=(d,j)=>({id:d+':'+j,depth:d,index:j,x:cx-w/2+w*(j+.5)/2**d,y:y+topH*d/depth});
    const bounds={x:cx-g.cellW/2+20,y:y-105,w:g.cellW-40,h:g.treeH+455};
    const tree={tree:i,root:'0:0',nodes:[],edges:[],bounds};
    box(bounds.x,bounds.y,bounds.w,bounds.h,i===selected?'active':'neutral',12);
    text('TREE '+i+' · a='+p.a,bounds.x+20,y-60,30,{color:i===selected?C.blue:C.ink});
    text('root['+i+']',cx+35,y+12,28,{color:i===selected?C.blue:C.ink});
    for(let d=0;d<=depth;d++)for(let j=0;j<2**d;j++){
      const n=at(d,j),chosen=index>>(p.a-d),auth=d>0&&j===(chosen^1),on=j===chosen;
      tree.nodes.push({...n,role:on?'path':auth?'auth':'other'});
      if(d){const parent=at(d-1,j>>1);tree.edges.push({from:parent.id,to:n.id});}
      dot(n.x,n.y,g.radius,on?'active':auth?'auth':'neutral');
      if(d===depth&&!on)for(const side of [-1,1])line(n.x,n.y+g.radius,n.x+side*24,n.y+48,C.line,1.5,[4,5]);
    }
    for(let d=0;d<depth;d++)for(let j=0;j<2**d;j++){
      const height=p.a-d,on=j===(index>>height),children=[at(d+1,j*2),at(d+1,j*2+1)];
      for(let side=0;side<2;side++)children[side].active=(j*2+side)===(index>>(height-1));
      connectOverviewHash(at(d,j),children,{group:'fors',module:'fors',forsTree:i,height,forsNodeIndex:j,active:on,used:execution.mode!=='keygen'&&(execution.mode!=='verify'||on)},g.radius);
    }
    let parent=at(depth,index>>(p.a-depth));
    for(let d=depth+1;d<=p.a;d++){
      const chosen=index>>(p.a-d),dir=chosen&1?1:-1,yy=y+topH+(d-depth)*160,anchor=Math.max(cx-w*.32,Math.min(cx+w*.32,parent.x));
      const child={id:d+':'+chosen,depth:d,index:chosen,x:anchor+dir*55,y:yy};
      const sibling={id:d+':'+(chosen^1),depth:d,index:chosen^1,x:anchor-dir*55,y:yy};
      child.active=true;
      connectOverviewHash(parent,chosen&1?[sibling,child]:[child,sibling],{group:'fors',module:'fors',forsTree:i,height:p.a-d+1,forsNodeIndex:chosen>>1,active:true,used:execution.mode!=='keygen'},g.radius);
      dot(child.x,child.y,g.radius,'active');dot(sibling.x,sibling.y,g.radius,'auth');
      tree.nodes.push({...child,role:'path'},{...sibling,role:'auth'});tree.edges.push({from:parent.id,to:child.id},{from:parent.id,to:sibling.id});parent=child;
    }
    const secretY=y+g.treeH+240,f={x:parent.x-48,y:parent.y+60,w:96,h:64,group:'fors',forsTree:i,forsLeaf:index,used:execution.mode!=='keygen'};
    geo.overviewLeafFs.push(f);
    box(cx-100,secretY-30,200,60,'auth',6);
    path([[cx,secretY-30],[cx,parent.y+170],[parent.x,parent.y+170],[parent.x,f.y+f.h]],C.blue,2.5,[],true);
    line(parent.x,f.y,parent.x,parent.y+g.radius,C.blue,2.5,[],true);
    text('SK · j='+index,cx,secretY+50,28,{align:'center',color:C.orange});
    line(cx,y-g.radius,cx,g.busY,C.blue,2.5,[],true);
    tree.leaf={x:parent.x,y:parent.y};geo.forsOverview.push(tree);
    hitboxes.push({...bounds,type:'forsTree',tree:i});
  }
  const t=g.compression,first=geo.forsOverview[0].nodes[0],last=geo.forsOverview.at(-1).nodes[0],inputX=t.x+t.w/2;
  line(first.x,g.busY,last.x,g.busY,C.blue,4);
  line(inputX,g.busY,inputX,t.y+t.h+14,C.blue,4,[],true);
  geo.forsRootCollector={roots:geo.forsOverview.map(tree=>({tree:tree.tree,x:tree.nodes[0].x,y:tree.nodes[0].y})),y:g.busY,input:{x:inputX,y:t.y+t.h+14},bytes:p.k*p.n};
  text('root[0] ‖ … ‖ root['+(p.k-1)+'] · '+p.k*p.n+' B',t.x+t.w+100,t.y+70,34,{color:C.blue});
  geo.forsLeaf=geo.forsOverview[selected].leaf;
}
function drawLargeFors(){
  const g=geo.forsLayout,d=g.detail,index=geo.fors.trees[state.forsTree].index;
  heading('FORS','k = '+p.k+' · a = '+p.a+' · '+2**p.a+' LEAVES / TREE',g.headingX,g.headingY);
  text('md '+p.k*p.a+' bit → '+p.k+'개 트리의 잎 선택',g.headingX,g.headingY+160,36,{color:C.muted});
  drawLargeForest();
  block(g.compression.x,g.compression.y,g.compression.w,g.compression.h,'T_k',p.k+'개 root → '+p.n+' B','active');
  block(g.pk.x,g.pk.y,g.pk.w,g.pk.h,'FORS pk',p.n+' B · L0 WOTS+ 입력','active');
  line(g.pk.x+g.pk.w/2,g.compression.y-12,g.pk.x+g.pk.w/2,g.pk.y+g.pk.h+15,C.blue,5,[],true);
  heading('FORS · 인증 경로 확대','TREE '+state.forsTree+' · leaf '+index+' · AUTH '+p.a+'개',d.headingX,d.headingY);
  geo.forsDetailNodes=[];geo.forsDetailHashes=[];
  for(let depth=0;depth<=p.a;depth++){
    const height=p.a-depth,localIndex=index>>height,y=d.y+depth*d.pitch;
    dot(d.x,y,d.radius,'active');geo.forsDetailNodes.push({x:d.x,y,r:d.radius,height,index:localIndex});
    if(!depth)continue;
    const authX=(index>>height)&1?d.x-d.authGap:d.x+d.authGap;
    dot(authX,y,d.radius,'auth');geo.forsDetailNodes.push({x:authX,y,r:d.radius,height,index:localIndex^1});
    text('AUTH['+height+']',authX+(authX<d.x?-28:28),y+10,36,{align:authX<d.x?'right':'left',color:C.orange});
    const h={x:d.x-38,y:y-78,w:76,h:48,height:height+1,forsTree:state.forsTree};geo.forsDetailHashes.push(h);
    const pathLeft=(localIndex&1)===0;
    path([[d.x,y-d.radius-3],[d.x+(pathLeft?-18:18),h.y+h.h+3]],C.blue,4,[],true);
    path([[authX,y-d.radius-3],[d.x+(pathLeft?18:-18),h.y+h.h+3]],C.line,3,[],true);
    line(d.x,h.y-3,d.x,y-d.pitch+d.radius+3,C.blue,4,[],true);
    if(height>0)for(const side of [-1,1]){
      const x=authX+side*30,yy=y+44;line(authX,y+d.radius+3,x,yy,C.line,2);
      dot(x,yy,5,'neutral');geo.forsDetailNodes.push({x,y:yy,r:5,height:height-1,index:2*(localIndex^1)+(side===1?1:0)});
    }
  }
  const leafY=d.y+p.a*d.pitch;geo.forsDetailLeafF={x:d.x-56,y:leafY+50,w:112,h:90};
  box(d.x-56,leafY+50,112,90,'neutral',8);text('F',d.x,leafY+112,48,{align:'center'});
  box(d.x-200,leafY+190,400,105,'auth',10);label('SK_'+state.forsTree+'['+index+']',d.x,leafY+258,48,{align:'center'});
  line(d.x,leafY+175,d.x,leafY+153,C.blue,4,[],true);line(d.x,leafY+37,d.x,leafY+24,C.blue,4,[],true);
  text('SIG_FORS: SK '+p.n+' B + AUTH '+p.a+' × '+p.n+' B / TREE',d.headingX,leafY+380,37,{color:C.orange});
  const root=geo.forsOverview[state.forsTree].nodes[0];
  const railX=root.x+g.cellW/2-10,detailRail=d.x+1400,gapY=g.top+g.treeH+470;
  geo.forsReference=[[d.x+25,d.y],[detailRail,d.y],[detailRail,gapY],[railX,gapY],[railX,root.y-30],[root.x+20,root.y-30],[root.x+10,root.y-12]];
  reference(geo.forsReference,'선택 TREE '+state.forsTree+'의 인증 경로',d.x+200,d.y-100);
}
function drawLargeTreeConnections(){
  const x=geo.htX,rootY=geo.htTop,pkX=TREE_FLOW.signatureX,selectedY=rootY+(p.d-1-state.layer)*geo.pitch;
  const route=(id,points,color,width,dash,arrow,caption,labelX,labelY)=>{
    geo.routes.push({id,points,color,dash,caption});path(points,color,width,dash,arrow);
    if(caption)connectionCaption(caption,labelX,labelY,color);
  };
  route('xmss-reference',[[4865,geo.rootY],[TREE_FLOW.referenceRail,geo.rootY],[TREE_FLOW.referenceRail,selectedY],[x-20,selectedY]],C.ref,3,[10,15],false,
    '선택 XMSS = Hypertree L'+state.layer,7200,geo.rootY-45);
  if(execution.mode==='keygen')route('pk-root',[[x+25,rootY],[TREE_FLOW.outputRail,rootY],[TREE_FLOW.outputRail,470],[pkX-20,470]],C.blue,5,[],true,'PK.root · '+p.n+' B',11300,rootY-45);
  if(execution.mode==='verify')route('verify-root',[[x+25,rootY],[TREE_FLOW.outputRail,rootY],[TREE_FLOW.outputRail,2990],[pkX-20,2990]],C.blue,4,[],true,'복원 루트 · '+p.n+' B',11300,rootY-45);
  if(execution.mode==='sign'){
    const ports=geo.htSignatureOutputs,rail=TREE_FLOW.signatureRail,firstY=ports[0].y+ports[0].h/2,lastY=ports.at(-1).y+ports.at(-1).h/2,bytes=ports.reduce((sum,port)=>sum+port.bytes,0);
    for(const port of ports)route('xmss-signature-'+port.layer,[[port.x+port.w,port.y+port.h/2],[rail,port.y+port.h/2]],C.orange,3,[],true,null);
    line(rail,firstY,rail,lastY,C.orange,4);
    geo.htSignatureCollector={x:rail,top:firstY,bottom:lastY,bytes,layers:ports.map(port=>port.layer).sort((a,b)=>a-b)};
    label('SIG_HT · '+bytes.toLocaleString()+' B',rail,firstY-150,40,{align:'center',color:C.orange});
    text('L0 → L'+(p.d-1)+' 순서로 연결',rail,firstY-90,28,{align:'center',color:C.orange});
    route('signature-ht',[[rail,1462.5],[pkX,1462.5]],C.orange,4,[],true,'SIG_HT → 서명 조립',rail+80,1415);
  }
  if(execution.mode!=='keygen'){
    const g=geo.forsLayout,leafX=x-geo.tw/2+geo.tw*(state.digits[0]+.5)/2**p.hp,leafY=geo.htBottom+geo.th;
    const center=g.pk.x+g.pk.w/2,verify=execution.mode==='verify';
    const wots={x:x-600,y:leafY+190,w:1200,h:200},sig={x:x+760,y:leafY+230,w:700,h:120};
    geo.l0Wots={...wots,keypair:state.digits[0],messageBytes:p.n,publicKeyBytes:p.n,signatureBytes:(2*p.n+3)*p.n,signature:sig};
    block(wots.x,wots.y,wots.w,wots.h,'L0 WOTS+ · keypair '+state.digits[0],verify?'SIG_WOTS → 체인 끝값 → T_len':'서명 · 체인 끝값 · T_len','active');
    block(sig.x,sig.y,sig.w,sig.h,'SIG_WOTS · '+geo.l0Wots.signatureBytes+' B',verify?'SIG_HT에서 읽음 · L0':'SIG_HT에 포함 · L0','auth');
    hitboxes.push({...wots,type:'layer',layer:0});
    route('fors-public-key',[[center,g.pk.y-15],[center,wots.y+wots.h+15]],C.blue,4,[],true,
      '서명 입력 M · FORS pk · '+p.n+' B',x+180,leafY+455);
    route('l0-wots-public-key',[[leafX,wots.y-12],[leafX,leafY+20]],C.blue,4,[],true,
      'WOTS+ pk · '+p.n+' B = XMSS 잎',x+260,leafY+140);
    const signaturePoints=[[wots.x+wots.w+15,wots.y+wots.h/2],[sig.x-15,wots.y+wots.h/2]];
    route('l0-wots-signature',verify?signaturePoints.slice().reverse():signaturePoints,C.orange,3,[],true,null);
    if(!verify){
      const target=geo.htSignatureOutputs.find(port=>port.layer===0),wotsX=target.x+target.w*.25,authX=target.x+target.w*.75;
      const auth={x:authX-230,y:leafY+220,w:460,h:140,bytes:p.hp*p.n};
      block(auth.x,auth.y,auth.w,auth.h,'AUTH · '+auth.bytes+' B','L0 · 인증 경로 '+p.hp+'개','auth');
      route('l0-wots-to-xmss',[[sig.x+sig.w,sig.y+sig.h/2],[wotsX,sig.y+sig.h/2],[wotsX,target.y+target.h]],C.orange,4,[],true,
        'SIG_WOTS · '+geo.l0Wots.signatureBytes+' B',sig.x+sig.w+80,sig.y+sig.h/2-40);
      route('l0-auth-to-xmss',[[authX,auth.y],[authX,target.y+target.h]],C.orange,4,[],true,null);
      geo.l0SignatureAssembly={wots:sig,auth,target,bytes:geo.l0Wots.signatureBytes+auth.bytes};
    }
    const digest=geo.messageLayout.digest,target=geo.forsDigest;
    route('message-digest',[[digest.x+digest.w,digest.y+digest.h/2],[target.x,target.y]],C.blue,4,[],true,
      'md · '+Math.ceil(p.k*p.a/8)+' B → FORS 잎 선택',digest.x+digest.w+180,target.y-45);
  }
}
function connectionCaption(caption,x,y,color){
  const font=34*(state.fontSize||14)/14;ctx.save();ctx.font=font+'px system-ui,"Malgun Gothic",sans-serif';
  const width=ctx.measureText(caption).width;ctx.fillStyle=C.paper;ctx.fillRect(x-14,y-font-7,width+28,font+21);ctx.restore();
  text(caption,x,y,34,{color});
}
