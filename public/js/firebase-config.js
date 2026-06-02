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
var storage = firebase.storage();
var auth = firebase.auth();
var currentAdminUser = null;
var authReady = false;

auth.onAuthStateChanged(function(user) {
  currentAdminUser = user;
  authReady = true;
  document.dispatchEvent(new CustomEvent('adminauthchange'));
});

function fbSignIn(email, password) {
  return auth.signInWithEmailAndPassword(email, password);
}

function fbSignOut() {
  return auth.signOut();
}

function fbFormatError(err, pathHint) {
  var code = err && err.code ? String(err.code) : '';
  var message = err && err.message ? String(err.message) : 'Request failed.';
  if (code === 'PERMISSION_DENIED' || message.toLowerCase().indexOf('permission denied') !== -1) {
    return 'Firebase denied this ' + (pathHint ? 'write to ' + pathHint : 'request') +
      '. Publish the rules in database.rules.json (Realtime Database) and storage.rules (Storage) from the Firebase Console or run: firebase deploy --only database,storage';
  }
  return message;
}

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

function fbUploadFile(path, file, metadata, onProgress) {
  return new Promise(function(resolve, reject) {
    var ref = storage.ref(path);
    var task = ref.put(file, metadata || {});
    var timeout = setTimeout(function() {
      reject(new Error('Upload timed out. Check Firebase Storage rules and network access.'));
      task.cancel();
    }, 60000);

    task.on('state_changed', function(snapshot) {
      if (onProgress && snapshot.totalBytes) {
        onProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
      }
    }, function(error) {
      clearTimeout(timeout);
      reject(error);
    }, function() {
      clearTimeout(timeout);
      task.snapshot.ref.getDownloadURL().then(function(url) {
        resolve({ url: url, storagePath: path });
      }).catch(reject);
    });
  });
}

function fbDeleteFile(path) {
  if (!path) return Promise.resolve();
  return storage.ref(path).delete();
}

/* Convert Firebase object to array */
function fbToArray(obj) {
  if (!obj) return [];
  return Object.keys(obj).sort(function(a, b) {
    var numA = Number(a), numB = Number(b);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  }).map(function(key) {
    var item = obj[key];
    if (item && typeof item === 'object') item._key = key;
    return item;
  }).filter(Boolean);
}

function fbHasChildren(value) {
  return !!(value && typeof value === 'object' && Object.keys(value).length);
}

/* Seed database if empty (writes require auth — see Realtime Database rules). */
function seedDatabase() {
  return Promise.all([
    fbGet('games'),
    fbGet('results')
  ]).then(function(vals) {
    var hasGames = fbHasChildren(vals[0]);
    var hasResults = fbHasChildren(vals[1]);
    if (hasGames && hasResults) return Promise.resolve();
    if (!auth.currentUser) return Promise.resolve();

    var seed = window.TimpanogosScheduleSeed;
    if (!seed) return Promise.resolve();

    var promises = [];
    if (!hasGames && seed.games && seed.games.length) {
      promises.push(fbSet('games', seed.games));
    }
    if (!hasResults && seed.results && seed.results.length) {
      promises.push(fbSet('results', seed.results));
    }
    if (!promises.length) return Promise.resolve();
    return Promise.all(promises);
  });
}

/* Replace games/results with schedule backup (admin rebuild). */
function reseedScheduleDatabase() {
  if (!auth.currentUser) {
    return Promise.reject(new Error('Sign in to reseed the schedule.'));
  }
  var seed = window.TimpanogosScheduleSeed;
  if (!seed || !seed.games || !seed.results) {
    return Promise.reject(new Error('Schedule seed data is not loaded.'));
  }
  return Promise.all([
    fbSet('games', seed.games),
    fbSet('results', seed.results)
  ]);
}
