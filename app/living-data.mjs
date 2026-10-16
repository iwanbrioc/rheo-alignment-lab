/** Rheo v0.4: entirely fictional geography, identities and events. No map tiles or live data. */
export const PLACE = "Llanfyd — an imaginary Welsh town";
export const PORTALS = [
 {id:"garden",x:225,y:168,name:"The Growing Place",kind:"Nature",icon:"✳",steward:"Garden circle",invitation:"Grow, share seed and learn together.",needs:"Compost, small tools and someone to welcome newcomers.",care:"Habitat edges remain undisturbed."},
 {id:"kitchen",x:428,y:135,name:"The Shared Table",kind:"Essentials",icon:"＋",steward:"Kitchen circle",invitation:"A shared meal, without a price or obligation to reciprocate.",needs:"Fresh ingredients and people to prepare food.",care:"Food safety and reliable accessibility."},
 {id:"repair",x:630,y:195,name:"Repair Commons",kind:"Learning",icon:"↗",steward:"Repair circle",invitation:"Bring an item, learn to repair it or offer a skill.",needs:"A safe bench and spare bicycle parts.",care:"Qualified oversight for electrical work."},
 {id:"studio",x:353,y:284,name:"Open Studio",kind:"Creativity",icon:"◇",steward:"Arts collective",invitation:"Co-create a sensory portal, or simply experience one.",needs:"Materials and people who will hold the space.",care:"Clear consent and room for opting out."},
 {id:"library",x:593,y:353,name:"Library of Possibilities",kind:"Belonging",icon:"○",steward:"Library circle",invitation:"Read, meet, listen and share learning.",needs:"Volunteer hosts for the afternoon.",care:"A quiet place and free entry."},
 {id:"riverside",x:755,y:430,name:"River Listening",kind:"Nature",icon:"✳",steward:"Walking circle",invitation:"Walk beside the water and notice what is alive.",needs:"Accessible route notes and suitable weather.",care:"Respect flood conditions and wildlife."},
 {id:"cycle",x:475,y:448,name:"Cycle Commons",kind:"Learning",icon:"↗",steward:"Cycle circle",invitation:"Borrow a tool, repair a bike, widen your reach.",needs:"Puncture kits and spare locks.",care:"Check bike safety before setting off."},
 {id:"hall",x:216,y:427,name:"The Gathering Room",kind:"Belonging",icon:"○",steward:"Neighbourhood circle",invitation:"An open-space gathering for whatever matters today.",needs:"A welcoming host and accessible arrangements.",care:"People decide their own participation."},
 {id:"woodland",x:135,y:308,name:"Woodland Threshold",kind:"Purpose",icon:"✧",steward:"Habitat circle",invitation:"Help care for a woodland and learn from its stewards.",needs:"Landowner permission and ecological guidance.",care:"Seasonal restrictions and habitat protection."},
 {id:"music",x:730,y:90,name:"Music Kitchen",kind:"Creativity",icon:"◇",steward:"Musicians circle",invitation:"Listen, sing or bring a sound into a shared space.",needs:"Instruments and respect for quiet hours.",care:"Participation never requires performance."},
 {id:"gardenpath",x:110,y:492,name:"Edible Path",kind:"Purpose",icon:"✧",steward:"Growers circle",invitation:"Explore growing spaces along a walking path.",needs:"Longer-term soil care.",care:"Avoid picking without consent."},
 {id:"care",x:818,y:315,name:"Care Exchange",kind:"Essentials",icon:"＋",steward:"Mutual aid circle",invitation:"Ask for practical help or offer a little time.",needs:"Reliable safeguarding and clear boundaries.",care:"Receiving help never incurs debt."}
];
/* Every route is invented for this sandbox, including 'footpath' and 'cycleway'. */
export const ROUTES = [
 ["garden","kitchen","foot"],["kitchen","repair","cycle"],["repair","music","foot"],
 ["garden","woodland","foot"],["woodland","studio","foot"],["studio","hall","foot"],
 ["hall","gardenpath","foot"],["hall","cycle","cycle"],["studio","library","foot"],
 ["library","repair","cycle"],["library","care","foot"],["care","riverside","foot"],
 ["cycle","riverside","cycle"],["cycle","library","cycle"],["kitchen","studio","foot"],
 ["garden","studio","foot"],["library","riverside","foot"]
];
export const SESSIONS = [
 {id:"s1",portal:"garden",start:570,duration:75,title:"Plant a shared future"},
 {id:"s2",portal:"hall",start:570,duration:60,title:"Open Space: What matters?"},
 {id:"s3",portal:"studio",start:600,duration:90,title:"A sensory encounter"},
 {id:"s4",portal:"repair",start:630,duration:75,title:"Repair together"},
 {id:"s5",portal:"kitchen",start:690,duration:75,title:"Preparing the shared table"},
 {id:"s6",portal:"woodland",start:690,duration:70,title:"Listening to the woodland"},
 {id:"s7",portal:"music",start:690,duration:60,title:"Sound without performance"},
 {id:"s8",portal:"kitchen",start:780,duration:60,title:"A shared lunch"},
 {id:"s9",portal:"cycle",start:795,duration:75,title:"Cycle repair and sharing"},
 {id:"s10",portal:"library",start:870,duration:60,title:"Stories across generations"},
 {id:"s11",portal:"riverside",start:870,duration:75,title:"Walk, notice, let go"},
 {id:"s12",portal:"care",start:885,duration:65,title:"Mutual aid without debt"},
 {id:"s13",portal:"hall",start:960,duration:60,title:"An open gathering"},
 {id:"s14",portal:"studio",start:975,duration:70,title:"Making new portals"}
];
export const HORIZONS = [
 ["Re-enchantment","Natural Environment","Resources"],["Transformation","Culture","Values"],
 ["Creativity","Infrastructure","Affordance"],["Dialogue","Society","Support"],
 ["Curiosity","Outer Self","Capacity"],["Participation","Inner Self","Wellbeing"],
 ["Nothing / Everything","No Self","Everything / Nothing"]
];
export const EMERGENCE = [
 {id:"soil",from:["garden","kitchen"],title:"From kitchen scraps to living soil",note:"A possibility opens when growers and cooks agree how to share compost."},
 {id:"mobility",from:["cycle","library"],title:"A library of travelling tools",note:"Learning and transport become easier when two circles collaborate."},
 {id:"sensory",from:["studio","care"],title:"A quiet sensory gathering",note:"A new way to gather becomes possible when creative and caring spaces meet."}
];
