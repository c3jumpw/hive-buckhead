// ══════════════════════════════════════════════════════════════
// HIVE BUCKHEAD — SHARED DATA LAYER v3
// Root file: /hive_data.js
// 
// HOW TO USE IN A NEW PAGE:
//   <script src="../hive_data.js"></script>
//   Then your page script has access to all constants, helpers,
//   _store, LOCAL_STAFF, ALL_TABLES, etc.
//
// EXISTING PAGES (admin, rsvp-mgnt, floor-view) are self-contained
// and define their own copies. This file is the source of truth
// for any new pages and for reference.
// ══════════════════════════════════════════════════════════════

const STORE_KEY = "hive_buckhead_v2";
const PLANNER_KEY = "hive_planner_v1";
const SHEETS_URL = "https://script.google.com/macros/s/AKfycbzWkOHU3dmsmHGWI0iQ4wGzpzT6YtGgnndPRcqK8GyEZffRxPo_4FrGzWaKaNLDy0A/exec";
const TODAY = new Date().toISOString().split("T")[0];
const TOMORROW = new Date(Date.now()+86400000).toISOString().split("T")[0];

// ── STAFF (authoritative list — mirrors Google Sheets Staff tab) ──
const LOCAL_STAFF = [
  {id:"S001", name:"Admin User",    role:"Admin",           accessLevel:1, passcode:"1234", color:"#C9A96E"},
  {id:"S002", name:"Ashley Smith",  role:"Lead Server",     accessLevel:2, passcode:"2345", color:"#5B96C8"},
  {id:"S003", name:"Marcus Rivera", role:"Server",          accessLevel:2, passcode:"3456", color:"#9B7EC8"},
  {id:"S004", name:"Jenna Park",    role:"Server",          accessLevel:2, passcode:"4567", color:"#3AACA8"},
  {id:"S005", name:"Devon Harris",  role:"Server / Bar",    accessLevel:2, passcode:"5678", color:"#4CAF82"},
  {id:"S006", name:"Floor Staff",   role:"Host",            accessLevel:3, passcode:"6789", color:"#A89B84"},
];

// ── ACCESS LEVELS ──
// 1 = Admin (all pages: admin dashboard, rsvp-mgnt, floor-view, staff-planner)
// 2 = Manager/Server (rsvp-mgnt, floor-view, staff-planner)
// 3 = Host/Floor (floor-view only)

// ── TABLE DEFINITIONS ──
const FINE_DINING_TABLES = [
  // T200-T206: 2-seat top row (7 tables)
  ...Array.from({length:7},(_,i)=>({id:`T${200+i}`, cap:2, section:"fine_dining", type:"round2"})),
  // T207-T208: 3-seat angled wall (2 tables)
  {id:"T207",cap:3,section:"fine_dining",type:"round3"},
  {id:"T208",cap:3,section:"fine_dining",type:"round3"},
  // T209-T210: 4-seat angled wall (2 tables)
  {id:"T209",cap:4,section:"fine_dining",type:"round4"},
  {id:"T210",cap:4,section:"fine_dining",type:"round4"},
  // T211-T212: 4-seat right side near patio (2 tables)
  {id:"T211",cap:4,section:"fine_dining",type:"round4"},
  {id:"T212",cap:4,section:"fine_dining",type:"round4"},
  // T213-T217: 2-seat below bar (5 tables)
  ...Array.from({length:5},(_,i)=>({id:`T${213+i}`,cap:2,section:"fine_dining",type:"round2"})),
  // T218: extra 2-seat
  {id:"T218",cap:2,section:"fine_dining",type:"round2"},
];
const BAR_STOOLS = Array.from({length:20},(_,i)=>({
  id:`B${i+1}`, cap:1, section:"bar", type:"stool"
}));
const DEN_TABLES = [
  // T11-T18: 8 booth tables for 4 (top row)
  ...Array.from({length:8},(_,i)=>({id:`T${11+i}`,cap:4,section:"den",type:"booth4"})),
  // T19-T22: 4 booth tables for 4 (bottom row)
  ...Array.from({length:4},(_,i)=>({id:`T${19+i}`,cap:4,section:"den",type:"booth4"})),
  // T23: 3-seat end booth
  {id:"T23",cap:3,section:"den",type:"booth3"},
];
const PATIO_TABLES = [
  {id:"T101",cap:6, section:"patio",type:"bigbooth",label:"Booth B"},
  {id:"T102",cap:10,section:"patio",type:"bigbooth",label:"Booth A"},
  ...Array.from({length:10},(_,i)=>({id:`T${103+i}`,cap:4,section:"patio",type:"booth4"})),
];
const ALL_TABLES = [...FINE_DINING_TABLES, ...BAR_STOOLS, ...DEN_TABLES, ...PATIO_TABLES];
// Total: 19 fine dining + 20 bar + 13 den + 12 patio = 64 table units

// ── STATUSES ──
const STATUSES = [
  "RSVP Requested",
  "RSVP Confirmed",
  "Seated",
  "Completed",
  "Change Requested",
  "Cancellation Requested",
  "Cancelled",
];

// ── SERVERS / STAFF (for admin UI and analytics) ──
const SERVERS_DEF = LOCAL_STAFF.filter(s=>s.accessLevel<=2).map(s=>({
  id:s.id, name:s.name, role:s.role, color:s.color,
  initials:s.name.split(" ").map(w=>w[0]).join("").toUpperCase(),
  accessLevel:s.accessLevel,
}));

