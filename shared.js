// ── HIVE BUCKHEAD SHARED DATA LAYER ──
// This file is the single source of truth.
// All three pages (index, floor, admin) read/write through window.HiveData.
// In production, replace localStorage with a real API (ClickUp / Google Sheets).

(function(window){
  const STORE_KEY = 'hive_buckhead_v1';

  const DEFAULT_TABLES = [
    // Indoor Dining
    {id:'T1', num:'T1', cap:4, section:'indoor', row:0, col:0},
    {id:'T2', num:'T2', cap:4, section:'indoor', row:0, col:1},
    {id:'T3', num:'T3', cap:4, section:'indoor', row:0, col:2},
    {id:'T4', num:'T4', cap:4, section:'indoor', row:0, col:3},
    {id:'T5', num:'T5', cap:4, section:'indoor', row:1, col:0},
    {id:'T6', num:'T6', cap:4, section:'indoor', row:1, col:1},
    {id:'T7', num:'T7', cap:4, section:'indoor', row:1, col:2},
    {id:'T8', num:'T8', cap:4, section:'indoor', row:1, col:3},
    {id:'T9', num:'T9', cap:4, section:'indoor', row:2, col:0},
    {id:'T10',num:'T10',cap:4, section:'indoor', row:2, col:1},
    {id:'T11',num:'T11',cap:4, section:'indoor', row:2, col:2},
    {id:'T12',num:'T12',cap:4, section:'indoor', row:2, col:3},
    // Den
    {id:'T13',num:'T13',cap:4, section:'den', row:0, col:0},
    {id:'T14',num:'T14',cap:4, section:'den', row:0, col:1},
    {id:'T15',num:'T15',cap:4, section:'den', row:1, col:0},
    {id:'T16',num:'T16',cap:4, section:'den', row:2, col:0},
    {id:'T18',num:'T18',cap:4, section:'den', row:1, col:1},
    {id:'T19',num:'T19',cap:4, section:'den', row:3, col:0},
    {id:'T20',num:'T20',cap:4, section:'den', row:3, col:1},
    // Bar
    {id:'BAR1',num:'Main Bar', cap:8, section:'bar_main'},
    {id:'BAR2',num:'Service',  cap:4, section:'bar_service'},
    {id:'BAR3',num:'Lounge',   cap:8, section:'bar_lounge'},
    // Patio
    {id:'P1',num:'P1',cap:4, section:'patio'},
    {id:'P2',num:'P2',cap:4, section:'patio'},
    {id:'P3',num:'P3',cap:4, section:'patio'},
    {id:'P4',num:'P4',cap:4, section:'patio'},
    {id:'P5',num:'P5',cap:4, section:'patio'},
  ];

  const DEFAULT_SERVERS = [
    {id:'s1', name:'Ashley Smith',  role:'Lead Server',    color:'#C9A96E', initials:'AS'},
    {id:'s2', name:'Marcus Rivera', role:'Server',         color:'#5B96C8', initials:'MR'},
    {id:'s3', name:'Jenna Park',    role:'Server',         color:'#9B7EC8', initials:'JP'},
    {id:'s4', name:'Devon Harris',  role:'Server / Bar',   color:'#3AACA8', initials:'DH'},
  ];

  const TODAY = new Date().toISOString().split('T')[0];

  const DEFAULT_RESERVATIONS = [
    {id:'86AH8ZMTA',first:'Matest',last:'Now',phone:'4702226558',email:'c1.jumpw@gmail.com',date:'2026-06-12',time:'15:15',party:2,status:'Seated',server:'Ashley Smith',table:'T3',notes:'Bringing confetti',requested:'2026-05-04',confirmed:'2026-06-13',orderTotal:null,receipt:null,tableState:null,
     activities:[{type:'created',text:'RSVP received via forms.app',time:'May 4 5:23pm'},{type:'email',text:'Confirmation email sent via SendGrid',time:'May 13 5:28pm'},{type:'sms',text:'SMS sent via Twilio',time:'May 13 5:28pm'},{type:'sync',text:'ClickUp Task ID assigned: 86AH8ZMTA',time:'May 13 5:28pm'},{type:'status',text:'Seated at T3',time:'Jun 12 3:18pm'}]},
    {id:'9KF3PLMX',first:'Jordan',last:'Baptiste',phone:'4045552341',email:'jbaptiste@gmail.com',date:TODAY,time:'18:30',party:4,status:'RSVP Confirmed',server:'Marcus Rivera',table:'T5',notes:'Anniversary dinner — flowers requested',requested:TODAY,confirmed:TODAY,orderTotal:null,receipt:null,
     activities:[{type:'created',text:'RSVP received via forms.app',time:'Today 2:10pm'},{type:'email',text:'Confirmation email sent',time:'Today 2:11pm'},{type:'sms',text:'SMS sent',time:'Today 2:11pm'}]},
    {id:'7ZB2WNQR',first:'Priya',last:'Nair',phone:'6785553819',email:'priya.n@outlook.com',date:TODAY,time:'19:00',party:6,status:'RSVP Requested',server:'',table:'',notes:'Gluten allergy for 1 guest',requested:TODAY,confirmed:'',orderTotal:null,receipt:null,
     activities:[{type:'created',text:'RSVP received via forms.app',time:'Today 3:45pm'}]},
    {id:'4XC9JHTV',first:'Tyler',last:'Monroe',phone:'4045558823',email:'tmonroe@me.com',date:'2026-06-08',time:'20:00',party:2,status:'Completed',server:'Jenna Park',table:'T2',notes:'Birthday celebration',requested:'2026-06-07',confirmed:'2026-06-08',orderTotal:187.50,receipt:'receipt_4XC9JHTV.jpg',
     activities:[{type:'created',text:'RSVP received',time:'Jun 7'},{type:'status',text:'Confirmed',time:'Jun 7'},{type:'status',text:'Seated at T2',time:'Jun 8 8:02pm'},{type:'close',text:'Table closed — $187.50 logged',time:'Jun 8 9:48pm'},{type:'sync',text:'Logged to Google Sheets',time:'Jun 8 9:50pm'}]},
    {id:'2RM6DKPN',first:'Camille',last:'Osei',phone:'4042228811',email:'camille.o@gmail.com',date:TODAY,time:'17:30',party:3,status:'RSVP Requested',server:'',table:'',notes:'',requested:TODAY,confirmed:'',orderTotal:null,receipt:null,
     activities:[{type:'created',text:'RSVP received',time:'Today 4:12pm'}]},
    {id:'5TN1QABZ',first:'DeShawn',last:'Williams',phone:'6786663322',email:'dw@gmail.com',date:TODAY,time:'20:30',party:8,status:'RSVP Confirmed',server:'Devon Harris',table:'T7',notes:'Large group — push tables',requested:TODAY,confirmed:TODAY,orderTotal:null,receipt:null,
     activities:[{type:'created',text:'RSVP received',time:'Today 9:00am'},{type:'status',text:'Confirmed by Devon Harris',time:'Today 9:05am'},{type:'email',text:'Confirmation sent',time:'Today 9:05am'}]},
  ];

  const DEFAULT_TABLE_STATES = {'T9':'dirty','T1':'dirty'};

  function load(){
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if(raw) return JSON.parse(raw);
    } catch(e){}
    return {
      reservations: DEFAULT_RESERVATIONS,
      tableStates: DEFAULT_TABLE_STATES,
      servers: DEFAULT_SERVERS,
      tables: DEFAULT_TABLES,
      lastSync: null,
    };
  }

  function save(data){
    try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch(e){}
    // Broadcast to other tabs
    window.dispatchEvent(new CustomEvent('hive_sync', {detail: data}));
  }

  let _data = load();

  // Listen for changes from other tabs
  window.addEventListener('storage', function(e){
    if(e.key === STORE_KEY && e.newValue){
      try {
        _data = JSON.parse(e.newValue);
        window.dispatchEvent(new CustomEvent('hive_reload', {detail: _data}));
      } catch(ex){}
    }
  });

  window.HiveData = {
    get: () => _data,
    save: (d) => { _data = d; save(d); },
    tables: () => _data.tables || DEFAULT_TABLES,
    servers: () => _data.servers || DEFAULT_SERVERS,
    reservations: () => _data.reservations || [],
    tableStates: () => _data.tableStates || {},
    setTableState: (tid, state) => {
      _data.tableStates = _data.tableStates || {};
      if(state === 'open') delete _data.tableStates[tid];
      else _data.tableStates[tid] = state;
      save(_data);
    },
    updateReservation: (r) => {
      const idx = _data.reservations.findIndex(x => x.id === r.id);
      if(idx >= 0) _data.reservations[idx] = r;
      else _data.reservations.push(r);
      save(_data);
    },
    addReservation: (r) => {
      _data.reservations.push(r);
      save(_data);
    },
    genId: () => {
      const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      return Array.from({length:8},()=>c[Math.floor(Math.random()*c.length)]).join('');
    },
    TODAY,
  };
})(window);
