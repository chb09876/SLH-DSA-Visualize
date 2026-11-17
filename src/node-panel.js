function renderTreeNodeInfo(info,openOperation){
  if(info.kind==='messagePrime')return renderMessageFormatInfo(info,openOperation);
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const body=el('div','node-info'),location=el('div','op-selection');
  location.append(el('strong','',info.location||info.title),el('small','',info.status));body.append(location);
  body.append(el('p','node-description',info.description));
  const size=el('div','node-value-header');size.append(el('strong','',info.valueLabel||(info.kind==='wots'?'블록 값':'노드 값')),el('b','',info.bytes+' B'));body.append(size);
  if(info.hex){
    const value=el('code','node-hex',info.hex);value.id='node-hex';body.append(value);
    const copy=el('button','small node-copy','HEX 복사');copy.type='button';copy.onclick=async()=>{
      try{await navigator.clipboard.writeText(info.hex);copy.textContent='복사됨';}catch{const range=document.createRange();range.selectNodeContents(value);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);copy.textContent='HEX를 선택했습니다';}
    };body.append(copy);
  }else{const value=el('div','node-unavailable',info.status);value.id='node-value-unavailable';body.append(value);}
  if(info.digitContext){
    const c=info.digitContext,section=el('div','node-inputs node-digit-context');
    section.append(el('strong','',c.len1+'개 메시지 니블 · 상위 니블부터'),el('code','node-related-hex',c.digits));
    section.append(el('p','node-description','체크섬 Σ(15 − m[i]) = '+c.checksum+' = 0x'+c.checksumDigits),el('strong','','C0 · C1 · C2'),el('code','node-related-hex',c.checksumDigits.split('').join(' · ')));
    section.append(el('p','node-description','각 HEX 한 자리가 4 bit이며, 총 '+c.len+'개 체인의 서명 위치를 정합니다.'));body.append(section);
  }
  if(info.wotsContext){
    const c=info.wotsContext,related=el('div','node-inputs node-wots-context'),header=el('div','node-value-header');
    related.append(el('strong','',c.verify?'WOTS+ 서명 검증에 사용하는 메시지':'이 WOTS+ 키쌍이 서명하는 메시지'));
    header.append(el('span','',c.messageLabel),el('b','',c.bytes+' B'));related.append(header);
    related.append(el('code',c.hex?'node-related-hex':'node-child-missing',c.hex||'실행 후 메시지 값 표시'));
    related.append(el('p','node-description','SIG_WOTS · '+c.signatureBytes+' B · '+(c.verify?'입력 SIG_HT의 이 계층 서명 블록':'출력 SIG_HT에 포함되는 이 계층 서명 블록')));
    body.append(related);
  }
  if(info.comparison){
    const comparison=el('div','node-inputs');comparison.append(el('strong','',info.comparison.valid?'입력 PK.root와 일치':'입력 PK.root와 불일치'),el('p','node-description','비교 대상 PK.root'),el('code','node-child-hex',info.comparison.expected));body.append(comparison);
  }
  if(info.inputs.length){
    const flow=el('div','node-inputs');flow.append(el('strong','',info.inputTitle||'H 입력 · 왼쪽 ‖ 오른쪽'));
    for(const input of info.inputs){
      const field=el('div','node-input'),header=el('div','node-value-header');
      header.append(el('span','',input.label||input.side+' 자식 · h='+input.height+' / i='+input.index),el('b','',input.bytes+' B'));
      field.append(header,el('code',input.hex?'node-child-hex':'node-child-missing',input.hex||'이 입력 값은 현재 기록에 없습니다.'));flow.append(field);
    }body.append(flow);
  }
  if(info.operation){
    const op=el('button','node-operation',info.operation+' 연산 · 입력 구성 / ADRS 보기');op.type='button';op.onclick=()=>openOperation(info.invocation);body.append(op);
  }
  return body;
}
