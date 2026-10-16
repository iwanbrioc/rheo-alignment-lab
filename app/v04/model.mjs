/** Rheo Mesh v0.4: illustrative graph and bounded local-first model. No AI and no network requests. */
export const CATEGORIES = ['Essentials', 'Belonging', 'Learning', 'Creativity', 'Nature', 'Purpose'];
export const PORTAL_KINDS = ['Place', 'People', 'Resource', 'Activity', 'Skill'];
export const SAMPLE_PORTALS = [
  {id:'p1',name:'Neighbourhood Kitchen',description:'A shared meal and a place to meet. Receiving food does not depend on offering something in return.',category:'Essentials',kind:'Place',steward:'Illustrative kitchen circle',x:185,y:145},
  {id:'p2',name:'Repair & Reuse Studio',description:'Neighbours share repair skills and bring useful objects back into circulation.',category:'Learning',kind:'Skill',steward:'Illustrative repair circle',x:465,y:100},
  {id:'p3',name:'Garden Commons',description:'People tend soil, grow vegetables and nurture habitat together.',category:'Nature',kind:'Place',steward:'Illustrative growing circle',x:749,y:160},
  {id:'p4',name:'Listening Room',description:'A space for people to speak, listen or sit quietly in good company.',category:'Belonging',kind:'Activity',steward:'Illustrative listening circle',x:150,y:340},
  {id:'p5',name:'Shared Tool Library',description:'Borrow and maintain everyday tools rather than everyone buying their own.',category:'Creativity',kind:'Resource',steward:'Illustrative tool stewards',x:481,y:310},
  {id:'p6',name:'Cycle Couriers',description:'Local volunteers test practical low-energy delivery routes for community resources.',category:'Purpose',kind:'People',steward:'Illustrative cycling circle',x:764,y:363},
  {id:'p7',name:'Skills Exchange',description:'Share what you know and learn from someone else, without a score or ranking.',category:'Learning',kind:'Activity',steward:'Illustrative skills circle',x:532,y:514},
  {id:'p8',name:'Care Circle',description:'Informal, consent-based mutual support alongside—not in place of—professional services.',category:'Belonging',kind:'People',steward:'Illustrative neighbour circle',x:816,y:532},
  {id:'p9',name:'Food Sharing Hub',description:'Offer surplus food and coordinate local collections with dignity.',category:'Essentials',kind:'Resource',steward:'Illustrative food circle',x:315,y:510},
  {id:'p10',name:'Commons Assembly',description:'A space to identify shared needs, responsibilities and care for the whole network.',category:'Purpose',kind:'Activity',steward:'Illustrative commons circle',x:96,y:545}
].map(p=>({...p, demo:true, shareable:true}));
export const SAMPLE_LINKS = [
  ['p3','p1','Seasonal harvest contributes to shared meals'],
  ['p9','p1','Surplus ingredients support the kitchen'],
  ['p2','p5','Repair skills keep shared tools working'],
  ['p5','p3','Shared tools support the growers'],
  ['p6','p9','Cycles help move available food'],
  ['p7','p2','Skills and repair knowledge circulate'],
  ['p4','p8','Listening strengthens mutual care'],
  ['p8','p1','Neighbours help the kitchen remain welcoming'],
  ['p10','p4','A community space is held for dialogue'],
  ['p10','p7','Learning needs are brought to the exchange'],
  ['p7','p6','Maintenance skills support bicycles'],
  ['p5','p6','Couriers borrow tools to make repairs'],
  ['p10','p3','Stewardship needs are brought into discussion']
].map(([from,to,relation],i)=>({id:'l'+(i+1),from,to,relation,demo:true}));
export const SAMPLE_SESSIONS = [
 ['p1','Open kitchen & introductions','09:00','10:00','Commons Kitchen'],
 ['p4','Listening and noticing','09:30','10:30','Quiet Room'],
 ['p3','Tend a living garden','10:30','12:00','Garden'],
 ['p2','Repair café: bring a problem','11:00','12:30','Workshop'],
 ['p9','Shared midday table','12:30','13:30','Commons Kitchen'],
 ['p7','Exchange skills, not scores','13:30','15:00','Learning Circle'],
 ['p6','Low-energy neighbourhood journeys','14:00','15:30','Courtyard'],
 ['p8','Care is a shared capacity','15:30','16:30','Quiet Room'],
 ['p10','Harvest, reflect and open new space','16:30','17:30','Assembly Circle']
].map(([portalId,title,start,end,space],i)=>({id:'s'+(i+1),portalId,title,start,end,space,description:'Fictional Open Space invitation — follow your curiosity, move when you need to.',demo:true}));
export const sampleState=()=>({version:4,portals:SAMPLE_PORTALS.map(p=>({...p})),links:SAMPLE_LINKS.map(l=>({...l})),sessions:SAMPLE_SESSIONS.map(s=>({...s})),myPath:[]});
const string=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.trim().length<=max;
const simpleId=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,55}$/.test(v);
export function validatePortal(p){
 if(!p||typeof p!=='object'||!simpleId(p.id)||!string(p.name,70)||!string(p.description,400)||!CATEGORIES.includes(p.category)||!PORTAL_KINDS.includes(p.kind)||!(p.steward===''||string(p.steward,70))||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<30||p.x>900||p.y<35||p.y>585||typeof p.shareable!=='boolean')throw new Error('Portal data is incomplete or invalid.');
 return {id:p.id,name:p.name.trim(),description:p.description.trim(),category:p.category,kind:p.kind,steward:p.steward||'',x:p.x,y:p.y,demo:p.demo===true,shareable:p.shareable===true,received:p.received===true};
}
export function validateLink(l,ids){
 if(!l||!simpleId(l.id)||!simpleId(l.from)||!simpleId(l.to)||l.from===l.to||!string(l.relation,110)||!ids.has(l.from)||!ids.has(l.to))throw new Error('Connection data is invalid or refers to a missing portal.');
 return {id:l.id,from:l.from,to:l.to,relation:l.relation.trim(),demo:l.demo===true,received:l.received===true};
}
const validTime=t=>typeof t==='string'&&/^(?:0[0-9]|1[0-9]|2[0-3]):(?:00|30)$/.test(t);
export function validateSession(session,ids){
 if(!session||!simpleId(session.id)||!ids.has(session.portalId)||!string(session.title,100)||!string(session.space,70)||!validTime(session.start)||!validTime(session.end)||session.start>=session.end||typeof session.description!=='string'||session.description.length>250)throw new Error('Time/space invitation is invalid.');
 return {id:session.id,portalId:session.portalId,title:session.title.trim(),start:session.start,end:session.end,space:session.space.trim(),description:session.description.trim(),demo:session.demo===true};
}
export function proposeSession(state,details){const ids=new Set(state.portals.map(p=>p.id));const next=validateSession({...details,id:nextId('s')},ids);return validateState({...state,sessions:[...state.sessions,next]});}
export function togglePath(state,sessionId){if(!state.sessions.some(s=>s.id===sessionId))throw new Error('Invitation is no longer on the matrix.');const set=new Set(state.myPath);set.has(sessionId)?set.delete(sessionId):set.add(sessionId);return validateState({...state,myPath:[...set]});}
export function myPathSessions(state){return state.sessions.filter(s=>state.myPath.includes(s.id)).sort((a,b)=>a.start.localeCompare(b.start)||a.end.localeCompare(b.end));}
export function pathHasOverlap(state){const sessions=myPathSessions(state);return sessions.some((s,i)=>sessions.slice(i+1).some(other=>s.start<other.end&&other.start<s.end));}
export function validateState(data){
 if(!data||data.version!==4||!Array.isArray(data.portals)||!Array.isArray(data.links)||data.portals.length>120||data.links.length>250||!Array.isArray(data.sessions??[])||((data.sessions??[]).length>160)||!Array.isArray(data.myPath??[])||((data.myPath??[]).length>160))throw new Error('This is not a bounded Rheo v0.4 mesh file.');
 const portals=data.portals.map(validatePortal);const ids=new Set(portals.map(p=>p.id));if(ids.size!==portals.length)throw new Error('Duplicate portal IDs in file.');
 const links=data.links.map(l=>validateLink(l,ids));if(new Set(links.map(l=>l.id)).size!==links.length)throw new Error('Duplicate connection IDs in file.');
 const sessions=(data.sessions??[]).map(s=>validateSession(s,ids));const sessionIds=new Set(sessions.map(s=>s.id));
 if(sessionIds.size!==sessions.length)throw new Error('Duplicate session IDs.');
 if((data.myPath??[]).some(id=>!sessionIds.has(id))||new Set(data.myPath??[]).size!==(data.myPath??[]).length)throw new Error('My Path references are invalid.');
 return {version:4,portals,links,sessions,myPath:[...(data.myPath??[])]};
}
export function nextId(prefix){return prefix+Array.from(crypto.getRandomValues(new Uint8Array(9))).map(n=>n.toString(16).padStart(2,'0')).join('');}
export function connect(state,from,to,relation){const ids=new Set(state.portals.map(p=>p.id));const link=validateLink({id:nextId('l'),from,to,relation},ids);return validateState({...state,links:[...state.links,link]});}
export function newPortal(state,details){const n=state.portals.length;const angle=n*2.39996323;const r=180+40*Math.sin(n);const p=validatePortal({...details,id:nextId('p'),x:Math.round(465+Math.cos(angle)*r),y:Math.round(300+Math.sin(angle)*r)});return validateState({...state,portals:[...state.portals,p]});}
export function portalConnections(state,id){return state.links.filter(l=>l.from===id||l.to===id);}
