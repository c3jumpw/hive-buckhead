// ── HIVE BUCKHEAD — SHARED DATA LAYER v2 ──
// Storage key shared across all pages
const STORE_KEY = "hive_buckhead_v2";
const TODAY = new Date().toISOString().split("T")[0];
const TOMORROW = new Date(Date.now()+86400000).toISOString().split("T")[0];

// ── TABLE DEFINITIONS ──
// Fine Dining: T200-T218, 2-seat base, joinable extensions
// Bar: B1-B20, individual stools
// Den: T11-T23, 4-seat base, lettered extensions
// Patio: T101-T112, 4-seat base, lettered extensions

const FINE_DINING_TABLES = [
  ...Array.from({length:19},(_,i)=>({
    id:`T${200+i}`, num:`${200+i}`, cap:2, section:'fine_dining',
    extensions:[`T${200+i}A`,`T${200+i}B`].slice(0, i<10?2:1),
    x: 0, y: 0 // positions set in floor renderer
  }))
];
const BAR_STOOLS = Array.from({length:20},(_,i)=>({
  id:`B${i+1}`, num:`B${i+1}`, cap:1, section:'bar', extensions:[], x:0,y:0
}));
const DEN_TABLES = Array.from({length:13},(_,i)=>({
  id:`T${11+i}`, num:`${11+i}`, cap:4, section:'den',
  extensions:[`T${11+i}B`,`T${11+i}C`],
  x:0,y:0
}));
const PATIO_TABLES = Array.from({length:12},(_,i)=>({
  id:`T${101+i}`, num:`${101+i}`, cap:4, section:'patio',
  extensions:[`T${101+i}A`,`T${101+i}B`,`T${101+i}C`].slice(0,2),
  x:0,y:0
}));
const ALL_TABLES = [...FINE_DINING_TABLES, ...BAR_STOOLS, ...DEN_TABLES, ...PATIO_TABLES];

const SERVERS_DEF = [
  {id:"s1",name:"Ashley Smith",role:"Lead Server",sections:["fine_dining","bar"],color:"#C9A96E",initials:"AS"},
  {id:"s2",name:"Marcus Rivera",role:"Server",sections:["fine_dining"],color:"#5B96C8",initials:"MR"},
  {id:"s3",name:"Jenna Park",role:"Server",sections:["den","patio"],color:"#9B7EC8",initials:"JP"},
  {id:"s4",name:"Devon Harris",role:"Server / Bar",sections:["bar","den"],color:"#3AACA8",initials:"DH"},
  {id:"s5",name:"Taylor Reeves",role:"Server",sections:["patio"],color:"#C45A8A",initials:"TR"},
];

// ── STATUSES ──
const STATUSES = [
  'RSVP Requested',
  'RSVP Confirmed',
  'Seated',
  'Table Available',    // post-bussing intermediate
  'Completed',
  'Change Requested',   // guest submitted change via form
  'Cancellation Requested', // guest submitted cancel via form
  'Cancelled',
];

