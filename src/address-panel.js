function renderOperationAddress(a,{serialOpen=false,onSerialToggle=()=>{}}={}){
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const section=el('section','op-address');section.id='op-address';section.setAttribute('aria-label','선택한 호출의 ADRS 구성');
  const header=el('div','address-header');header.append(el('strong','',a.compressed?'ADRS 32 B → ADRSᶜ 22 B':'ADRS 32 B'),el('span','address-type',a.typeName));section.append(header);
  section.append(el('p','address-description','내부 생성 · 정수 필드를 Big-endian으로 직렬화'));
  const table=el('div','address-fields');table.setAttribute('role','table');table.setAttribute('aria-label','ADRS 필드와 현재 값');
  a.fields.forEach((f,i)=>{
    const row=el('div','address-field');row.dataset.field=String(i);row.setAttribute('role','row');
    const name=el('div','address-field-name');name.setAttribute('role','cell');name.append(el('strong','',f.name),el('small','',`[${f.offset}:${f.offset+f.bytes}) · ${f.bytes} B`));
    const value=el('div','address-field-value');value.setAttribute('role','cell');
    value.append(el('b','',f.name==='Type'?f.value+' · '+a.typeName:f.value),el('code','','0x'+f.hex));
    const meaning=el('small','address-field-meaning',f.meaning);row.append(name,value,meaning);table.append(row);
  });section.append(table);
  const serial=el('details','address-serialization');serial.open=serialOpen;
  serial.addEventListener('toggle',()=>onSerialToggle(serial.open));
  serial.append(el('summary','',a.compressed?'직렬화 · SHA2가 가져가는 22바이트 보기':'직렬화 · SHAKE가 absorb하는 32바이트 보기'));
  serial.append(el('p','address-description',a.compressed?'아래 번호는 원본 ADRS의 바이트 위치입니다. 회색 바이트는 제외하고, 색이 있는 바이트를 순서대로 연결합니다.':'아래 32바이트 전체가 PK.seed 다음에 연속으로 absorb됩니다.'));
  const kept=new Set(a.indices),group=i=>a.fields.findIndex(f=>i>=f.offset&&i<f.offset+f.bytes);
  const highlight=i=>{section.querySelectorAll('[data-field]').forEach(n=>n.classList.toggle('address-highlight',n.dataset.field===String(i)));};
  const grid=(indices,compressed)=>{
    const g=el('div','address-byte-grid'+(compressed?' compressed':''));
    indices.forEach((index,j)=>{
      const c=el('button','address-byte'+(!kept.has(index)?' omitted':''));c.type='button';c.dataset.field=String(group(index));
      const dst=a.indices.indexOf(index),byte=a.bytes[index].toString(16).padStart(2,'0');
      c.title=`ADRS[${index}] = 0x${byte}`+(a.compressed?(dst<0?' · 압축 시 제외':` → ADRSᶜ[${dst}]`):'');
      c.setAttribute('aria-label',c.title);
      c.append(el('small','',String(index)),el('code','',byte));
      c.onclick=()=>highlight(group(index));g.append(c);
    });return g;
  };
  serial.append(el('span','address-byte-label','원본 ADRS · 32 B'),grid(Array.from({length:32},(_,i)=>i),false));
  if(a.compressed){
    serial.append(el('p','address-projection','ADRS[3] ‖ ADRS[8:16] ‖ ADRS[19] ‖ ADRS[20:32]'));
    serial.append(el('span','address-byte-label','실제 코어 입력 ADRSᶜ · 22 B'),grid(a.indices,true));
  }
  serial.append(el('span','address-byte-label',`코어 입력 [${a.inputOffset}:${a.inputEnd}) · ${a.encoded.length} B · 패딩 전`));
  const hex=el('code','address-hex',a.encodedHex);hex.id='op-address-hex';serial.append(hex);
  const copy=el('button','address-copy','HEX 복사');copy.type='button';copy.onclick=async()=>{
    try{await navigator.clipboard.writeText(a.encodedHex);copy.textContent='복사됨';}catch{copy.textContent='아래 HEX를 선택해서 복사';const range=document.createRange();range.selectNodeContents(hex);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);}
  };serial.append(copy);section.append(serial);return section;
}
