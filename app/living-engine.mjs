/** Pure, deterministic sandbox mechanisms. No live identities, ledger or radio traffic. */
export const TAPER = [1,0.75,0.5,0.25,0];
export const idOf = value => String(value ?? "").trim().replace(/[^a-zA-Z0-9_-]/g,"").slice(0,48);
export function timeText(minutes) {
  const n = Math.max(0,Math.min(1439,Number(minutes)||0));
  return String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0");
}
export function requireValidSession(session, sessions) {
  if (!session || !idOf(session.id) || !idOf(session.portal) || !String(session.title||"").trim()) throw new Error("Enter an activity, place and valid identity.");
  if (!Number.isInteger(session.start) || !Number.isInteger(session.duration) || session.start<480 || session.start>1140 || session.duration<15 || session.duration>180 || session.start+session.duration>1200) throw new Error("Keep activities between 08:00 and 20:00, lasting 15–180 minutes.");
  if (sessions.some(s=>s.id===session.id)) throw new Error("Activity identifier already exists.");
  return session;
}
export function itineraryCheck(ids,sessions) {
  const lookup=new Map(sessions.map(s=>[s.id,s]));
  const selected=ids.map(id=>lookup.get(id)).filter(Boolean).sort((a,b)=>a.start-b.start || a.id.localeCompare(b.id));
  const warnings=[];
  for(let i=1;i<selected.length;i++){
    const before=selected[i-1], after=selected[i];
    const end=before.start+before.duration;
    if(after.start<end) warnings.push("Overlap: "+before.title+" / "+after.title);
    else if(before.portal!==after.portal && after.start-end<15) warnings.push("Allow transition time between "+before.title+" and "+after.title+" (15-minute illustrative buffer; not a walking-time estimate).");
  }
  return {sessions:selected,warnings};
}
export function findRoute(start,end,routes) {
  if (start===end) return [start];
  const graph=new Map();
  for(const [a,b,type] of routes){
    if(type!=="foot"&&type!=="cycle")continue;
    if(!graph.has(a))graph.set(a,[]);
    if(!graph.has(b))graph.set(b,[]);
    graph.get(a).push(b);graph.get(b).push(a);
  }
  let frontier=[[start]],seen=new Set([start]);
  while(frontier.length){const chain=frontier.shift();for(const next of graph.get(chain.at(-1))||[]){
    if(seen.has(next))continue;
    const route=[...chain,next];if(next===end)return route;
    seen.add(next);frontier.push(route);
  }}
  return null;
}
export function openPossibilities(activated,emergence) {
  const set=new Set(activated);
  return emergence.filter(e=>e.from.every(k=>set.has(k)));
}
export function curatorEligible(c) {
  return !!(c && c.innerCompleted===true && c.outerCompleted===true && c.readinessApproved===true);
}
export function simulateTithe({netRealisedGains=0,reserve=0,curators=1,year=1,monthlyBasic=1600,localMonthly=0,overhead=0}={}) {
  const finite=(n,max)=>Number.isFinite(Number(n))?Math.min(max,Math.max(0,Number(n))):0;
  const gains=finite(netRealisedGains,100000000);
  const contribution=Math.round(gains*0.1*100)/100;
  const opening=finite(reserve,100000000);
  const count=Math.floor(finite(curators,1000)),monthly=finite(monthlyBasic,1000000),local=finite(localMonthly,100000000);
  const proposed=TAPER[Math.min(4,Math.max(0,Math.floor(Number(year)||1)-1))];
  const totalNeed=count*monthly;
  const replacementNeeded=totalNeed*(1-proposed);
  const feasible=local>=replacementNeeded;
  const supportShare=feasible?proposed:Math.max(proposed,Math.min(1,1-(local/(totalNeed||1))));
  const centralMonthly=Math.round(totalNeed*supportShare*100)/100;
  const costs=centralMonthly+finite(overhead,10000000);
  const closing=Math.round((opening+contribution-costs)*100)/100;
  return {contribution,centralMonthly,replacementNeeded,localMonthly:local,proposedShare:proposed,supportShare,feasible,opening,costs,closing,solvent:closing>=0};
}
/* Simulation of in-person store-and-forward exchanges; never Bluetooth or Internet traffic. */
export const START_DEVICES = [
 {id:"A",label:"Garden phone",events:[{id:"garden-availability",origin:"A",title:"Garden session offered",public:true}]},
 {id:"B",label:"Kitchen phone",events:[{id:"kitchen-meal",origin:"B",title:"Community meal available",public:true}]},
 {id:"C",label:"Cycle phone",events:[{id:"repair-tools",origin:"C",title:"Cycle tools available",public:true}]}
];
export function encounter(devices,a,b) {
  if(a===b) throw new Error("Choose two different devices.");
  if(!devices.some(d=>d.id===a)||!devices.some(d=>d.id===b)) throw new Error("Unknown simulated device.");
  const x=devices.find(d=>d.id===a),y=devices.find(d=>d.id===b);
  const union=new Map([...x.events,...y.events].filter(e=>e.public===true).map(e=>[e.id,e]));
  const events=[...union.values()].sort((m,n)=>m.id.localeCompare(n.id));
  return devices.map(d=>d.id===a||d.id===b?{...d,events:events.slice()}: {...d,events:d.events.slice()});
}