// ── SAMPLE RESERVATIONS ──
const SAMPLE_RSV = [
  {id:"86AH8ZMTA",first:"Matest",last:"Now",phone:"4702226558",email:"c1.jumpw@gmail.com",
   date:TODAY,time:"15:15",party:2,status:"Seated",server:"Ashley Smith",
   tables:["T203"],notes:"Bringing confetti",requested:TODAY,confirmed:TODAY,
   orderTotal:null,receipt:null,section:"fine_dining",
   activities:[{type:"created",text:"RSVP received via web form",time:"Today 2:00pm"},{type:"status",text:"Confirmed",time:"Today 2:01pm"},{type:"status",text:"Seated at T203",time:"Today 3:15pm"}]},
  {id:"9KF3PLMX",first:"Jordan",last:"Baptiste",phone:"4045552341",email:"jbaptiste@gmail.com",
   date:TODAY,time:"18:30",party:6,status:"RSVP Confirmed",server:"Marcus Rivera",
   tables:["T205","T205A","T206"],notes:"Anniversary dinner — flowers requested",
   requested:TODAY,confirmed:TODAY,orderTotal:null,receipt:null,section:"fine_dining",
   activities:[{type:"created",text:"RSVP received",time:"Today 2:10pm"},{type:"email",text:"Confirmation email sent via SendGrid",time:"Today 2:11pm"},{type:"sms",text:"SMS sent via Quo",time:"Today 2:11pm"}]},
  {id:"7ZB2WNQR",first:"Priya",last:"Nair",phone:"6785553819",email:"priya.n@outlook.com",
   date:TODAY,time:"19:00",party:8,status:"RSVP Requested",server:"",
   tables:[],notes:"Gluten allergy for 1 guest",requested:TODAY,confirmed:"",
   orderTotal:null,receipt:null,section:"",
   activities:[{type:"created",text:"RSVP received via web form",time:"Today 3:45pm"}]},
  {id:"4XC9JHTV",first:"Tyler",last:"Monroe",phone:"4045558823",email:"tmonroe@me.com",
   date:TODAY,time:"16:00",party:2,status:"Completed",server:"Jenna Park",
   tables:["T15"],notes:"Birthday celebration",requested:TODAY,confirmed:TODAY,
   orderTotal:187.50,receipt:"receipt_4XC9JHTV.jpg",section:"den",
   activities:[{type:"created",text:"RSVP received",time:"Today"},{type:"close",text:"Table closed — $187.50 logged",time:"Today 5:48pm"}]},
  {id:"2RM6DKPN",first:"Camille",last:"Osei",phone:"4042228811",email:"camille.o@gmail.com",
   date:TODAY,time:"17:30",party:4,status:"RSVP Confirmed",server:"Devon Harris",
   tables:["T18"],notes:"",requested:TODAY,confirmed:TODAY,
   orderTotal:null,receipt:null,section:"den",
   activities:[{type:"created",text:"RSVP received",time:"Today 4:12pm"},{type:"email",text:"Confirmation sent",time:"Today 4:13pm"}]},
  {id:"5TN1QABZ",first:"DeShawn",last:"Williams",phone:"6786663322",email:"dw@gmail.com",
   date:TODAY,time:"20:30",party:16,status:"RSVP Confirmed",server:"Devon Harris",
   tables:["T11","T11B","T11C","T12","T12B"],notes:"Large group — need all extensions",
   requested:TODAY,confirmed:TODAY,orderTotal:null,receipt:null,section:"den",
   activities:[{type:"created",text:"RSVP received",time:"Today 9:00am"},{type:"status",text:"Confirmed by Devon Harris",time:"Today 9:05am"}]},
  {id:"3QP7MZNK",first:"Ava",last:"Thompson",phone:"4048887766",email:"ava.t@gmail.com",
   date:TOMORROW,time:"19:30",party:4,status:"RSVP Confirmed",server:"Ashley Smith",
   tables:["T104"],notes:"",requested:TODAY,confirmed:TODAY,
   orderTotal:null,receipt:null,section:"patio",
   activities:[{type:"created",text:"RSVP received",time:"Today"}]},
  {id:"8WX2RVCS",first:"Marcus",last:"Lee",phone:"6784443322",email:"mlee@me.com",
   date:TODAY,time:"21:00",party:3,status:"Cancellation Requested",server:"Marcus Rivera",
   tables:["T201"],notes:"Change request: wants to move to patio",
   requested:TODAY,confirmed:TODAY,orderTotal:null,receipt:null,section:"fine_dining",
   changeRequest:{type:"cancellation",reason:"Plans changed",submittedAt:TODAY,message:"Sorry, we need to cancel our reservation."},
   activities:[{type:"created",text:"RSVP received",time:"Today"},{type:"change",text:"Cancellation requested by guest via web form",time:"Today 6:12pm"}]},
  {id:"RQ9ZXBMN",first:"Serena",last:"Walsh",phone:"4044449912",email:"swalsh@gmail.com",
   date:TODAY,time:"19:30",party:2,status:"Change Requested",server:"Ashley Smith",
   tables:["T210"],notes:"",requested:TODAY,confirmed:TODAY,
   orderTotal:null,receipt:null,section:"fine_dining",
   changeRequest:{type:"change",reason:"Different time",newTime:"20:00",submittedAt:TODAY,message:"Can we move to 8pm instead?"},
   activities:[{type:"created",text:"RSVP received",time:"Today"},{type:"change",text:"Time change requested: 7:30pm → 8:00pm",time:"Today 5:30pm"}]},
];

function loadStore(){try{const r=localStorage.getItem(STORE_KEY);if(r)return JSON.parse(r);}catch(e){}return null;}
function saveStore(d){try{localStorage.setItem(STORE_KEY,JSON.stringify(d));}catch(e){}}
function genId(){const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return Array.from({length:8},()=>c[Math.floor(Math.random()*c.length)]).join('');}

