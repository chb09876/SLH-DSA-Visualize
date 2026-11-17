// SHAKE256 byte-aligned delimited suffix 0x1F and pad10*1 final bit 0x80.
function shakePaddingLayout(inputBytes,rate=136){
  if(!Number.isSafeInteger(inputBytes)||inputBytes<0||!Number.isSafeInteger(rate)||rate<2)return null;
  const fullBlocks=Math.floor(inputBytes/rate),remainder=inputBytes%rate,blockCount=fullBlocks+1,totalBytes=blockCount*rate;
  if(!Number.isSafeInteger(totalBytes))return null;
  const finalStart=fullBlocks*rate,combined=remainder===rate-1,zeroBytes=combined?0:rate-remainder-2;
  const cells=Array.from({length:rate},(_,index)=>({index,offset:finalStart+index,role:index<remainder?'input':combined?'combined':index===remainder?'suffix':index===rate-1?'last':'zero',hex:index<remainder?null:combined?'9F':index===remainder?'1F':index===rate-1?'80':'00'}));
  const segments=[];
  if(remainder)segments.push({role:'input',label:'원래 입력',detail:'값 미표시',start:0,end:remainder,bytes:remainder});
  if(combined)segments.push({role:'combined',label:'9F',detail:'같은 바이트에 1F ⊕ 80',start:rate-1,end:rate,bytes:1});
  else{
    segments.push({role:'suffix',label:'1F',detail:'구분자 + 첫 패딩 비트',start:remainder,end:remainder+1,bytes:1});
    if(zeroBytes)segments.push({role:'zero',label:'00',detail:'0 채움',start:remainder+1,end:rate-1,bytes:zeroBytes});
    segments.push({role:'last',label:'80',detail:'마지막 패딩 비트',start:rate-1,end:rate,bytes:1});
  }
  return {inputBytes,rate,fullBlocks,remainder,blockCount,totalBytes,paddingBytes:totalBytes-inputBytes,finalStart,combined,zeroBytes,cells,segments};
}
function renderShakePadding(model){
  if(model.core!=='SHAKE256')return null;
  const el=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n;},layout=shakePaddingLayout(model.raw),section=el('section','shake-padding');section.setAttribute('aria-label','SHAKE256 흡수 블록 패딩');
  section.append(el('strong','shake-padding-title','SHAKE256 · 흡수 블록 패딩'));
  if(!layout){section.append(el('p','hint-text','입력 길이가 확정되면 구분자와 패딩 위치를 표시합니다.'));return section;}
  const l=layout;section.dataset.inputBytes=String(l.inputBytes);section.dataset.paddingBytes=String(l.paddingBytes);section.dataset.blocks=String(l.blockCount);section.dataset.finalStart=String(l.finalStart);
  section.append(el('div','padding-equation',l.inputBytes.toLocaleString()+' B 입력 + '+l.paddingBytes+' B 구분자·패딩 = '+l.totalBytes.toLocaleString()+' B'));
  section.append(el('p','padding-absorb','absorb '+l.blockCount.toLocaleString()+'회 · 136 B × '+l.blockCount.toLocaleString()+'블록'));
  section.append(el('p','hint-text','아래는 마지막 블록 #'+l.fullBlocks.toLocaleString()+' (번호는 0부터)'));
  if(l.fullBlocks)section.append(el('p','padding-prefix','앞의 '+l.fullBlocks.toLocaleString()+'블록: 입력 데이터 '+l.finalStart.toLocaleString()+' B · 패딩 없음'));
  const sequence=l.segments.map(s=>s.role==='input'?'입력 '+s.bytes+' B':s.role==='zero'?'00 × '+s.bytes:s.label).join(' ‖ ');
  section.append(el('code','padding-sequence',sequence));
  const ranges=el('div','padding-ranges');ranges.setAttribute('role','table');ranges.setAttribute('aria-label','마지막 흡수 블록의 구간');
  for(const s of l.segments){
    const row=el('div','padding-range '+s.role);row.setAttribute('role','row');row.dataset.role=s.role;
    const name=el('div','');name.append(el('b','',s.label),el('small','',s.detail));
    const bounds=s.bytes===1?'['+s.start+']':'['+s.start+':'+s.end+')';
    const size=el('div','padding-range-size');size.append(el('code','',bounds),el('b','',s.bytes+' B'));row.append(name,size);ranges.append(row);
  }section.append(ranges);
  const details=el('details','padding-bytes');details.open=true;details.append(el('summary','','마지막 136 B · 바이트별 보기'));
  details.append(el('p','hint-text','번호는 이 블록 안의 바이트 위치입니다. IN은 원래 입력이며 값은 생략합니다. 패딩의 HEX는 실제 값입니다.'));
  const grid=el('div','padding-byte-grid');grid.setAttribute('role','table');grid.setAttribute('aria-label','마지막 흡수 블록 136바이트');
  let offset=0;const parts=model.parts.map(([name,bytes])=>{const p={name,start:offset,end:offset+bytes};offset+=bytes;return p;});
  for(const c of l.cells){
    const cell=el('span','padding-byte '+c.role);cell.setAttribute('role','cell');cell.dataset.index=String(c.index);cell.dataset.role=c.role;if(c.hex)cell.dataset.hex=c.hex;
    const source=c.role==='input'?parts.find(p=>c.offset>=p.start&&c.offset<p.end)?.name:'구분자·패딩';
    cell.title='블록['+c.index+'] · 스트림['+c.offset+'] · '+(source||'입력')+' · '+(c.hex?'0x'+c.hex:'입력 값 생략');
    cell.append(el('small','',String(c.index)),el('code','',c.hex||'IN'));grid.append(cell);
  }
  details.append(grid);section.append(details);
  if(l.combined)section.append(el('p','padding-special','남은 공간이 1 B라서 1F와 80이 같은 바이트에 겹칩니다: 1F ⊕ 80 = 9F.'));
  if(l.remainder===0)section.append(el('p','padding-special','입력이 136 B 배수이므로 패딩 전용 블록 1개가 추가됩니다.'));
  section.append(el('p','hint-text','블록마다 rate 영역에 XOR → Keccak-f[1600] 1회 (24라운드). 총 '+l.blockCount.toLocaleString()+'회 · '+(24*l.blockCount).toLocaleString()+'라운드.'));
  return section;
}
