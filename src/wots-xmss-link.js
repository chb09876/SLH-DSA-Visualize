function xmssCoordinate(depth,index){
  const {left,leaves,slot,regular}=geo.xmssLayout,selected=state.digits[state.layer];
  const edge=i=>left+regular*i+(i>selected?slot-regular:0),span=leaves/2**depth;
  return {x:(edge(index*span)+edge((index+1)*span))/2,y:geo.rootY+155*depth};
}
function wotsToXmss(){
  const len=2*p.n+3,y=geo.wotsOutputY,port={x:geo.leafX+WOTS_EXPAND-260,y:geo.leafY-50,w:520,h:100};
  const compression={x:1550+WOTS_EXPAND,y:y-65,w:520,h:130};
  // The collected chain endpoints enter the compression block on its left port.
  line(1470+WOTS_EXPAND,650,1470+WOTS_EXPAND,y,C.blue,4);
  line(1470+WOTS_EXPAND,y,compression.x-12,y,C.blue,4,[],true);
  // Stay below every leaf, then enter only the selected leaf from its bottom.
  const points=[[compression.x+compression.w+12,y],[port.x+port.w/2,y],[port.x+port.w/2,port.y+port.h+14]];
  path(points,C.blue,4,[],true);
  text(len+' × '+p.n+' B',1430+WOTS_EXPAND,y-85,38,{align:'right',color:C.blue});
  text((len*p.n).toLocaleString()+' B',1510+WOTS_EXPAND,y+125,38,{align:'center',color:C.blue});
  text(p.n+' B',(compression.x+compression.w+port.x+port.w/2)/2,y+125,38,{align:'center',color:C.blue});
  geo.wotsXmssLink={compression,leaf:port,points,y,inputBytes:len*p.n,outputBytes:p.n,attachment:'bottom'};
}
