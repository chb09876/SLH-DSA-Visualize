function renderMessageFormatInfo(info,openOperation){
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const body=el('div','mprime-info'),selection=el('div','op-selection');
  selection.append(el('strong','',(info.format==='hash'?'Hash · '+info.prehash:'Pure')+' · M′ '+(info.bytes??'?')+' B'),el('small','',info.status));body.append(selection);
  body.append(el('code','mprime-formula','M′ = '+info.formula),el('p','node-description',info.description));
  const order=el('div','mprime-order');
  info.fields.forEach((f,i)=>{
    if(i)order.append(el('span','mprime-concat','‖'));
    const cell=el('span','mprime-cell '+f.id);cell.append(el('strong','',f.id==='domain'?(info.format==='hash'?'01':'00'):f.label),el('small','',(f.bytes??'?')+' B'));order.append(cell);
  });body.append(order);
  const copy=(title,fieldId)=>{
    const button=el('button','small mprime-copy',title);button.type='button';
    button.onclick=async()=>{
      const value=SLHScene.messageFormatHex(fieldId);if(value===null)return;
      try{await navigator.clipboard.writeText(value);button.textContent='복사됨';}catch{
        const area=el('textarea','mono mprime-copy-fallback');area.readOnly=true;area.rows=4;area.value=value;body.append(area);area.focus();area.select();button.textContent='전체 HEX 선택됨 · Ctrl+C';
      }
    };return button;
  };
  const fields=el('div','mprime-fields');
  for(const f of info.fields){
    const row=el('section','mprime-field '+f.id);row.dataset.formatField=f.id;
    const header=el('div','node-value-header');header.append(el('strong','',f.label),el('b','',(f.bytes??'?')+' B'));row.append(header);
    row.append(el('small','mprime-offset','M′['+(f.start??'?')+':'+(f.end??'?')+')'),el('p','mprime-meaning',f.meaning));
    const value=f.hex===null?'실행 후 값 표시':f.bytes===0?'빈 바이트열 · 추가되는 바이트 없음':f.hex;
    row.append(el('code','mprime-field-hex',value));
    if(f.truncated)row.append(el('small','mprime-offset','앞 256 B 표시 · 복사 시 전체 필드'));
    if(f.known)row.append(copy('필드 HEX 복사',f.id));fields.append(row);
  }body.append(fields);
  const total=el('div','node-value-header');total.append(el('strong','','직렬화된 전체 M′'),el('b','',(info.bytes??'?')+' B'));body.append(total);
  const output=el('code','node-hex mprime-hex',info.hex??(info.error||'PH(M) 계산 후 전체 바이트열 표시'));output.id='mprime-hex';body.append(output);
  if(info.truncated)body.append(el('p','mprime-meaning','앞 256 B를 표시합니다. 전체 HEX 복사는 모든 바이트를 포함합니다.'));
  if(info.complete){const button=copy('전체 M′ HEX 복사');button.id='copy-mprime';body.append(button);}
  const actions=el('div','mprime-actions');
  for(const id of ['PRF_msg','H_msg']){const b=el('button','small',id+' 입력 보기');b.type='button';b.onclick=()=>openOperation(id);actions.append(b);}body.append(actions);
  return body;
}
