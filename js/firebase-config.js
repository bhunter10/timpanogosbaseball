/* Firebase Config & Helpers */
var firebaseConfig = {
  apiKey: "AIzaSyDmtUYPF128VKDbU0hEbBjNAFF4thMyo4A",
  authDomain: "timpanogos-baseball.firebaseapp.com",
  databaseURL: "https://timpanogos-baseball-default-rtdb.firebaseio.com",
  projectId: "timpanogos-baseball",
  storageBucket: "timpanogos-baseball.firebasestorage.app",
  messagingSenderId: "901167813003",
  appId: "1:901167813003:web:59cc9d24ca3492864b5f8e"
};

firebase.initializeApp(firebaseConfig);
var db = firebase.database();

/* Read once from a path, returns a promise */
function fbGet(path) {
  return db.ref(path).once('value').then(function(snap) {
    return snap.val();
  });
}

/* Set data at a path */
function fbSet(path, data) {
  return db.ref(path).set(data);
}

/* Push a new item to a path */
function fbPush(path, data) {
  return db.ref(path).push(data);
}

/* Remove all data at a path */
function fbRemove(path) {
  return db.ref(path).remove();
}

/* Convert Firebase object to array */
function fbToArray(obj) {
  if (!obj) return [];
  return Object.keys(obj).map(function(key) {
    var item = obj[key];
    item._key = key;
    return item;
  });
}

/* Seed database if empty */
function seedDatabase() {
  return fbGet('/').then(function(data) {
    if (data && data.games && data.results) return;

    var promises = [];

    if (!data || !data.games) {
      var games = [
        { date:'2026-03-05', opponent:'Crimson Cliffs', location:'Washington, UT', time:'6:30 PM' },
        { date:'2026-03-06', opponent:'Juab', location:'Washington, UT', time:'3:30 PM' },
        { date:'2026-03-07', opponent:'Ogden', location:'Washington, UT', time:'8:00 AM' },
        { date:'2026-03-07', opponent:'Murray', location:'Washington, UT', time:'1:00 PM' },
        { date:'2026-03-09', opponent:'American Fork', location:'BYU', time:'3:30 PM' },
        { date:'2026-03-10', opponent:'Viewmont', location:'Away', time:'3:30 PM' },
        { date:'2026-03-12', opponent:'Fremont', location:'Home', time:'3:30 PM' },
        { date:'2026-03-17', opponent:'Alta', location:'Home', time:'3:30 PM' },
        { date:'2026-03-19', opponent:'Salem Hills', location:'Away', time:'3:30 PM' },
        { date:'2026-03-24', opponent:'Mountain View', location:'Away', time:'3:30 PM' },
        { date:'2026-03-25', opponent:'Mountain View', location:'Home', time:'3:30 PM' },
        { date:'2026-03-27', opponent:'Mountain View', location:'Away', time:'3:30 PM' },
        { date:'2026-03-31', opponent:'Summit Academy', location:'Home', time:'3:30 PM' },
        { date:'2026-04-03', opponent:'Summit Academy', location:'Away', time:'3:30 PM' },
        { date:'2026-04-03', opponent:'Summit Academy', location:'Home', time:'3:30 PM' },
        { date:'2026-04-06', opponent:'Uintah', location:'Away', time:'1:00 PM' },
        { date:'2026-04-08', opponent:'Uintah', location:'Home', time:'1:00 PM' },
        { date:'2026-04-08', opponent:'Uintah', location:'Home', time:'3:00 PM' },
        { date:'2026-04-14', opponent:'Provo', location:'Away', time:'3:30 PM' },
        { date:'2026-04-15', opponent:'Provo', location:'Home', time:'3:30 PM' },
        { date:'2026-04-17', opponent:'Provo', location:'Away', time:'3:30 PM' },
        { date:'2026-04-21', opponent:'Orem', location:'Away', time:'3:30 PM' },
        { date:'2026-04-22', opponent:'Orem', location:'Home', time:'3:30 PM' },
        { date:'2026-04-24', opponent:'Orem', location:'Away', time:'3:30 PM' },
        { date:'2026-05-04', opponent:'TBD', location:'Home', time:'3:30 PM', playoff:true }
      ];
      promises.push(fbSet('games', games));
    }

    if (!data || !data.results) {
      var results = [
        { date:'2025-09-02', opponent:'Spanish Fork', ourScore:7, theirScore:0 },
        { date:'2025-09-11', opponent:'Skyridge', ourScore:4, theirScore:2 },
        { date:'2025-09-16', opponent:'Brighton', ourScore:7, theirScore:0 },
        { date:'2025-09-17', opponent:'Spanish Fork', ourScore:4, theirScore:6 },
        { date:'2025-09-24', opponent:'Viewmont', ourScore:4, theirScore:3 },
        { date:'2025-09-25', opponent:'Pleasant Grove', ourScore:5, theirScore:8 },
        { date:'2025-10-01', opponent:'American Fork', ourScore:5, theirScore:2 },
        { date:'2025-10-24', opponent:'Rawlings Tigers Black', ourScore:5, theirScore:1 },
        { date:'2025-10-24', opponent:'Virgin Valley Dawgs', ourScore:13, theirScore:1 },
        { date:'2025-10-25', opponent:'SoIda Chivos', ourScore:9, theirScore:8 },
        { date:'2025-10-25', opponent:'CBA Warriors Navy', ourScore:4, theirScore:0 },
        { date:'2025-10-25', opponent:'Southern Utah Storm', ourScore:2, theirScore:4 }
      ];
      promises.push(fbSet('results', results));
    }

    return Promise.all(promises);
  });
}
