// Geometry is illustrative; node indices and all selected path levels stay exact.
function connectOverviewHash(parent,children,metadata,radius=6){
  const gap=children[0].y-parent.y,h=metadata.placeholder?44:56,w=metadata.placeholder?76:96;
  const boxY=parent.y+(gap-h)/2,on=metadata.active,color=on?C.blue:C.line,inputs=[];
  for(let side=0;side<2;side++){
    const child=children[side],inputX=parent.x+(side===0?-w*.24:w*.24);
    const dx=inputX-child.x,dy=boxY+h-child.y,distance=Math.hypot(dx,dy),source=[child.x+dx/distance*radius,child.y+dy/distance*radius],target=[inputX,boxY+h];
    path([source,target],child.active?C.blue:C.line,child.active?3:1.8,[],true);inputs.push({source,target,child:{x:child.x+drawOffsetX,y:child.y,r:radius}});
  }
  line(parent.x,boxY,parent.x,parent.y+radius,color,on?3:1.8,[],true);
  geo.overviewHashes.push({x:parent.x-w/2+drawOffsetX,y:boxY,w,h,...metadata,parent:{x:parent.x+drawOffsetX,y:parent.y,r:radius},inputs:inputs.map(input=>({...input,source:[input.source[0]+drawOffsetX,input.source[1]],target:[input.target[0]+drawOffsetX,input.target[1]]})),output:{source:[parent.x+drawOffsetX,boxY],target:[parent.x+drawOffsetX,parent.y+radius]}});
}
function simpleTriangle(cx,y,w,h,kind='neutral',detail=true,metadata=null){
  const depth=Math.min(p.hp,detail?3:2),cut=p.hp>depth,drawH=cut?h*.9:h;
  const radius=metadata?.module==='ht'?(detail?geo.htRadius:geo.htPeerRadius):Math.max(3,Math.min(8,w/2**depth*.13));
  const at=(d,i)=>({x:cx-w/2+w*(i+.5)/2**d,y:y+drawH*d/depth});
  for(let d=0;d<depth;d++)for(let i=0;i<2**d;i++){
    const a=at(d,i),children=[at(d+1,2*i),at(d+1,2*i+1)];
    if(metadata){
      const height=p.hp-d,selected=state.digits[metadata.layer],on=i===(selected>>height),kg=execution.mode==='keygen';
      for(let side=0;side<2;side++)children[side].active=!metadata.placeholder&&(2*i+side)===(selected>>(height-1));
      connectOverviewHash(a,children,{...metadata,height,index:i,active:!metadata.placeholder&&on,used:!metadata.placeholder&&(kg?metadata.layer===p.d-1:execution.mode!=='verify'||on)},radius);
    }else for(const z of children)line(a.x,a.y,z.x,z.y,kind==='active'?C.blue:C.line,1.9);
  }
  for(let d=0;d<=depth;d++)for(let i=0;i<2**d;i++){
    const a=at(d,i);dot(a.x,a.y,radius,kind);
    if(cut&&d===depth)line(a.x,a.y+radius,a.x,y+h,C.line,1.3,[3,4]);
  }
}

function forestOverview(){
  const left=3500,right=5290,top=3100,cols=7,rows=Math.ceil(p.k/cols),cellW=(right-left)/cols,cellH=850/rows;
  const model=geo.fors,selected=state.forsTree;
  geo.forsOverview=[];
  for(let i=0;i<p.k;i++){
    const row=Math.floor(i/cols),col=i%cols,cx=left+(col+.5)*cellW,y=top+row*cellH,w=cellW*.82;
    const index=model.trees[i].index,depth=Math.min(3,p.a),treeH=cellH-76,topH=treeH*.52;
    const at=(d,j)=>({id:d+':'+j,depth:d,index:j,x:cx-w/2+w*(j+.5)/2**d,y:y+topH*d/depth});
    const layout={tree:i,root:'0:0',nodes:[],edges:[]};
    box(cx-cellW*.46,y-26,cellW*.92,cellH-8,i===selected?'active':'neutral',8);
    text('root['+i+'] · a='+p.a,cx,y-9,21,{align:'center',color:i===selected?C.blue:C.ink,essential:true,small:true,fixed:true});
    for(let d=0;d<=depth;d++)for(let j=0;j<2**d;j++){
      const node=at(d,j),chosen=index>>(p.a-d),auth=d>0&&j===(chosen^1),on=j===chosen;
      layout.nodes.push({...node,role:on?'path':auth?'auth':'other'});
      if(d){const parent=at(d-1,j>>1);line(parent.x,parent.y,node.x,node.y,on?C.blue:C.line,on?2.7:1.4);layout.edges.push({from:parent.id,to:node.id});}
      dot(node.x,node.y,3,on?'active':auth?'auth':'neutral');
      if(d===depth&&p.a>depth&&!on){
        for(const s of [-1,1])line(node.x,node.y+3,node.x+s*5,node.y+10,C.line,1,[2,3]);
      }
    }
    let parent=at(depth,index>>(p.a-depth));
    for(let d=depth+1;d<=p.a;d++){
      const chosen=index>>(p.a-d),dir=(chosen&1)?1:-1;
      const yy=y+topH+(treeH-topH)*(d-depth)/(p.a-depth);
      const child={id:d+':'+chosen,depth:d,index:chosen,x:Math.max(cx-w*.46,Math.min(cx+w*.46,parent.x+dir*3)),y:yy};
      const sib={id:d+':'+(chosen^1),depth:d,index:chosen^1,x:parent.x-dir*8,y:yy};
      line(parent.x,parent.y,child.x,child.y,C.blue,2);line(parent.x,parent.y,sib.x,sib.y,C.line,1);
      dot(child.x,child.y,2,'active');dot(sib.x,sib.y,2,'auth');
      layout.nodes.push({...child,role:'path'},{...sib,role:'auth'});layout.edges.push({from:parent.id,to:child.id},{from:parent.id,to:sib.id});parent=child;
    }
    const secretY=y+treeH+17;
    box(cx-28,secretY-7,56,14,'auth',2);line(cx,secretY-9,parent.x,parent.y+4,C.blue,1.5,[],true);
    text('SK · j='+index,cx,secretY+24,17,{align:'center',color:C.orange});
    const exitX=cx+cellW*.43,busY=y-34;
    path([[cx,y],[exitX,y],[exitX,busY],[5330,busY]],C.line,1.3);
    layout.leaf={x:parent.x,y:parent.y};geo.forsOverview.push(layout);
    hitboxes.push({x:cx-cellW*.46,y:y-26,w:cellW*.92,h:cellH-8,type:'forsTree',tree:i});
  }
  // The forest's roots are compressed together; this bus is outside the tree cards.
  const busX=5330;
  for(let row=0;row<rows;row++){
    const count=Math.min(cols,p.k-row*cols),yy=top+row*cellH-34;
  }
  path([[busX,top+(rows-1)*cellH-34],[busX,3030],[4380,3030],[4380,2980]],C.blue,3,[],true);
  geo.forsLeaf=geo.forsOverview[selected].leaf;
  geo.forsDigest={x:3480,y:4015};
}
