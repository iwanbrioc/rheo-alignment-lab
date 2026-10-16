import {CATEGORIES,PORTAL_KINDS,sampleState,validateState,newPortal,connect,portalConnections,nextId,proposeSession,togglePath,myPathSessions,pathHasOverlap} from './model.mjs';
import {makePortalToken,parsePortalToken,mergeReceivedPortal} from './bitchat-carrier.mjs';

const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='rheo-mesh-v04-living-commons';
const colours={Essentials:'#a47d50',Belonging:'#7982aa',Learning:'#6d9882',Creativity:'#aa7e85',Nature:'#568b61',Purpose:'#548898'};
const short=(text,n=120)=>text.length>n?text.slice(0,n-1)+'…':text;
let state,selected='p5',filter='All',term='',tab='mycelium';
let storageAvailable=true;
let toastTimer;
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,5000);}
function restore(){try{const raw=localStorage.getItem(KEY);return raw?validateState(JSON.parse(raw)):sampleState();}catch{storageAvailable=false;return sampleState();}}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));storageAvailable=true;}catch{storageAvailable=false;toast('Browser storage is unavailable; this session will not persist.');}}
function setState(next){state=validateState(next);persist();render();}
function portalById(id){return state.portals.find(p=>p.id===id);}
function related(portalId){return portalConnections(state,portalId);}
function showTab(name){tab=name;for(const view of ['mycelium','portals','matrix','exchange']){$(view+'-panel').hidden=view!==name;}document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===name);if(b.dataset.tab===name)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});render();}
function filtered(){const q=term.toLocaleLowerCase();return state.portals.filter(p=>(filter==='All'||p.category===filter)&&(!q||[p.name,p.description,p.steward,p.category].some(v=>v.toLocaleLowerCase().includes(q))));}
function renderGraph(){
 const seen=new Set(filtered().map(p=>p.id));const visible=state.portals.filter(p=>seen.has(p.id));const activeLinks=state.links.filter(l=>seen.has(l.from)&&seen.has(l.to));
 let out='<defs><radialGradient id="moss"><stop stop-color="#c1ddc1"/><stop offset="1" stop-color="#ffffff"/></radialGradient></defs>';
 for(const l of activeLinks){const a=portalById(l.from),b=portalById(l.to);if(!a||!b)continue;const dx=b.x-a.x,dy=b.y-a.y;const sway=Math.min(38,Math.abs(dx)*.12+8)*(l.id.charCodeAt(l.id.length-1)%2===0?1:-1);const cx=(a.x+b.x)/2-dy/Math.max(1,Math.hypot(dx,dy))*sway;const cy=(a.y+b.y)/2+dx/Math.max(1,Math.hypot(dx,dy))*sway;const highlight=l.from===selected||l.to===selected;out+='<path class="graph-link'+(highlight?' related':'')+'" d="M '+a.x+' '+a.y+' Q '+cx.toFixed(1)+' '+cy.toFixed(1)+' '+b.x+' '+b.y+'"><title>'+esc(l.relation)+'</title></path>';}
 for(const p of visible){const chosen=p.id===selected;out+='<g class="graph-node'+(chosen?' selected':'')+'" data-node="'+esc(p.id)+'" role="button" tabindex="0" aria-label="Inspect '+esc(p.name)+'" transform="translate('+p.x+','+p.y+')"><circle class="halo" r="'+(chosen?24:20)+'"/><circle class="core" r="12" fill="'+colours[p.category]+'" style="fill:'+colours[p.category]+'"/><circle fill="#fcfff8" opacity=".85" r="4"/><text x="0" y="-30" text-anchor="middle">'+esc(short(p.name,25))+'</text></g>';}
 $('graph').innerHTML=out;
 $('graph').querySelectorAll('[data-node]').forEach(g=>{const choose=()=>{selected=g.dataset.node;render();};g.addEventListener('click',choose);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}});});
 $('graph-summary').textContent=state.portals.length+' portals · '+state.links.length+' connections';
}
function renderCards(){const rows=filtered();$('portal-count').textContent=rows.length+' visible';$('filters').innerHTML=['All',...CATEGORIES].map(c=>'<button data-category="'+esc(c)+'" class="chip'+(c===filter?' active':'')+'" aria-pressed="'+(c===filter)+'">'+esc(c)+'</button>').join('');
 $('portal-cards').innerHTML=rows.map(p=>'<button class="portal-card'+(p.id===selected?' selected':'')+'" data-portal="'+esc(p.id)+'"><span class="tiny-label">'+esc(p.category)+' · '+esc(p.kind)+'</span><strong>'+esc(p.name)+'</strong><p>'+esc(short(p.description,110))+'</p><div class="meta"><span>'+related(p.id).length+' connections</span><span>'+(p.received?'Received · unverified':p.demo?'Fictional sample':'On this device')+'</span></div></button>').join('')||'<p class="small" style="padding:20px">No matching portals. Change your search or pathway.</p>';
 $('portal-cards').querySelectorAll('[data-portal]').forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.portal;render();}));
 $('filters').querySelectorAll('[data-category]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.category;render();}));
}
function renderDetail(){const p=portalById(selected);if(!p){$('detail').innerHTML='<p class="detail-empty">Select a portal to inspect the web of possibilities around it.</p>';return;}
 const links=related(p.id);$('detail').innerHTML='<div><span class="tiny-label">'+esc(p.kind)+' / '+esc(p.category)+'</span><h2>'+esc(p.name)+'</h2><p>'+esc(p.description)+'</p><p class="small">Steward: '+esc(p.steward||'Not specified')+'<br>Source: '+(p.received?'Received token · not verified':p.demo?'Fictional demonstration':'Created locally')+'<br>'+(p.shareable?'Marked shareable':'Not marked for sharing')+'</p><button id="share-selected" class="button secondary">Prepare for Bitchat ↗</button></div><div class="detail-links"><span class="eyebrow">MYCELIAL CONNECTIONS / '+links.length+'</span><ul>'+links.map(l=>{const other=portalById(l.from===p.id?l.to:l.from);return '<li><strong>'+esc(other?.name||'Unknown')+'</strong> — '+esc(l.relation)+'</li>';}).join('')+'</ul>'+(links.length?'':'<p class="small">No connections recorded yet.</p>')+'</div>';
 $('share-selected').addEventListener('click',()=>{showTab('exchange');$('share-select').value=p.id;prepare();});
}
function renderDirectory(){ $('all-portals').innerHTML=state.portals.map(p=>'<button class="directory-item" data-id="'+esc(p.id)+'"><span class="tiny-label">'+esc(p.category)+' / '+esc(p.kind)+'</span><h3>'+esc(p.name)+'</h3><p>'+esc(short(p.description,150))+'</p><span class="small">'+related(p.id).length+' connections · '+(p.demo?'Fictional sample':p.received?'Imported (unverified)':'Created locally')+'</span></button>').join('');$('all-portals').querySelectorAll('[data-id]').forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.id;filter='All';term='';$('search').value='';showTab('mycelium');$('detail').scrollIntoView({block:'nearest',behavior:'smooth'});}));}
function renderExchange(){const old=$('share-select').value;$('share-select').innerHTML=state.portals.filter(p=>p.shareable).map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+(p.demo?' (sample)':'')+'</option>').join('');$('share-select').value=state.portals.some(p=>p.id===old&&p.shareable)?old:state.portals.some(p=>p.id===selected&&p.shareable)?selected:$('share-select').options[0]?.value||'';}
function renderMatrix(){
 const timeSlots=Array.from({length:18},(_,i)=>`${String(9+Math.floor(i/2)).padStart(2,'0')}:${i%2?'30':'00'}`);
 const spaces=[...new Set(state.sessions.map(s=>s.space))].sort();const picked=new Set(state.myPath);
 const grid=$('matrix-grid'); grid.style.setProperty('--slot-count',timeSlots.length);
 let html='<div class="matrix-corner">Space ↓ · Time →</div>'+timeSlots.map(t=>'<div class="matrix-hour">'+t+'</div>').join('');
 for(const space of spaces){html+='<div class="matrix-space">'+esc(space)+'</div>';
  for(const t of timeSlots){const matches=state.sessions.filter(s=>s.space===space&&s.start<=t&&s.end>t);html+='<div class="matrix-cell">'+matches.filter(s=>s.start===t).map(s=>{const span=Math.max(1,timeSlots.filter(slot=>slot>=s.start&&slot<s.end).length);return '<button class="session-pill'+(picked.has(s.id)?' chosen':'')+'" data-session="'+esc(s.id)+'" style="--sp:'+span+'" aria-pressed="'+picked.has(s.id)+'"><span class="session-time">'+esc(s.start)+'–'+esc(s.end)+'</span><strong>'+esc(s.title)+'</strong><span>'+esc(state.portals.find(p=>p.id===s.portalId)?.name||'Portal')+'</span></button>';}).join('')+'</div>';}
 }
 grid.innerHTML=html;
 grid.querySelectorAll('[data-session]').forEach(b=>b.addEventListener('click',()=>{setState(togglePath(state,b.dataset.session));}));
 const path=myPathSessions(state);
 $('path-items').innerHTML=path.length?path.map(s=>'<div class="path-item"><div><span class="tiny-label">'+esc(s.start)+'–'+esc(s.end)+' · '+esc(s.space)+'</span><strong>'+esc(s.title)+'</strong><p class="small">'+esc(state.portals.find(p=>p.id===s.portalId)?.name||'Portal')+'</p></div><button class="text-btn" data-remove="'+esc(s.id)+'">Leave</button></div>').join(''):'<p class="small">Choose activities on the matrix to weave your own day.</p>';
 $('path-warning').textContent=pathHasOverlap(state)?'Some choices overlap. Follow the Law of Two Feet: choose freely, and change your path as the day unfolds.':path.length?`${path.length} activity invitation${path.length===1?'':'s'} in My Path. You can change your mind.`:'';
 $('path-items').querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',()=>setState(togglePath(state,b.dataset.remove))));
}
function render(){renderGraph();renderCards();renderDetail();renderDirectory();renderExchange();renderMatrix();}
function modal(type){$('composer').hidden=false;$('modal-title').textContent=type==='portal'?'Create a portal':type==='session'?'Propose an activity':'Grow a connection';$('portal-form').hidden=type!=='portal';$('connection-form').hidden=type!=='link';$('session-form').hidden=type!=='session';$('form-error').textContent='';if(type==='link'){$('connection-form').elements.from.innerHTML=state.portals.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join('');$('connection-form').elements.to.innerHTML=$('connection-form').elements.from.innerHTML;$('connection-form').elements.from.value=selected;$('connection-form').elements.to.value=state.portals.find(p=>p.id!==selected)?.id||'';}else if(type==='session'){$('session-form').elements.portalId.innerHTML=state.portals.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join('');$('session-form').elements.portalId.value=selected||state.portals[0]?.id;$('session-form').elements.title.value='';$('session-form').elements.space.value='';$('session-form').elements.description.value='';}else $('portal-form').reset();setTimeout(()=>$('composer').querySelector('form:not([hidden]) input,form:not([hidden]) select')?.focus(),0);}
function closeModal(){$('composer').hidden=true;}
function prepare(){try{const p=portalById($('share-select').value);if(!p)throw new Error('Choose a shareable portal.');const item=makePortalToken(p);$('outgoing').value=item.text;$('wire-meta').textContent=item.byteLength+' UTF-8 bytes · '+item.framedBytes+' Bitchat TLV bytes';toast('Token ready. Copy it into Bitchat to send.');}catch(e){$('outgoing').value='';$('wire-meta').textContent='';toast(e.message);}}
function receive(){try{const p=parsePortalToken($('incoming').value);const result=mergeReceivedPortal(state,p);if(result.added){setState(result.state);$('exchange-result').textContent='Imported '+p.name+' as an unverified portal. Inspect before relying on it.';}else $('exchange-result').textContent='This exact portal is already stored; no duplicate added.';$('incoming').value='';}catch(e){$('exchange-result').textContent=e.message;}}
function download(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='rheo-mesh-v04-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

state=restore();
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.tab)));
$('search').addEventListener('input',e=>{term=e.target.value;render();});
for(const id of ['add-portal','add-portal-two'])$(id).addEventListener('click',()=>modal('portal'));
$('add-link').addEventListener('click',()=>modal('link'));$('propose-session').addEventListener('click',()=>modal('session'));
$('close-modal').addEventListener('click',closeModal);
$('composer').addEventListener('click',e=>{if(e.target===$('composer'))closeModal();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('composer').hidden)closeModal();});
$('portal-form').addEventListener('submit',e=>{e.preventDefault();try{const f=e.target.elements;const next=newPortal(state,{name:f.name.value,description:f.description.value,kind:f.kind.value,category:f.category.value,steward:f.steward.value,shareable:f.shareable.checked});selected=next.portals.at(-1).id;setState(next);closeModal();filter='All';term='';$('search').value='';showTab('mycelium');toast('Your portal now exists on this device.');}catch(err){$('form-error').textContent=err.message;}});
$('connection-form').addEventListener('submit',e=>{e.preventDefault();try{const f=e.target.elements;setState(connect(state,f.from.value,f.to.value,f.relation.value));selected=f.from.value;closeModal();showTab('mycelium');toast('Connection recorded.');}catch(err){$('form-error').textContent=err.message;}});
$('session-form').addEventListener('submit',e=>{e.preventDefault();try{const f=e.target.elements;setState(proposeSession(state,{portalId:f.portalId.value,title:f.title.value,start:f.start.value,end:f.end.value,space:f.space.value,description:f.description.value}));closeModal();showTab('matrix');toast('Activity added to the local time/space matrix.');}catch(err){$('form-error').textContent=err.message;}});
$('print-path').addEventListener('click',()=>window.print());
$('reset').addEventListener('click',()=>{if(window.confirm('Replace all local portals and connections with the fictional sample? Export your data first if needed.')){selected='p5';setState(sampleState());toast('Fictional sample restored.');}});
$('prepare').addEventListener('click',prepare);
$('copy').addEventListener('click',async()=>{const txt=$('outgoing').value;if(!txt){toast('Prepare a message first.');return;}try{await navigator.clipboard.writeText(txt);toast('Copied. Paste into Bitchat Bluetooth chat.');}catch{$('outgoing').focus();$('outgoing').select();toast('Select and copy the message manually.');}});
$('receive').addEventListener('click',receive);
$('download').addEventListener('click',download);
$('import-file').addEventListener('change',async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{if(file.size>180000)throw new Error('File exceeds 180 KB.');const incoming=validateState(JSON.parse(await file.text()));if(!window.confirm('Replace your current local mesh with this imported file? Existing edits will be lost.'))return;selected=incoming.portals[0]?.id||null;setState(incoming);$('file-result').textContent='Imported '+state.portals.length+' portals and '+state.links.length+' connections. Sources are not authenticated.';}catch(err){$('file-result').textContent=err.message;}});
render();
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
if(!storageAvailable)toast('Storage unavailable. Export your mesh before leaving.');
