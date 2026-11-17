function drawEmbeddedXmss(){
  const {rootY,leafY,treeW}=geo,idx=state.digits[state.layer],kg=execution.mode==='keygen',verify=execution.mode==='verify';
  heading('XMSS · 확대도','L'+state.layer+' · h′ = '+p.hp+' · '+2**p.hp+' LEAVES',2240,rootY-430);
  text(kg?'전체 '+2**p.hp+'개 WOTS+ 키에 같은 계산 반복':'선택 잎 확대 표시 · WOTS+ pk = XMSS 잎',2240,rootY-265,34,{color:C.muted});
  geo.xmssHashes=[];geo.xmssNodes=[];
  const leafEdge=i=>geo.xmssLayout.left+geo.xmssLayout.regular*i+(i>idx?geo.xmssLayout.slot-geo.xmssLayout.regular:0);
  // A parent has one H with two separate child inputs, not one H per edge.
  for(let depth=0;depth<p.hp;depth++)for(let i=0;i<2**depth;i++){
    const parent=xmssCoordinate(depth,i),children=[xmssCoordinate(depth+1,2*i),xmssCoordinate(depth+1,2*i+1)];
    const span=2**(p.hp-depth),available=leafEdge((i+1)*span)-leafEdge(i*span);
    const selected=i===(idx>>(p.hp-depth)),w=Math.min(64,available*.65),h=Math.min(38,w*.6);
    const op={x:parent.x-w/2+WOTS_EXPAND,y:parent.y+65-h/2,w,h,parentY:parent.y,depth,index:i,height:p.hp-depth,
      parent:depth+':'+i,children:[(depth+1)+':'+(2*i),(depth+1)+':'+(2*i+1)],used:!verify||selected,active:kg||selected,
      inputBytes:2*p.n,outputBytes:p.n};
    geo.xmssHashes.push(op);
    ctx.save();if(!op.used)ctx.globalAlpha*=.15;else if(!op.active)ctx.globalAlpha*=.5;
    const color=op.active?C.blue:C.line,top=op.y,bottom=op.y+h,center=parent.x;
    children.forEach((child,b)=>{
      const childIndex=2*i+b,selectedLeaf=depth+1===p.hp&&childIndex===idx;
      const radius=Math.min(15,treeW/2**(depth+1)*.23);
      const sourceY=child.y-(selectedLeaf?50:radius)-2,inputX=center+(b===0?-1:1)*w*.24;
      if(depth===p.hp-1&&i===(idx>>1)&&!selectedLeaf){
        const aboveLeaf=leafY-60;
        path([[child.x,sourceY],[child.x,aboveLeaf],[inputX,aboveLeaf],[inputX,bottom+3]],color,op.active?4:1.5,[],true);
      }else path([[child.x,sourceY],[inputX,bottom+3]],color,op.active?4:1.5,[],true);
      if(depth===0)text(p.n+' B',(child.x+inputX)/2+(b===0?-18:18),(sourceY+bottom)/2+24,24,{align:'center',color:C.blue});
    });
    line(center,top-2,center,parent.y+18,color,op.active?4:1.5,[],true);
    if(depth===0)text(p.n+' B',center+45,parent.y+35,24,{color:C.blue});
    ctx.restore();
  }
  // Draw values after their edges. The expanded WOTS+ pk is itself a leaf value.
  for(let depth=0;depth<=p.hp;depth++)for(let i=0;i<2**depth;i++){
    const a=xmssCoordinate(depth,i),selected=idx>>(p.hp-depth),auth=!kg&&depth>0&&i===(selected^1);
    const kind=kg||i===selected?'active':auth?'auth':'neutral',r=Math.min(15,treeW/2**depth*.23);
    if(depth===p.hp&&i===idx){
      ctx.save();const alpha=ctx.globalAlpha;ctx.globalAlpha=1;ctx.fillStyle=C.paper;ctx.fillRect(a.x-260,a.y-50,520,100);ctx.globalAlpha=alpha;
      block(a.x-260,a.y-50,520,100,'WOTS+ pk',p.n+' B · XMSS leaf '+idx,'active');ctx.restore();
    }else if(depth===p.hp)box(a.x-r,a.y-r,r*2,r*2,kind,Math.min(2,r*.4));else dot(a.x,a.y,r,kind);
    if(auth)text('AUTH['+(p.hp-depth)+']',a.x,a.y+(depth===p.hp?50:-30),27,{align:'center',color:C.orange});
    geo.xmssNodes.push({id:depth+':'+i,depth,index:i,x:a.x+WOTS_EXPAND,y:a.y,role:i===selected?'path':auth?'auth':'other',bytes:p.n});
  }
  label('XMSS root',2840,rootY-60,56,{align:'center'});
  label(kg?'최상위 XMSS 루트 → PK.root':'AUTH '+p.hp+'×'+p.n+'='+p.hp*p.n+' B · SIG_WOTS '+((2*p.n+3)*p.n)+' B',1820,2610,49);
}
