import {PLACE,PORTALS,ROUTES,SESSIONS,HORIZONS,EMERGENCE} from "./living-data.mjs";
import {timeText,requireValidSession,itineraryCheck,findRoute,openPossibilities,curatorEligible,simulateTithe,START_DEVICES,encounter} from "./living-engine.mjs";
/* Standalone v0.4 sandbox. All state is ephemeral, all geography and accounts imaginary. */
const $=id=>document.getElementById(id);
const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const svgText=s=>escape(s);
const svgNS="http://www.w3.org/2000/svg";
const icons={Nature:"✳",Learning:"↗",Belonging:"○",Creativity:"◇",Purpose:"✧",Essentials:"＋"};
const groups={
  green:new Set(["garden","woodland","gardenpath","riverside"]),
  meeting:new Set(["hall","library","care"]),
  making:new Set(["studio","repair","music"]),
  moving:new Set(["cycle","kitchen"])
};
let portals=PORTALS.map(p=>({...p}));
let sessions=SESSIONS.map(s=>({...s}));
let added=0,selected="garden",layer="both";
let activated=new Set(),dormant=new Set(),day=new Set();
let devices=START_DEVICES.map(d=>({...d,events:d.events.map(e=>({...e}))}));
const safePortal=id=>portals.find(p=>p.id===id);
const available=p=>p && !dormant.has(p.id);
function switchView(view) {
  for(const v of ["map","matrix","studio","network","pot"])$(v+"-view").hidden=v!==view;
  document.querySelectorAll("[data-view]").forEach(button=>{
    button.classList.toggle("chosen",button.dataset.view===view);
    button.setAttribute("aria-pressed",String(button.dataset.view===view));
  });
  if(view==="matrix")renderMatrix();
  if(view==="studio")renderStudio();
  if(view==="network")renderDevices();
  if(view==="pot")renderPot();
  if(view==="map")renderMap();
}
function pathway(a,b) {
  const mx=(a.x+b.x)/2, my=(a.y+b.y)/2;
  const bend=(a.id.charCodeAt(0)+b.id.charCodeAt(0))%2===0?15:-15;
  return "M"+a.x+" "+a.y+" Q"+(mx+bend)+" "+(my-bend)+" "+b.x+" "+b.y;
}
function renderMap(){
  const routes=$("route-layer"),nodes=$("portal-layer"),emerging=$("emergence-layer");
  $("road-layer").style.display=layer==="mycelium"?"none":"";
  routes.style.display=layer==="roads"?"none":"";
  nodes.style.display=layer==="roads"?"none":"";
  emerging.style.display=layer==="roads"?"none":"";
  const candidateIds=activated;
  const pathRows=ROUTES.map(([aId,bId,type])=>{
    const a=safePortal(aId),b=safePortal(bId);if(!a||!b)return "";
    const active=candidateIds.has(a.id)&&candidateIds.has(b.id);
    const highlight=selected===aId||selected===bId;
    return '<path d="'+pathway(a,b)+'" class="route '+type+(available(a)&&available(b)?"":" off")+(active?" activated":"")+(highlight?" highlight":"")+'"/>';
  });
  routes.innerHTML=pathRows.join("");
  emerging.innerHTML=$("show-threads").checked?openPossibilities(activated,EMERGENCE).map(e=>{
    const a=safePortal(e.from[0]),b=safePortal(e.from[1]);
    return '<path class="possibility" d="'+pathway(a,b)+'"/><circle cx="'+((a.x+b.x)/2)+'" cy="'+((a.y+b.y)/2)+'" r="9" fill="#a365ac"/>';
  }).join(""):"";
  nodes.innerHTML=portals.map(p=>{
    const isDormant=dormant.has(p.id),symbol=icons[p.kind]||"✧";
    const title=svgText(p.name)+" — fictional "+svgText(p.kind)+" portal";
    const y=p.y>520?p.y-39:p.y+45;
    return '<g class="portal '+(selected===p.id?"active ":"")+(p.id.startsWith("new-")?"is-new ":"")+'" data-portal="'+escape(p.id)+'" role="button" tabindex="0" aria-label="'+title+'" opacity="'+(isDormant?".45":"1")+'"><title>'+title+'</title><circle class="ring" cx="'+p.x+'" cy="'+p.y+'" r="25"/><circle class="core" cx="'+p.x+'" cy="'+p.y+'" r="19"/><text class="symbol" x="'+p.x+'" y="'+(p.y+1)+'">'+symbol+'</text><text class="place" x="'+p.x+'" y="'+y+'">'+svgText(p.name)+'</text></g>';
  }).join("");
  renderPortal();
}
function renderPortal(){
  const p=safePortal(selected);
  if(!p)return;
  $("portal-name").textContent=p.name;
  $("portal-kind").textContent=p.kind+(dormant.has(p.id)?" · needs renewal":" · simulated portal");
  $("portal-detail").innerHTML='<span class="detail-label">The invitation</span><p>'+escape(p.invitation)+'</p><span class="detail-label">What is needed</span><p>'+escape(p.needs||"A host willing to hold the space.")+'</p><span class="detail-label">Continuing care</span><p>'+escape(p.care||"Agreement and renewal.")+'</p><p><strong>Steward:</strong> '+escape(p.steward||"A fictional local circle")+'</p>';
  $("add-to-day").disabled=!sessions.some(s=>s.portal===p.id);
  $("activate").disabled=dormant.has(p.id)||activated.has(p.id);
  $("activate").textContent=activated.has(p.id)?"Portal imagined ✓":"Imagine a connection ✳";
  const opened=openPossibilities(activated,EMERGENCE);
  $("emergence-list").innerHTML=opened.length?opened.map(e=>'<div class="found"><strong>'+escape(e.title)+'</strong><small>'+escape(e.note)+'</small></div>').join(""):'<p>Imagine participation in two related portals to reveal an emergent possibility.</p>';
}
function activateSelected(){
  if(!available(safePortal(selected)))return;
  activated.add(selected);renderMap();
}
function selectedSessionPortal(){
  $("session-portal").innerHTML=portals.filter(available).map(p=>'<option value="'+escape(p.id)+'">'+escape(p.name)+'</option>').join("");
  $("session-portal").value=selected;
}
function portalGroup(id){
  for(const [group,set] of Object.entries(groups))if(set.has(id))return group;
  return "meeting";
}
function renderMatrix(){
  const starts=[480,600,720,840,960,1080],keys=["green","meeting","making","moving"];
  const head=starts.map((from,i)=>{
    const cells=keys.map(k=>{
      const items=sessions.filter(s=>s.start>=from && s.start<from+120 && portalGroup(s.portal)===k && available(safePortal(s.portal)));
      return '<td>'+(items.length?items.map(s=>{
        const p=safePortal(s.portal),chosen=day.has(s.id);
        return '<button class="activity '+(chosen?"chosen":"")+'" data-session="'+escape(s.id)+'" aria-pressed="'+chosen+'"><strong>'+escape(s.title)+'</strong>'+timeText(s.start)+'–'+timeText(s.start+s.duration)+'<small>'+escape(p?.name||"Imaginary portal")+'</small></button>';
      }).join(""):'<span class="empty-slot">·</span>')+'</td>';
    }).join("");
    return '<tr><td class="matrix-time">'+timeText(from)+'–'+timeText(from+120)+'</td>'+cells+'</tr>';
  });
  $("matrix-body").innerHTML=head.join("");
  const result=itineraryCheck([...day],sessions);
  $("my-count").textContent=result.sessions.length;
  $("my-sessions").innerHTML=result.sessions.length?result.sessions.map(s=>{
    const p=safePortal(s.portal);
    return '<div class="path-item"><strong>'+escape(s.title)+'</strong><span>'+timeText(s.start)+'–'+timeText(s.start+s.duration)+' · '+escape(p?.name||"Portal")+'</span><button data-remove-session="'+escape(s.id)+'">Remove</button></div>';
  }).join(""):'<p class="small-text">An empty space can be part of the journey.</p>';
  $("path-warnings").innerHTML=result.warnings.map(w=>'<p class="warning">⚠ '+escape(w)+'</p>').join("");
}
function eligibleStatus(){
  const cur={innerCompleted:$("inner-done").checked,outerCompleted:$("outer-done").checked,readinessApproved:$("ready-done").checked};
  $("qualification").textContent=curatorEligible(cur)?"Fictional curator ready to steward portals. This is not a credential.":"The fictional curator has not completed the two pathways and review. Participation remains open.";
}
function renderStudio(){
  eligibleStatus();
  $("studio-portals").innerHTML=portals.map(p=>'<button data-toggle-portal="'+escape(p.id)+'" class="'+(dormant.has(p.id)?"dormant":"")+'">'+escape(p.name)+'<span>'+(dormant.has(p.id)?"Needs renewal · click to restore":"Active · click to pause")+'</span></button>').join("");
}
function renderDevices(){
  $("devices").innerHTML=devices.map(d=>{
    const list=d.events.map(e=>'<li>'+escape(e.title)+' <small>('+escape(e.origin)+')</small></li>').join("");
    return '<article class="device"><div>◉ '+escape(d.label)+'</div><small>'+d.events.length+' shared fictional records</small><ul>'+list+'</ul></article>';
  }).join("");
}
function updatePotFromForm(){
  const f=$("tithe-controls").elements;
  const opts={netRealisedGains:Number(f.netRealisedGains.value),reserve:Number(f.reserve.value),curators:Number(f.curators.value),monthlyBasic:Number(f.monthlyBasic.value),localMonthly:Number(f.localMonthly.value),overhead:Number(f.overhead.value),year:Number(f.year.value)};
  return simulateTithe(opts);
}
function pounds(value){return new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",maximumFractionDigits:0}).format(value);}
function renderPot(){
  const pot=updatePotFromForm(),metric=(title,number,note)=>'<article class="metric"><span>'+escape(title)+'</span><strong>'+escape(number)+'</strong><small>'+escape(note)+'</small></article>';
  $("pot-metrics").innerHTML=[
    metric("Voluntary 10% tithe",pounds(pot.contribution),"On hypothetical post-tax realised gains"),
    metric("Central CBI this month",pounds(pot.centralMonthly),"For all fictional curators together"),
    metric("Local support",pounds(pot.localMonthly),"Independently pledged each month"),
    metric("Closing Pot reserve",pounds(pot.closing),"Opening + donation − central CBI − costs")
  ].join("");
  const msg=$("pot-message");msg.classList.toggle("warn",!pot.solvent || !pot.feasible);
  let explain="Proposed central share: "+Math.round(pot.proposedShare*100)+"%. ";
  if(pot.feasible)explain+="Local support meets the replacement requirement for this year. ";
  else explain+="Local support is insufficient for the proposed taper; central support is held at "+Math.round(pot.supportShare*100)+"% instead. ";
  explain+=pot.solvent?"The hypothetical reserve covers this month's spending.":"The hypothetical reserve is insufficient. This is not a viable payout plan.";
  msg.innerHTML='<h3>A taper with conditions</h3><p>'+escape(explain)+'</p><p class="small-text">This model covers one illustrative month, not an investment or solvency forecast. Need and care are not tokenised.</p>';
}
function showError(message){$("session-error").textContent=message;}
document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>switchView(b.dataset.view)));
document.querySelectorAll("[data-layer]").forEach(b=>b.addEventListener("click",()=>{
  layer=b.dataset.layer;document.querySelectorAll("[data-layer]").forEach(x=>x.classList.toggle("active",x===b));renderMap();
}));
$("living-svg").addEventListener("click",event=>{
  const el=event.target.closest("[data-portal]");if(!el)return;
  selected=el.dataset.portal;renderMap();
});
$("living-svg").addEventListener("keydown",event=>{
  if(!["Enter"," "].includes(event.key))return;
  const el=event.target.closest("[data-portal]");if(!el)return;
  event.preventDefault();selected=el.dataset.portal;renderMap();
  const focus=$("living-svg").querySelector('[data-portal="'+selected+'"]');focus?.focus();
});
$("show-threads").addEventListener("change",renderMap);
$("activate").addEventListener("click",activateSelected);
$("add-to-day").addEventListener("click",()=>switchView("matrix"));
$("make-session").addEventListener("click",()=>{selectedSessionPortal();showError("");$("session-dialog").showModal();});
$("session-dialog").querySelector("[data-dismiss]").addEventListener("click",()=>$("session-dialog").close());
$("session-form").addEventListener("submit",event=>{
  event.preventDefault();
  try{
    const f=event.currentTarget.elements;
    const [hh,mm]=f.time.value.split(":").map(Number);
    const s={id:"new-session-"+(++added),portal:f.portal.value,title:f.title.value.trim(),start:hh*60+mm,duration:Number(f.duration.value)};
    if(!available(safePortal(s.portal)))throw new Error("Choose an available fictional portal.");
    requireValidSession(s,sessions);sessions.push(s);$("session-dialog").close();$("session-form").reset();renderMatrix();
  }catch(e){showError(e.message);}
});
$("matrix-body").addEventListener("click",event=>{
  const button=event.target.closest("[data-session]");if(!button)return;
  day.has(button.dataset.session)?day.delete(button.dataset.session):day.add(button.dataset.session);renderMatrix();
});
$("my-sessions").addEventListener("click",event=>{
  const button=event.target.closest("[data-remove-session]");if(!button)return;day.delete(button.dataset.removeSession);renderMatrix();
});
$("clear-path").addEventListener("click",()=>{day.clear();renderMatrix();});
["inner-done","outer-done","ready-done"].forEach(id=>$(id).addEventListener("change",eligibleStatus));
$("portal-form").addEventListener("submit",event=>{
  event.preventDefault();const f=event.currentTarget.elements;
  const name=f.name.value.trim(), invitation=f.invitation.value.trim();if(!name||!invitation)return;
  const n=++added,id="new-"+n;
  const x=170+(n*157)%580,y=170+(n*113)%320;
  portals.push({id,x,y,name,kind:f.kind.value,icon:icons[f.kind.value],steward:"Fictional community",invitation,needs:"Agree access and ongoing stewardship",care:"Ask permission; care cannot be assumed"});
  selected=id;event.currentTarget.reset();renderStudio();renderMap();switchView("map");
});
$("studio-portals").addEventListener("click",event=>{
  const b=event.target.closest("[data-toggle-portal]");if(!b)return;
  const id=b.dataset.togglePortal;
  dormant.has(id)?dormant.delete(id):dormant.add(id);
  renderStudio();renderMap();
});
$("meet").addEventListener("click",()=>{
  try{
    const a=$("peer-a").value,b=$("peer-b").value;
    const before=devices.map(d=>({id:d.id,count:d.events.length}));
    devices=encounter(devices,a,b);
    const delta=devices.filter(d=>d.id===a||d.id===b).map(d=>d.label+": +"+(d.events.length-before.find(x=>x.id===d.id).count)+" record(s)").join(" · ");
    $("mesh-log").textContent="Simulated local encounter completed. "+delta+". No messages were sent.";
    renderDevices();
  }catch(e){$("mesh-log").textContent=e.message;}
});
$("tithe-controls").addEventListener("input",renderPot);
$("tithe-controls").addEventListener("change",renderPot);
$("reset").addEventListener("click",()=>location.reload());
renderMap();renderMatrix();renderStudio();renderDevices();renderPot();switchView("map");
if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
