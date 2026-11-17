(()=>{
 'use strict';
 const $=id=>document.getElementById(id),scene=window.SLHScene,encoder=new TextEncoder();
 const config={mode:'keygen',format:'pure',level:'128',profile:'f',family:'SHA2',prehash:'SHA-512',randomness:'hedged',messageEncoding:'text',contextEncoding:'text'};
 const params={'128s':[16,63,7,9,14,12,30],'128f':[16,66,22,3,33,6,34],'192s':[24,63,7,9,17,14,39],'192f':[24,66,22,3,33,8,42],'256s':[32,64,8,8,22,14,47],'256f':[32,68,17,4,35,9,49]};
 const names={keygen:'KeyGen',sign:'Sign',verify:'Verify'};
 const stepSets={
  keygen:[['전체 흐름',['message','wots','xmss','ht','signature'],'세 시드에서 최상위 XMSS 루트를 계산하고 키 쌍을 구성합니다.'],['시드',['message'],'SK.seed, SK.prf, PK.seed를 입력하거나 생성합니다.'],['PRF / 체인',['message','wots'],'체인별 주소로 PRF를 계산해 각각의 X₀를 생성하고, 각 체인에 F를 15번 적용해 X₁₅를 얻습니다.'],['WOTS+ pk',['wots'],'각 체인의 끝값들을 T_len으로 압축합니다.'],['XMSS 루트',['xmss','ht'],'최상위 XMSS의 모든 잎을 해시해 PK.root를 계산합니다.'],['키 출력',['signature'],'PK와 SK를 구성합니다. KeyGen은 서명을 만들지 않습니다.']],
  sign:[['전체 흐름',null,'메시지와 키에서 실제 서명과 선택 경로를 계산합니다.'],['M′ 구성',['message'],'Pure 또는 Hash 형식에 컨텍스트와 도메인 구분을 넣습니다.'],['R / digest',['message'],'랜덤화 값 R을 만들고 H_msg에서 md와 트리·잎 인덱스를 얻습니다.'],['FORS',['message','fors'],'트리마다 비밀값과 AUTH를 선택하고 FORS 공개키를 얻습니다.'],['WOTS+',['wots'],'메시지 숫자와 체크섬에 해당하는 체인 값을 서명에 넣습니다.'],['XMSS / HT',['xmss','ht'],'아래 계층의 루트를 위 계층의 WOTS+ 키로 서명합니다.'],['SIG 출력',['signature'],'R ‖ SIG_FORS ‖ SIG_HT를 출력합니다.']],
  verify:[['전체 흐름',null,'메시지·서명·공개키로 루트를 복원하고 비교합니다.'],['입력 검사',['signature'],'선택한 세트의 공개키와 서명 길이를 검사합니다.'],['digest',['message'],'동일한 M′와 서명 속 R로 digest를 다시 계산합니다.'],['FORS 복원',['fors'],'서명에 포함된 SK와 AUTH에서 FORS 공개키를 복원합니다.'],['WOTS+ 복원',['wots'],'서명 블록에서 시작해 남은 F 연산으로 체인 끝값을 얻습니다.'],['XMSS / HT',['xmss','ht'],'AUTH와 d개 계층을 거쳐 최상위 루트를 복원합니다.'],['루트 비교',['signature'],'복원 루트와 입력 공개키의 PK.root가 같아야 유효합니다.']]
 };
 let busy=false,worker=null,workerUrl=null,liveTrace=null,record=null,dirty=false,currentStep=0,timer=null,lastInspector='',jobId=0,lastParameterChange=null;
 const p=(c=config)=>{const [n,h,d,hp,k,a,m]=params[c.level+c.profile];return {n,h,d,hp,k,a,m,len:2*n+3,sig:(1+k*(a+1)+h+d*(2*n+3))*n};};
 const paramInfo={
   n:['n',' B',q=>`해시 블록과 각 시드의 길이: ${q.n}바이트.\nPK는 2n, SK는 4n바이트입니다.`],
   h:['h','',q=>`Hypertree의 전체 높이: ${q.h}.\nh = d × h′ = ${q.d} × ${q.hp}`],
   d:['d','',q=>`Hypertree의 XMSS 계층 수: ${q.d}.\n서명은 각 계층의 WOTS+ 서명과 인증 경로를 포함합니다.`],
   hp:['h′','',q=>`XMSS 트리 하나의 높이: ${q.hp}.\n트리당 ${2**q.hp}개의 WOTS+ 공개키 잎, 인증 경로는 ${q.hp}개 노드입니다.`],
   k:['k','',q=>`FORS의 독립된 이진 트리 수: ${q.k}.\n각 트리에서 비밀값 하나와 인증 경로를 서명에 넣습니다.`],
   a:['a','',q=>`FORS 트리 하나의 높이: ${q.a}.\n트리당 ${(2**q.a).toLocaleString()}개의 잎, 인증 경로는 ${q.a}개 노드입니다.`],
   len:['len','',q=>`WOTS+ 체인 수: ${q.len} = 2n + 3.\n메시지용 ${2*q.n}개 + 체크섬용 3개.\n체인마다 블록 하나를 선택하므로 WOTS+ 서명은 ${(q.len*q.n).toLocaleString()}바이트입니다.`],
   w:['w','',()=>`Winternitz 파라미터: 16 (모든 표준 세트에서 고정).\n체인에는 X₀부터 X₁₅까지 16개 값이 있고, 끝까지 F를 15번 적용합니다.`],
   m:['m',' B',q=>`H_msg 출력 길이: ${q.m}바이트.\nFORS 선택용 md와 Hypertree의 트리·잎 인덱스를 추출합니다.`]
 };
 const numericValues=q=>({...q,pk:2*q.n,sk:4*q.n});
 const valueLabel=key=>paramInfo[key]?.[0]||{pk:'PK',sk:'SK',sig:'SIG'}[key];
 const valueText=(key,value)=>value.toLocaleString()+(paramInfo[key]?.[1]??' B');
 function differences(before,after){const b=numericValues(before),a=numericValues(after);return ['n','h','d','hp','k','a','len','m','pk','sk','sig'].filter(key=>b[key]!==a[key]).map(key=>({key,before:b[key],after:a[key]}));}
 const optionLabel=(key,value)=>key==='profile'?value==='s'?'s · 작은 서명':'f · 빠른 생성':key==='format'?value==='pure'?'Pure':'Hash':value;
 function changeNote(change){
   if(change.key==='family')return '트리 구조·키 길이·서명 길이는 동일합니다. 내부 해시 계열이 바뀌므로 계산 결과는 달라집니다.';
   if(['format','prehash'].includes(change.key))return config.mode==='keygen'?'KeyGen에는 적용되지 않습니다. Sign / Verify에서 사용하는 메시지 전처리 설정입니다.':'메시지 전처리가 바뀝니다. 트리 구조·키 길이·서명 길이는 동일하며, 같은 메시지와 키의 서명 값은 달라집니다.';
   return change.beforeConfig.prehash!==change.afterConfig.prehash?'이 보안 세트에 맞춰 PH도 '+change.afterConfig.prehash+'로 전환했습니다.':'';
 }
 function parameterFeedback(q){
   const change=lastParameterChange,diffs=change?differences(change.before,change.after):[],changed=new Set(diffs.map(d=>d.key));
   $('level-impact').textContent=`n ${q.n} B · WOTS+ ${q.len}체인 · PK ${2*q.n} B / SK ${4*q.n} B`;
   $('profile-impact').textContent=`XMSS 높이 ${q.hp} · HT ${q.d}계층 · FORS ${q.k}트리 / 높이 ${q.a}`;
   $('fixed-params').replaceChildren(...Object.entries(paramInfo).map(([key,[label]])=>{
     const chip=document.createElement('span'),symbol=document.createElement('button'),value=document.createElement('span');
     chip.className='param-value-item'+(changed.has(key)?' changed':'');chip.dataset.param=key;
     symbol.type='button';symbol.className='param-symbol';symbol.dataset.paramHelp=key;symbol.textContent=label;symbol.setAttribute('aria-label',label+' 설명');
     value.className='param-value-number';value.textContent='= '+valueText(key,key==='w'?16:q[key]);chip.append(symbol,value);return chip;
   }));
   const box=$('parameter-change');box.hidden=!change;box.replaceChildren();if(!change)return;
   const title=document.createElement('span');title.className='change-title';title.textContent='최근 선택: '+optionLabel(change.key,change.from)+' → '+optionLabel(change.key,change.to);box.append(title);
   if(diffs.length){const items=document.createElement('div');items.className='change-items';for(const d of diffs){const item=document.createElement('span'),newValue=document.createElement('b');item.className='change-item';item.dataset.change=d.key;item.append(valueLabel(d.key)+' '+valueText(d.key,d.before)+' → ');newValue.textContent=valueText(d.key,d.after);item.append(newValue);items.append(item);}box.append(items);}
   const note=changeNote(change);if(note){const text=document.createElement('span');text.className='change-note';text.textContent=note;box.append(text);}
 }
 const tooltip=document.createElement('div');tooltip.id='parameter-tooltip';tooltip.className='param-tooltip';tooltip.role='tooltip';tooltip.hidden=true;document.body.append(tooltip);
 let tooltipAnchor=null,tooltipPinned=false;
 function hideTooltip(){tooltipAnchor?.removeAttribute('aria-describedby');tooltipAnchor=null;tooltipPinned=false;tooltip.hidden=true;}
 function tooltipText(target){
   if(target.dataset.paramHelp)return paramInfo[target.dataset.paramHelp][2](p());
   const key=target.dataset.setting,value=target.dataset.value,next={...config,[key]:value};
   if(next.level!=='128'&&['SHA-256','SHAKE128'].includes(next.prehash))next.prehash='SHA-512';
   const change={key,from:config[key],to:value,before:p(),after:p(next),beforeConfig:config,afterConfig:next};
   const diffs=differences(change.before,change.after);
   if(config[key]===value)return '현재 선택: '+optionLabel(key,value)+(changeNote(change)?'\n'+changeNote(change):'\n아래 값은 이 선택이 반영된 현재 파라미터입니다.');
   return optionLabel(key,value)+' 선택 시\n'+diffs.map(d=>valueLabel(d.key)+' '+valueText(d.key,d.before)+' → '+valueText(d.key,d.after)).join('\n')+(changeNote(change)?(diffs.length?'\n':'')+changeNote(change):'');
 }
 function showTooltip(target,pinned=false){
   if(busy||target.disabled)return;hideTooltip();tooltipAnchor=target;tooltipPinned=pinned;tooltip.textContent=tooltipText(target);tooltip.hidden=false;target.setAttribute('aria-describedby',tooltip.id);
   const r=target.getBoundingClientRect(),t=tooltip.getBoundingClientRect();tooltip.style.left=Math.max(12,Math.min(r.left,innerWidth-t.width-12))+'px';tooltip.style.top=Math.max(12,r.bottom+t.height+20>innerHeight?r.top-t.height-8:r.bottom+8)+'px';
 }
 function helpTarget(target){return target.closest('[data-param-help],[data-setting="level"],[data-setting="profile"],[data-setting="family"],[data-setting="format"],[data-setting="prehash"]');}
 document.addEventListener('pointerover',e=>{const target=helpTarget(e.target);if(e.pointerType!=='touch'&&target&&!target.contains(e.relatedTarget)&&!tooltipPinned)showTooltip(target);});
 document.addEventListener('pointerout',e=>{if(tooltipAnchor&&!tooltipPinned&&!tooltipAnchor.contains(e.relatedTarget)&&document.activeElement!==tooltipAnchor)hideTooltip();});
 document.addEventListener('focusin',e=>{const target=helpTarget(e.target);if(target)showTooltip(target);});
 document.addEventListener('focusout',()=>{if(!tooltipPinned)hideTooltip();});
 document.addEventListener('click',e=>{const target=e.target.closest('[data-param-help]');if(target){if(tooltipAnchor===target&&tooltipPinned)hideTooltip();else showTooltip(target,true);}});
 document.addEventListener('pointerdown',e=>{if(tooltipAnchor&&!tooltipAnchor.contains(e.target))hideTooltip();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')hideTooltip();});
 document.addEventListener('scroll',hideTooltip,true);window.addEventListener('resize',hideTooltip);
 const setName=()=>`SLH-DSA-${config.family}-${config.level}${config.profile}`;
 const hex=b=>Array.from(b,v=>v.toString(16).padStart(2,'0')).join('');
 function readHex(value,name,length){const s=value.trim().replace(/^0x/i,'').replace(/\s+/g,'');if(s.length%2||!/^[0-9a-f]*$/i.test(s))throw new Error(name+': 짝수 길이의 HEX를 입력하세요.');if(length!==undefined&&s.length!==length*2)throw new Error(name+': '+length+'바이트 ('+length*2+'자리 HEX)가 필요합니다.');return s.toLowerCase();}
 function inputBytes(id,encoding,name){return encoding==='text'?hex(encoder.encode($(id).value)):readHex($(id).value,name);}
 function randomHex(n){return hex(crypto.getRandomValues(new Uint8Array(n)));}
 function status(message,kind=''){const e=$('run-status');e.textContent=message;e.className='run-status'+(kind?' '+kind:'');}
 function stopPlayback(){if(timer)clearInterval(timer);timer=null;$('play').textContent='과정 재생';}
 function applyStep(index){const steps=stepSets[config.mode];currentStep=Math.max(0,Math.min(steps.length-1,index));$('steps').querySelectorAll('button').forEach((b,i)=>{b.classList.toggle('active',i===currentStep);b.setAttribute('aria-pressed',String(i===currentStep));});$('step-description').textContent=steps[currentStep][2];$('step-prev').disabled=currentStep===0;$('step-next').disabled=currentStep===steps.length-1;scene.step(steps[currentStep][1]);}
 function renderSteps(){stopPlayback();$('flow-label').textContent=names[config.mode]+' 과정';$('steps').replaceChildren(...stepSets[config.mode].map(([label],i)=>{const b=document.createElement('button');b.type='button';b.textContent=(i?i+'. ':'')+label;b.onclick=()=>{stopPlayback();applyStep(i);};return b;}));applyStep(0);}
 function invalidate(message='입력이 바뀌었습니다. 다시 실행하세요.'){
   if(busy)return;stopPlayback();liveTrace=null;dirty=!!record;$('play').disabled=true;$('trace-label').textContent=record?'다시 실행 필요':'구조 미리보기';
   scene.configure({parameter:setName(),format:config.format,mode:config.mode,stale:!!record,modules:stepSets[config.mode][currentStep]?.[1]||null});
   if(record){$('result-summary').textContent='이전 '+names[record.config.mode]+' 결과 · 현재 입력으로 다시 실행해야 합니다.';status(message,'stale');}else status('입력 대기 · 구조 미리보기');
   inspect();
 }
 function controls(){
   const q=p();
   document.querySelectorAll('[data-setting]').forEach(b=>{const key=b.dataset.setting;b.setAttribute('aria-pressed',String(config[key]===b.dataset.value));if(key==='prehash')b.disabled=config.level!=='128'&&['SHA-256','SHAKE128'].includes(b.dataset.value);});
   document.querySelectorAll('[data-modes]').forEach(e=>e.hidden=!e.dataset.modes.split(' ').includes(config.mode));
   $('prehash-field').hidden=config.format!=='hash'||config.mode==='keygen';
   $('format-note').textContent=config.mode==='keygen'?'KeyGen에는 메시지 형식이 적용되지 않습니다.':config.format==='pure'?'메시지에 도메인 구분과 ctx를 붙입니다.':'PH(M)에 알고리즘 식별자와 ctx를 붙입니다.';
   $('set-name').textContent=setName();parameterFeedback(q);
   $('sizes').textContent=`WOTS+ ${q.len}체인 · PK ${2*q.n} B · SK ${4*q.n} B · SIG ${q.sig.toLocaleString()} B`;
   $('seed-note').textContent=`빈칸은 자동 생성합니다. 각 시드 ${q.n}바이트 (${q.n*2}자리 HEX).`;
   $('sk-length').textContent=4*q.n+' B HEX';$('pk-length').textContent=2*q.n+' B HEX';$('sig-length').textContent=q.sig.toLocaleString()+' B HEX';$('rand-note').textContent=q.n+' B HEX · 빈칸이면 매번 새 난수';$('addrnd-field').hidden=config.randomness!=='hedged';
   $('run').textContent={keygen:'키 생성 실행',sign:'서명 생성 실행',verify:'서명 검증 실행'}[config.mode];
   $('context').closest('label').querySelector('.hint-text').textContent=(config.contextEncoding==='hex'?'HEX':'UTF-8')+' · 선택 사항 · 최대 255바이트';
   counts();
 }
 function counts(){try{$('message-count').textContent=(inputBytes('message',config.messageEncoding,'메시지').length/2).toLocaleString()+' bytes';}catch{$('message-count').textContent='HEX 형식 확인 필요';}}
 function setting(key,value){
   if(busy||config[key]===value)return;
   const old=config[key],beforeConfig={...config},before=p();hideTooltip();
   if(key==='messageEncoding'||key==='contextEncoding'){
     const id=key==='messageEncoding'?'message':'context';
     try{const bytes=old==='text'?encoder.encode($(id).value):Uint8Array.from(readHex($(id).value,id).match(/../g)||[],s=>parseInt(s,16));$(id).value=value==='hex'?hex(bytes):new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch(e){status('UTF-8 / HEX 전환 실패: '+e.message,'error');return;}
   }
   config[key]=value;
   if(config.level!=='128'&&['SHA-256','SHAKE128'].includes(config.prehash))config.prehash='SHA-512';
   if(['level','profile','family','format','prehash'].includes(key))lastParameterChange={key,from:old,to:value,before,after:p(),beforeConfig,afterConfig:{...config}};
   if(['level','profile','family'].includes(key)){
     $('secret-key').value='';$('public-key').value='';$('signature-input').value='';record=null;$('result-values').replaceChildren();$('next-actions').replaceChildren();$('result-summary').textContent='세트가 바뀌었습니다. 해당 세트로 키를 생성하거나 입력하세요.';$('save-result').disabled=true;
   }
   controls();renderSteps();
   if(['format','prehash'].includes(key)&&config.mode==='keygen'&&record?.config.mode==='keygen'&&!dirty){
     scene.configure({parameter:setName(),format:config.format,mode:config.mode});scene.trace(record.trace,{result:record.result});applyStep(0);inspect();
   }else invalidate();
 }
 document.querySelectorAll('[data-setting]').forEach(b=>b.onclick=()=>setting(b.dataset.setting,b.dataset.value));
 function setBusy(value){busy=value;$('settings').disabled=value;$('run').disabled=value;$('cancel').hidden=!value;$('run-progress').hidden=!value;if(value){hideTooltip();$('run-progress').value=0;$('play').disabled=true;}}
 function payload(){
   const q=p(),input={...config,parameter:setName()};
   if(config.mode==='keygen')input.seed=['sk-seed','sk-prf','pk-seed'].map(id=>$(id).value.trim()?readHex($(id).value,id,q.n):randomHex(q.n)).join('');
   else{
     input.message=inputBytes('message',config.messageEncoding,'메시지');input.context=inputBytes('context',config.contextEncoding,'컨텍스트');
     if(input.context.length/2>255)throw new Error('컨텍스트는 255바이트 이하여야 합니다. 현재 '+input.context.length/2+'바이트입니다.');
     if(config.mode==='sign'){
       if(!$('secret-key').value.trim())throw new Error('KeyGen 모드에서 키를 생성하거나 비밀키 SK를 입력하세요.');
       input.secretKey=readHex($('secret-key').value,'비밀키 SK',q.n*4);input.addrnd=config.randomness==='hedged'?($('addrnd').value.trim()?readHex($('addrnd').value,'추가 난수 addrnd',q.n):randomHex(q.n)):null;
     }else{
       input.publicKey=readHex($('public-key').value,'공개키 PK',q.n*2);input.signature=readHex($('signature-input').value,'서명 SIG');
       if(!input.signature)throw new Error('검증할 서명 SIG를 입력하세요.');
     }
   }return input;
 }
 function closeWorker(){if(worker)worker.terminate();worker=null;if(workerUrl)URL.revokeObjectURL(workerUrl);workerUrl=null;}
 function progress(stage,detail){
   const q=p();let fraction=0,description='계산 중…',index=0;
   if(stage==='seeds'){index=1;fraction=.05;description='시드 준비 · 최상위 XMSS 계산 시작';}
   if(stage==='keygen'){index=4;fraction=.08+.85*detail.completed/detail.total;description=`최상위 XMSS 잎 ${detail.completed} / ${detail.total} 계산`;}
   if(stage==='format'){liveTrace.format=detail;index=config.mode==='sign'?1:2;fraction=.03;description='M′ 구성 완료';}
   if(stage==='digest'){liveTrace.digest=detail;index=2;fraction=.06;description='H_msg 계산 · 실제 트리와 잎 인덱스 추출';}
   if(stage==='fors'){liveTrace.fors[detail.tree]=detail;index=3;fraction=.06+.52*detail.completed/detail.total;description=`FORS 루트 ${detail.completed} / ${detail.total} ${config.mode==='verify'?'복원':'계산'}`;}
   if(stage==='wots'){Object.assign(liveTrace.layers[detail.layer]||(liveTrace.layers[detail.layer]={}),detail);index=4;fraction=.59+.35*detail.layer/q.d;description='L'+detail.layer+' WOTS+ '+(config.mode==='verify'?'공개키 복원':'서명 생성');}
   if(stage==='hypertree'){Object.assign(liveTrace.layers[detail.layer]||(liveTrace.layers[detail.layer]={}),detail);index=5;fraction=.60+.35*detail.completed/detail.total;description=`HYPERTREE ${detail.completed} / ${detail.total}계층 완료`;}
   $('run-progress').value=Math.min(.98,fraction);status(description);$('trace-label').textContent='실제 계산 진행 중';scene.trace(liveTrace,{busy:true});applyStep(index);
 }
 function resultRow(label,value,id){
   if(value===undefined||value===null)return;const row=document.createElement('div');row.className='result-row';const l=document.createElement('label'),name=document.createElement('span'),copy=document.createElement('button'),area=document.createElement('textarea');name.textContent=label;copy.type='button';copy.textContent='복사';area.readOnly=true;area.spellcheck=false;area.className='mono';area.rows=id==='result-signature'?4:2;area.id=id;area.value=String(value);l.htmlFor=id;l.append(name,copy);row.append(l,area);$('result-values').append(row);
   copy.onclick=async()=>{try{await navigator.clipboard.writeText(area.value);copy.textContent='복사됨';}catch{area.focus();area.select();document.execCommand('copy');copy.textContent='복사됨';}setTimeout(()=>copy.textContent='복사',1200);};
 }
 function showResult(bundle){
   const {result:r,trace:t,elapsed}=bundle,q=p();record={...bundle,config:{...config},parameter:setName()};dirty=false;liveTrace=t;$('result-values').replaceChildren();$('next-actions').replaceChildren();
   $('result-summary').textContent=`${setName()} · ${names[config.mode]} · ${(elapsed/1000).toFixed(3)}초`;
   if(config.mode==='keygen'){
     $('secret-key').value=r.secretKey;$('public-key').value=r.publicKey;
     resultRow('공개키 PK · '+q.n*2+' B',r.publicKey,'result-public-key');resultRow('비밀키 SK · '+q.n*4+' B',r.secretKey,'result-secret-key');resultRow('PK.root',t.keygen?.root,'result-root');
     resultRow('사용된 SK.seed',r.secretKey.slice(0,q.n*2),'result-sk-seed');resultRow('사용된 SK.prf',r.secretKey.slice(q.n*2,q.n*4),'result-sk-prf');resultRow('사용된 PK.seed',r.publicKey.slice(0,q.n*2),'result-pk-seed');
     const b=document.createElement('button');b.type='button';b.textContent='이 키로 Sign';b.onclick=()=>setting('mode','sign');$('next-actions').append(b);status('키 생성 완료','success');
   }else if(config.mode==='sign'){
     $('signature-input').value=r.signature;$('public-key').value=r.publicKey;
     resultRow('서명 SIG · '+(r.signature.length/2).toLocaleString()+' B',r.signature,'result-signature');resultRow('R',r.randomizer,'result-r');resultRow('opt_rand · '+t.randomness.variant,t.randomness.optRand,'result-opt-rand');resultRow('FORS pk',t.forsPk,'result-fors-pk');resultRow('digest',t.digest?.digest,'result-digest');
     resultRow('M′ · '+t.format.formattedLength+' B (앞 128 B)',t.format.formattedPrefix,'result-mprime');
     if(t.format.prehash)resultRow('PH(M)',t.format.prehash,'result-ph');
     const b=document.createElement('button');b.type='button';b.textContent='이 서명 Verify';b.onclick=()=>setting('mode','verify');$('next-actions').append(b);status('서명 생성 완료','success');
   }else{
     const badge=document.createElement('div');badge.className='result-badge'+(r.valid?'':' invalid');badge.id='verify-result';badge.textContent=r.valid?'VALID · 서명 유효':'INVALID · 서명 검증 실패';$('result-values').append(badge);
     if(r.signatureBytes!==r.expectedSignatureBytes)resultRow('서명 길이 불일치',r.signatureBytes+' B / 기대 '+r.expectedSignatureBytes+' B','result-length');
     resultRow('복원한 PK.root',t.comparison?.recovered,'result-recovered');resultRow('입력 PK.root',t.comparison?.expected||r.publicKey?.slice(q.n*2),'result-expected');resultRow('digest',t.digest?.digest,'result-digest');resultRow('FORS pk',t.forsPk,'result-fors-pk');
     if(t.format.prehash)resultRow('PH(M)',t.format.prehash,'result-ph');
     status(r.valid?'검증 완료 · 루트 일치':'검증 완료 · 유효하지 않은 서명',r.valid?'success':'error');
   }
   scene.trace(t,{result:r});applyStep(0);$('trace-label').textContent='실제 계산 결과';$('play').disabled=false;$('save-result').disabled=false;inspect();
 }
 $('run').onclick=()=>{
   if(busy)return;let input;try{input=payload();}catch(e){status(e.message,'error');return;}
   stopPlayback();const id=++jobId;setBusy(true);dirty=false;status('계산 준비 중…');liveTrace={mode:config.mode,digest:null,fors:[],layers:{}};scene.configure({parameter:setName(),format:config.format,mode:config.mode,modules:stepSets[config.mode][0][1]});scene.trace(liveTrace,{busy:true});
   workerUrl=URL.createObjectURL(new Blob([JSON.parse($('slh-worker-source').textContent)],{type:'text/javascript'}));worker=new Worker(workerUrl);
   worker.onmessage=({data})=>{if(id!==jobId)return;if(data.type==='progress')progress(data.stage,data.detail);else if(data.type==='result'){setBusy(false);closeWorker();showResult(data);}else if(data.type==='error'){setBusy(false);closeWorker();status(data.message,'error');$('trace-label').textContent='계산 오류';scene.configure({parameter:setName(),format:config.format,mode:config.mode});}};
   worker.onerror=e=>{if(id!==jobId)return;setBusy(false);closeWorker();status('계산 오류: '+e.message,'error');};worker.postMessage(input);
 };
 $('cancel').onclick=()=>{jobId++;closeWorker();setBusy(false);invalidate('계산을 중단했습니다.');status('계산 중단 · 완료 결과 없음');};
 $('random-seeds').onclick=()=>{const q=p();for(const id of ['sk-seed','sk-prf','pk-seed'])$(id).value=randomHex(q.n);invalidate();};
 for(const id of ['message','context','secret-key','public-key','signature-input','sk-seed','sk-prf','pk-seed','addrnd'])$(id).addEventListener('input',()=>{counts();invalidate();});
 $('message-file').onchange=async()=>{const file=$('message-file').files[0];if(!file)return;try{$('message').value=hex(new Uint8Array(await file.arrayBuffer()));config.messageEncoding='hex';controls();invalidate();}catch(e){status(e.message,'error');}};
 document.querySelectorAll('[data-focus]').forEach(b=>b.onclick=()=>scene.focus(b.dataset.focus));
 function setCanvasFont(value){const size=scene.fontSize(value);$('font-size').textContent=Math.round(size/14*100)+'%';$('font-smaller').disabled=size<=12;$('font-larger').disabled=size>=22;}
 $('font-smaller').onclick=()=>setCanvasFont(scene.fontSize()-1);$('font-larger').onclick=()=>setCanvasFont(scene.fontSize()+1);setCanvasFont(14);
 $('navigator').onclick=e=>{const rect=$('navigator').getBoundingClientRect(),bounds=window.slhCanvas.world;scene.panTo(bounds.x+(e.clientX-rect.left)/rect.width*bounds.w,(e.clientY-rect.top)/rect.height*bounds.h);};
 $('toggle-input').onclick=()=>{const collapsed=$('input-panel').classList.toggle('collapsed');document.querySelector('.app').classList.toggle('inputs-collapsed',collapsed);$('toggle-input').textContent=collapsed?'입력 열기':'입력 접기';};
 $('step-prev').onclick=()=>{stopPlayback();applyStep(currentStep-1);};$('step-next').onclick=()=>{stopPlayback();applyStep(currentStep+1);};
 $('play').onclick=()=>{if(timer){stopPlayback();return;}applyStep(0);$('play').textContent='재생 중단';timer=setInterval(()=>{if(currentStep===stepSets[config.mode].length-1){stopPlayback();return;}applyStep(currentStep+1);},1200);};
 function inspect(){const s=scene.inspect(),key=JSON.stringify(s);if(key===lastInspector)return;lastInspector=key;const e=s.element;if(!s.actual||!e){$('block-info').textContent=config.mode==='keygen'?'KeyGen은 SIG_WOTS를 생성하지 않습니다.':'실행 후 실제 서명 블록을 표시합니다.';return;}$('block-info').textContent=`L${s.layer} · 체인 ${e.chain}\nb=${e.step} → SIG_WOTS[${e.chain}]=${e.symbol}\n${e.bytes} bytes · 생성 F ${e.generationSteps}회 / 검증 F ${e.verificationSteps}회\n서명 값: ${e.value||'계산 중'}\nWOTS+ 입력 M: ${s.message}`;}
 window.addEventListener('slh-scene-change',inspect);
 $('save-result').onclick=()=>{if(!record)return;const url=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=record.parameter+'-'+record.config.mode+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);};
 $('licenses').textContent=JSON.parse($('license-data').textContent);
 controls();renderSteps();scene.configure({parameter:setName(),format:config.format,mode:config.mode,modules:stepSets[config.mode][0][1]});
 Object.defineProperty(window,'slhApp',{get:()=>({config:{...config},busy,dirty,currentStep,record,liveTrace})});
 const operationPanel=document.createElement('section');operationPanel.className='operation-panel';operationPanel.id='operation-panel';operationPanel.hidden=true;operationPanel.setAttribute('aria-label','선택한 연산 정보');
 operationPanel.innerHTML='<div class="op-panel-controls"><div class="op-panel-header"><strong id="op-title"></strong><button id="close-operation" type="button" aria-label="연산 정보 닫기">×</button></div><div id="op-tabs" role="group" aria-label="연산 선택"></div></div><p id="op-where"></p><div id="op-selection" class="op-selection"></div><div class="op-io"><span id="op-payload"></span><b>→</b><strong id="op-out"></strong></div><p id="op-input-scope" class="hint-text"></p><div class="op-core" id="op-core"></div><span class="op-label" id="op-parts-label"></span><div id="op-parts"></div><p id="op-total"></p><p id="op-detail"></p><div id="op-shake-padding" hidden></div><p id="op-note"></p>';
 $('stage').append(operationPanel);
 let selectedOperation='F',selectedInvocation=null,lastOperation='',addressExpanded=true,addressSerialOpen=false;
 const sizeString=v=>v===null?'가변':v.toLocaleString()+' B';
 function updateOperation(){
   if(operationPanel.hidden)return;const models=scene.operationModels(),model=models[selectedOperation];if(!model)return;
   const address=scene.operationAddress(selectedOperation,selectedInvocation);
   const signature=JSON.stringify([model,config.mode,config.randomness,address]);if(signature===lastOperation)return;lastOperation=signature;
   $('op-title').textContent=model.id+(model.used?'':' · 현재 모드 미사용');$('op-where').textContent=model.where;
   const hmac=model.core.startsWith('HMAC-'),firstSha=model.id==='H_msg'&&model.core.includes('MGF1'),inputLabel=hmac?'HMAC 데이터':firstSha?'첫 SHA 입력':'코어 입력';
   $('op-payload').textContent=inputLabel+' '+sizeString(model.raw);$('op-out').textContent='출력 '+sizeString(model.output);
   $('op-input-scope').textContent=hmac?'패딩 전 HMAC 데이터 길이 · 키 및 ipad/opad 처리는 별도':firstSha?'패딩 전 첫 SHA 입력 · 이후 MGF1 처리 포함 결과가 출력':'패딩 전 전체 입력 · 그중 페이로드 '+sizeString(model.payload);
   $('op-parts-label').textContent=(hmac?'HMAC 데이터':firstSha?'첫 SHA 입력':'전체 코어 입력')+' 구성 · 패딩 전';
   $('op-core').textContent=model.core;$('op-total').textContent=(hmac?'HMAC 데이터 합계 ':'입력 필드 합계 ')+sizeString(model.raw);
   $('op-detail').textContent=model.detail;$('op-note').textContent=model.note;
   const padding=renderShakePadding(model);$('op-shake-padding').hidden=!padding;$('op-shake-padding').replaceChildren(...(padding?[padding]:[]));
   $('op-selection').replaceChildren();
   const selectionLabel=document.createElement('small'),selectionLocation=document.createElement('strong'),selectionStatus=document.createElement('small');
   selectionLabel.textContent=address?(address.exact?'선택한 호출':'현재 선택 위치의 대표 호출'):'메시지 단위 연산';
   selectionLocation.textContent=address?address.location:'ADRS 입력 없음';
   selectionStatus.textContent=address?address.status+(address.used?'':' · 현재 모드에서 이 호출은 실행하지 않음'):selectedOperation==='H_msg'?'출력에서 FORS 선택값과 Hypertree 위치를 추출':'R 생성에 사용 · 트리 위치를 입력받지 않음';
   $('op-selection').append(selectionLabel,selectionLocation,selectionStatus);
   $('op-parts').replaceChildren(...model.parts.map(([name,bytes])=>{
     const isAddress=name.startsWith('ADRS'),part=document.createElement(isAddress?'button':'div'),label=document.createElement('span'),value=document.createElement('b'),origin=document.createElement('small');part.className='op-part';
     let source='내부 데이터',kind='field';
     if(name.startsWith('ADRS')){source='내부 주소 생성';kind='control';}
     else if(name==='0 채움'){source='내부 상수';kind='control';}
     else if(['SK.seed','SK.prf','PK.seed','PK.root'].includes(name)||(selectedOperation==='PRF'&&name==='payload')){
       const field=selectedOperation==='PRF'&&name==='payload'?'SK.seed':name;
       source=config.mode==='keygen'?'외부 시드':config.mode==='verify'&&field.startsWith('PK.')?'PK 필드':'SK 필드';kind=config.mode==='keygen'?'external':'field';
     }else if(name==='R')source=config.mode==='verify'?'SIG 필드':'PRF_msg 결과';
     else if(name==='M′')source='내부 전처리 결과';
     else if(name==='opt_rand'){source=config.randomness==='hedged'?'외부 난수':'SK의 PK.seed';kind=config.randomness==='hedged'?'external':'field';}
     part.classList.add('source-'+kind);label.textContent=name;origin.textContent=source;label.append(origin);value.textContent=sizeString(bytes);part.append(label,value);
     if(isAddress&&address){
       const fragment=document.createDocumentFragment(),detail=renderOperationAddress(address,{serialOpen:addressSerialOpen,onSerialToggle:v=>{addressSerialOpen=v;}});
       part.type='button';part.classList.add('address-toggle');part.setAttribute('aria-controls','op-address');part.setAttribute('aria-expanded',String(addressExpanded));
       detail.hidden=!addressExpanded;origin.textContent=source+` · 코어[${address.inputOffset}:${address.inputEnd})`;
       value.textContent=sizeString(bytes)+(addressExpanded?' ▴':' ▾');
       part.onclick=()=>{addressExpanded=!addressExpanded;detail.hidden=!addressExpanded;part.setAttribute('aria-expanded',String(addressExpanded));value.textContent=sizeString(bytes)+(addressExpanded?' ▴':' ▾');};
       fragment.append(part,detail);return fragment;
     }
     return part;
   }));
   $('op-tabs').replaceChildren(...Object.keys(models).map(id=>{const b=document.createElement('button');b.type='button';b.textContent=id;b.setAttribute('aria-pressed',String(id===selectedOperation));b.onclick=()=>openOperation(id);return b;}));
 }
 function openOperation(selection){nodePanel.hidden=true;if(typeof selection==='object'){selectedOperation=selection.id||selection.operation;selectedInvocation={...selection};addressExpanded=true;}else selectedOperation=selection;lastOperation='';operationPanel.hidden=false;$('open-operation').setAttribute('aria-expanded','true');updateOperation();}
 function closeOperation(){operationPanel.hidden=true;$('open-operation').setAttribute('aria-expanded','false');}
 $('open-operation').onclick=()=>operationPanel.hidden?openOperation(selectedOperation):closeOperation();$('close-operation').onclick=closeOperation;
 window.addEventListener('slh-operation-select',e=>openOperation(e.detail));window.addEventListener('slh-scene-change',updateOperation);
 const nodePanel=document.createElement('section');nodePanel.id='node-panel';nodePanel.className='operation-panel node-panel';nodePanel.hidden=true;nodePanel.setAttribute('aria-label','선택한 값 정보');
 nodePanel.innerHTML='<div class="op-panel-controls"><div class="op-panel-header"><strong id="node-title"></strong><button type="button" id="close-node" aria-label="노드 정보 닫기">×</button></div></div><div id="node-body"></div>';$('stage').append(nodePanel);
 let selectedNode=null,lastNode='';
 function updateNode(){
   if(nodePanel.hidden||!selectedNode)return;const info=scene.inspectTreeNode(selectedNode),signature=JSON.stringify(info);if(signature===lastNode)return;lastNode=signature;
   $('node-title').textContent=info.title;$('node-body').replaceChildren(renderTreeNodeInfo(info,openOperation));
 }
 window.addEventListener('slh-node-select',e=>{selectedNode={...e.detail};lastNode='';closeOperation();nodePanel.hidden=false;nodePanel.scrollTop=0;updateNode();});
 window.addEventListener('slh-scene-change',updateNode);$('close-node').onclick=()=>{nodePanel.hidden=true;};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeOperation();nodePanel.hidden=true;}});
})();