// ── STORE HELPERS ──
function loadStore(){try{const r=localStorage.getItem(STORE_KEY);if(r)return JSON.parse(r);}catch(e){}return null;}
function saveStore(d){try{localStorage.setItem(STORE_KEY,JSON.stringify(d));}catch(e){}}
function genId(){const c="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";return Array.from({length:8},()=>c[Math.floor(Math.random()*c.length)]).join("");}

// ── SESSION HELPERS ──
function getSession(){try{return JSON.parse(sessionStorage.getItem("hive_session"))||null;}catch(e){return null;}}
function setSession(d){sessionStorage.setItem("hive_session",JSON.stringify(d));}
function clearSession(){sessionStorage.removeItem("hive_session");}
function getStaffName(){return getSession()?.staff?.name||"Staff";}
function getAccessLevel(){return getSession()?.staff?.accessLevel||99;}

// ── API HELPERS ──
async function sheetsGet(params){
  try{
    const r=await fetch(SHEETS_URL+"?"+new URLSearchParams(params).toString());
    return await r.json();
  }catch(e){console.warn("Sheets GET failed:",e.message);return null;}
}
async function sheetsPost(body){
  try{
    const r=await fetch(SHEETS_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    return await r.json();
  }catch(e){console.warn("Sheets POST failed:",e.message);return null;}
}

// ── FORMATTERS ──
function fmtTime(t){if(!t)return"—";const[h,m]=t.split(":");const hr=+h;return`${hr%12||12}:${m} ${hr>=12?"PM":"AM"}`;}
function fmtDate(d){if(!d)return"—";const[y,m,dy]=d.split("-");return`${m}/${dy}/${y}`;}

// ── MESSAGING HELPERS ──
function fireEmailWebhook(to,subject,body,rsvpId){
  console.log(`[SendGrid] To: ${to} | Subject: ${subject} | RSVP: ${rsvpId}`);
  return {provider:"SendGrid",to,subject,rsvpId,fired:new Date().toISOString()};
}
function fireSmsWebhook(to,body,rsvpId){
  console.log(`[Quo SMS] To: ${to} | RSVP: ${rsvpId}`);
  return {provider:"Quo",to,body,rsvpId,fired:new Date().toISOString()};
}
function fillTemplate(tmpl,rsv){
  const dateRel=rsv.date===TODAY?"today":rsv.date===TOMORROW?"tomorrow":rsv.date;
  return(tmpl||"")
    .replace(/{first}/g,rsv.first||"").replace(/{last}/g,rsv.last||"")
    .replace(/{date}/g,rsv.date||"").replace(/{date_rel}/g,dateRel)
    .replace(/{time}/g,fmtTime(rsv.time)).replace(/{party}/g,rsv.party||"")
    .replace(/{section}/g,(rsv.section||"").replace("_"," "))
    .replace(/{tables}/g,(rsv.tables||[]).join(", "))
    .replace(/{rsvp_id}/g,rsv.id||"").replace(/{server}/g,rsv.server||"your server");
}

// ── STORE INITIALIZATION ──
let _store = loadStore();
if(!_store){
  _store = {
    reservations: [],
    tableStates: {},
    tables: ALL_TABLES,
    servers: SERVERS_DEF,
    msgTemplates: {
      email_confirm:"Hi {first},\n\nYour reservation at Hive Buckhead is confirmed!\n\nDate: {date}\nTime: {time}\nParty: {party}\nRSVP #: {rsvp_id}\n\nHive Buckhead",
      sms_confirm:"Hi {first}! Hive Buckhead reservation confirmed for {date} at {time}, party of {party}. RSVP #{rsvp_id}.",
      email_reminder:"Hi {first},\n\nReminder: your Hive Buckhead reservation is {date_rel} at {time}.\n\nHive Buckhead",
      sms_reminder:"Hi {first}, your Hive Buckhead table is {date_rel} at {time}. 🍸",
      email_cancel:"Hi {first},\n\nYour reservation on {date} has been cancelled.\n\nHive Buckhead",
      sms_cancel:"Hi {first}, your Hive Buckhead reservation on {date} has been cancelled.",
      email_thankyou:"Hi {first},\n\nThank you for dining with us at Hive Buckhead!\n\nHive Buckhead",
      sms_thankyou:"Hi {first}! Thank you for dining at Hive Buckhead — hope to see you again! 🥂",
    }
  };
  saveStore(_store);
}
if(!_store.tables||_store.tables.length<60) _store.tables=ALL_TABLES;
if(!_store.servers||!_store.servers.length) _store.servers=SERVERS_DEF;
if(!_store.tableStates) _store.tableStates={};
(_store.reservations||[]).forEach(r=>{if(!r.tables)r.tables=r.table?[r.table]:[];});

function persistStore(){saveStore(_store);}
const window_HiveData_get=()=>_store;
const window_HiveData_reservations=()=>_store.reservations||[];
const window_HiveData_servers=()=>_store.servers||SERVERS_DEF;
const window_HiveData_tables=()=>_store.tables||ALL_TABLES;

// ── CROSS-TAB SYNC ──
window.addEventListener("storage",function(e){
  if(e.key===STORE_KEY&&e.newValue){
    try{
      _store=JSON.parse(e.newValue);
      if(typeof onStoreUpdate==="function") onStoreUpdate();
      if(typeof renderView==="function") renderView();
    }catch(ex){}
  }
});
