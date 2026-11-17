let messageFormatCache=null;
function messageFormatData(){
  const cfg=window.slhApp?.config||{},trace=execution.trace?.format,format=state.format,ph=cfg.prehash||'SHA-512';
  const key=[$('message').value,$('context').value,cfg.messageEncoding,cfg.contextEncoding,format,ph,trace?.prehash,trace?.oid];
  if(messageFormatCache&&key.every((v,i)=>v===messageFormatCache.key[i]))return messageFormatCache;
  const encode=(value,encoding,name)=>{
    if(encoding!=='hex')return new TextEncoder().encode(value);
    const s=value.trim().replace(/^0x/i,'').replace(/\s/g,'');
    if(!/^[a-f\d]*$/i.test(s)||s.length%2)throw Error(name+' HEX 형식을 확인하세요.');
    return Uint8Array.from(s.match(/../g)||[],v=>parseInt(v,16));
  };
  const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  let message=null,context=null,error=null;
  try{message=encode(key[0],key[2],'메시지');context=encode(key[1],key[3],'컨텍스트');if(context.length>255)error='ctx는 최대 255 B입니다. 현재 '+context.length+' B입니다.';}catch(e){error=e.message;}
  const hash=format==='hash',digestBytes=['SHA-256','SHAKE128'].includes(ph)?32:64;
  const oid=hash?Uint8Array.from([6,9,0x60,0x86,0x48,1,0x65,3,4,2,{'SHA-256':1,'SHA-512':3,'SHAKE128':11,'SHAKE256':12}[ph]]):null;
  const actualDigest=hash&&trace?.oid===hex(oid)&&trace?.prehash?.length===digestBytes*2?Uint8Array.from(fromHex(trace.prehash)):null;
  let offset=0;const fields=[],streams=[];
  const field=(id,label,bytes,value,meaning)=>{
    const start=offset;offset=offset===null||bytes===null?null:offset+bytes;
    fields.push({id,label,bytes,start,end:offset,hex:value?hex(value.subarray(0,256)):null,known:!!value,truncated:!!value&&value.length>256,meaning});
    streams.push(value);
  };
  field('domain','도메인 구분',1,Uint8Array.of(hash?1:0),hash?'0x01 · HashSLH-DSA':'0x00 · Pure SLH-DSA');
  field('contextLength','len(ctx)',1,context&&context.length<=255?Uint8Array.of(context.length):null,'ctx의 바이트 길이를 1 B 정수로 표현 · 0~255');
  field('context','ctx',context?.length??null,context,'사용자가 입력한 컨텍스트 바이트');
  if(hash){field('oid','OID(PH)',11,oid,ph+'의 ASN.1 DER 알고리즘 식별자');field('prehash','PH(M)',digestBytes,actualDigest,ph+'(M) · 입력 '+(message?.length??'?')+' B → 출력 '+digestBytes+' B');}
  else field('message','M',message?.length??null,message,'사용자가 입력한 메시지 바이트');
  const complete=!error&&streams.every(v=>v!==null),prefix=[];
  if(complete)for(const bytes of streams){const take=Math.min(256-prefix.length,bytes.length);for(let i=0;i<take;i++)prefix.push(bytes[i]);if(prefix.length===256)break;}
  const formula=hash?'0x01 ‖ len(ctx) ‖ ctx ‖ OID(PH) ‖ PH(M)':'0x00 ‖ len(ctx) ‖ ctx ‖ M';
  const model={kind:'messagePrime',title:'M′ · '+(hash?'HashSLH-DSA':'Pure SLH-DSA'),format,prehash:hash?ph:null,formula,fields,bytes:offset,messageBytes:message?.length??null,contextBytes:context?.length??null,hex:complete?hex(prefix):null,truncated:complete&&offset>256,
    error,complete,status:error||(!hash?'현재 입력에서 구성한 M′':actualDigest?'실제 PH(M) 계산 결과 반영':'실행 후 PH(M)와 전체 M′ HEX 표시'),
    description:'왼쪽 필드부터 순서대로 연결합니다. 필드 사이에는 추가 구분자나 해시 패딩을 넣지 않습니다.',inputs:[]};
  messageFormatCache={key,model,streams};return messageFormatCache;
}
function messageFormatModel(){return messageFormatData().model;}
function messageFormatHex(fieldId){
  const data=messageFormatData(),hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  if(fieldId!==undefined){const i=data.model.fields.findIndex(f=>f.id===fieldId);return i>=0&&data.streams[i]!==null?hex(data.streams[i]):null;}
  return data.model.complete?data.streams.map(hex).join(''):null;
}
function drawMessageFormatter(){
  const f=geo.messageLayout.format,m=messageFormatModel(),hash=m.format==='hash';
  box(f.x,f.y,f.w,f.h,'active',12);label('M′ 구성',f.x+f.w/2,f.y+56,46,{align:'center'});
  text(hash?'Hash · '+m.prehash:'Pure',f.x+f.w/2,f.y+96,26,{align:'center',color:C.muted});
  const lengthByte=(m.fields[1].hex?.toUpperCase()??'??')+' · 1 B';
  const cells=hash?[['01','1 B',44],['len(ctx)',lengthByte,118],['ctx',(m.contextBytes??'?')+' B',62],['OID(PH)','11 B',106],['PH(M)',m.fields.at(-1).bytes+' B',100]]:
    [['00','1 B',44],['len(ctx)',lengthByte,118],['ctx',(m.contextBytes??'?')+' B',62],['M',(m.messageBytes??'?')+' B',140]];
  const gap=8,totalWidth=cells.reduce((sum,c)=>sum+c[2],0)+(cells.length-1)*gap;
  let x=f.x+(f.w-totalWidth)/2;
  cells.forEach(([title,size,w],i)=>{
    const y=f.y+140;
    if(i)text('‖',x-gap/2,y+42,16,{align:'center',color:C.muted});
    box(x,y,w,64,'neutral',5);text(title,x+w/2,y+27,24,{align:'center'});text(size,x+w/2,y+52,20,{align:'center',color:C.muted});x+=w+gap;
  });
  text(m.error?'입력 형식 확인':'M′ · '+(m.bytes??'?')+' B · 클릭해서 필드 보기',f.x+f.w/2,f.y+f.h+70,28,{align:'center',color:C.muted});
  geo.messageFormat={...f,formula:m.formula,bytes:m.bytes,fields:m.fields.map(({id,label,bytes,start,end})=>({id,label,bytes,start,end}))};
}