let _store = loadStore();
if(!_store){
  _store = {
    reservations: JSON.parse(JSON.stringify(SAMPLE_RSV)),
    tableStates: {"T202":"dirty","B5":"dirty"},
    tables: ALL_TABLES,
    servers: SERVERS_DEF,
    msgTemplates: {
      email_confirm: "Hi {first},\n\nYour reservation at Hive Buckhead is confirmed!\n\nDate: {date}\nTime: {time}\nParty of: {party}\nSection: {section}\nTable(s): {tables}\nRSVP #: {rsvp_id}\n\nWe look forward to seeing you.\n\nHive Buckhead",
      email_reminder: "Hi {first},\n\nReminder: your Hive Buckhead reservation is {date_rel} at {time} for {party}. See you soon!\n\nHive Buckhead",
      email_cancel: "Hi {first},\n\nYour reservation on {date} has been cancelled.\n\nWe hope to see you again.\n\nHive Buckhead",
      email_thankyou: "Hi {first},\n\nThank you for dining with us at Hive Buckhead! We hope you had a wonderful experience.\n\nHive Buckhead",
      email_seated: "Hi {first},\n\nYour table is ready! Your server {server} will be right with you.\n\nHive Buckhead",
      sms_confirm: "Hi {first}! Hive Buckhead reservation confirmed for {date} at {time}, party of {party}. RSVP #{rsvp_id}. See you then!",
      sms_reminder: "Hi {first}, your Hive Buckhead table is {date_rel} at {time} for {party}. 🍸",
      sms_cancel: "Hi {first}, your Hive Buckhead reservation on {date} has been cancelled. Questions? Call us.",
      sms_thankyou: "Hi {first}! Thank you for dining at Hive Buckhead — hope to see you again! 🥂",
      sms_seated: "Hi {first}! Your table is ready at Hive Buckhead. Your server {server} will be with you shortly.",
    }
  };
  saveStore(_store);
}
if(!_store.tables || _store.tables.length < 60) _store.tables = ALL_TABLES;
if(!_store.servers) _store.servers = SERVERS_DEF;
if(!_store.tableStates) _store.tableStates = {};

// Ensure all reservations have tables array (migrate old format)
(_store.reservations||[]).forEach(r=>{if(!r.tables)r.tables=r.table?[r.table]:[];});

function persistStore(){saveStore(_store);}

// Sendgrid + Quo webhook simulation
function fireEmailWebhook(to, subject, body, rsvpId){
  console.log(`[SendGrid] To: ${to} | Subject: ${subject} | RSVP: ${rsvpId}`);
  // Production: POST to https://api.sendgrid.com/v3/mail/send
  return {provider:'SendGrid',to,subject,rsvpId,fired:new Date().toISOString()};
}
function fireSmsWebhook(to, body, rsvpId){
  console.log(`[Quo SMS] To: ${to} | RSVP: ${rsvpId}`);
  // Production: POST to Quo API endpoint
  return {provider:'Quo',to,body,rsvpId,fired:new Date().toISOString()};
}

function fillTemplate(tmpl, rsv){
  const now = new Date();
  const rDate = new Date(rsv.date+'T12:00:00');
  const dateRel = rsv.date===TODAY?'today':rsv.date===TOMORROW?'tomorrow':rsv.date;
  return (tmpl||'')
    .replace(/{first}/g, rsv.first||'')
    .replace(/{last}/g, rsv.last||'')
    .replace(/{date}/g, rsv.date||'')
    .replace(/{date_rel}/g, dateRel)
    .replace(/{time}/g, fmtTime(rsv.time))
    .replace(/{party}/g, rsv.party||'')
    .replace(/{section}/g, (rsv.section||'').replace('_',' '))
    .replace(/{tables}/g, (rsv.tables||[]).join(', '))
    .replace(/{rsvp_id}/g, rsv.id||'')
    .replace(/{server}/g, rsv.server||'your server');
}

function triggerAutomation(rsv, trigger){
  const t = _store.msgTemplates || {};
  const subjectMap = {
    confirm: 'Your Hive Buckhead Reservation is Confirmed',
    reminder: 'Reminder: Your Reservation at Hive Buckhead',
    cancel: 'Your Hive Buckhead Reservation has been Cancelled',
    thankyou: 'Thank You for Dining at Hive Buckhead',
    seated: 'Your Table is Ready at Hive Buckhead',
    change_confirm: 'Your Reservation Change has been Confirmed',
    cancel_confirm: 'Your Cancellation has been Confirmed',
  };
  const emailBody = fillTemplate(t[`email_${trigger}`]||'', rsv);
  const smsBody = fillTemplate(t[`sms_${trigger}`]||'', rsv);
  if(rsv.email) fireEmailWebhook(rsv.email, subjectMap[trigger]||'Hive Buckhead', emailBody, rsv.id);
  if(rsv.phone) fireSmsWebhook(rsv.phone, smsBody, rsv.id);
  return {email: emailBody, sms: smsBody};
}

function fmtTime(t){if(!t)return'—';const[h,m]=t.split(':');const hr=+h;return`${hr%12||12}:${m} ${hr>=12?'PM':'AM'}`}
function fmtDate(d){if(!d)return'—';const[y,m,dy]=d.split('-');return`${m}/${dy}/${y}`}

// Cross-tab sync
window.addEventListener("storage",function(e){
  if(e.key===STORE_KEY&&e.newValue){
    try{_store=JSON.parse(e.newValue);if(typeof onStoreUpdate==='function')onStoreUpdate();}catch(ex){}
  }
});
