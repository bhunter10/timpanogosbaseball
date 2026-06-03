/* ── Shared Utilities ── */
var cachedGames = null;
var cachedResults = null;
var cachedCarouselPhotos = null;
var cachedOpponents = null;
var carouselRefreshStorageKey = 'timpanogosCarouselPhotosUpdatedAt';
var scheduleTeamLevels = [
  { value: 'varsity', label: 'Varsity' },
  { value: 'jv', label: 'JV' },
  { value: 'sophomore', label: 'Sophomores' }
];
var baseballSeasons = [
  { value: 'spring', label: 'Spring', order: 1 },
  { value: 'summer', label: 'Summer', order: 2 },
  { value: 'fall', label: 'Fall', order: 3 }
];

function fbSave(key, data) {
  if (Array.isArray(data)) {
    data = data.filter(Boolean).map(cleanFirebaseRecord);
  }

  return fbSet(key, data).then(function() {
    if (key === 'games') cachedGames = data;
    if (key === 'results') cachedResults = data;
    if (key === 'carouselPhotos') cachedCarouselPhotos = data;
    if (key === 'opponents') cachedOpponents = data;
    return data;
  });
}

function cleanFirebaseRecord(item) {
  if (!item || typeof item !== 'object') return item;
  var cleaned = Object.assign({}, item);
  delete cleaned._key;
  return cleaned;
}

function firebaseChildKey(item, index) {
  return item && item._key != null ? item._key : String(index);
}

function fbSaveChild(collection, childKey, data) {
  var cleaned = cleanFirebaseRecord(data);
  return fbSet(collection + '/' + childKey, cleaned).then(function() {
    return Object.assign({ _key: childKey }, cleaned);
  });
}

function fbAddChild(collection, data) {
  var cleaned = cleanFirebaseRecord(data);
  return fbPush(collection, cleaned).then(function(ref) {
    return Object.assign({ _key: ref.key }, cleaned);
  });
}

function fbDeleteChild(collection, childKey) {
  return fbRemove(collection + '/' + childKey);
}

function fbGetOptional(path, fallback) {
  return fbGet(path).catch(function(err) {
    var message = err && (err.message || err.code) ? (err.message || err.code) : '';
    if (String(message).indexOf('permission_denied') === -1) {
      console.warn('Optional Firebase path failed:', path, message || err);
    }
    return fallback;
  });
}

function getGames() { return cachedGames || []; }
function getResults() { return cachedResults || []; }
function getOpponents() { return cachedOpponents || []; }
function getScheduleTeamLevel(value) {
  value = String(value || '').trim().toLowerCase();
  return scheduleTeamLevels.some(function(level) { return level.value === value; }) ? value : 'varsity';
}
function getScheduleTeamLabel(value) {
  var teamLevel = getScheduleTeamLevel(value);
  var match = scheduleTeamLevels.find(function(level) { return level.value === teamLevel; });
  return match ? match.label : 'Varsity';
}
function getDateParts(iso) {
  var parts = String(iso || '').split('-').map(function(part) { return +part; });
  if (parts.length !== 3 || parts.some(function(part) { return !Number.isFinite(part); })) return null;
  return { year: parts[0], month: parts[1], day: parts[2] };
}
function getBaseballSeason(value, date) {
  value = String(value || '').trim().toLowerCase();
  var parts = getDateParts(date);
  if (parts) {
    if (parts.month >= 6 && parts.month <= 8) return 'summer';
    if (parts.month >= 9 && parts.month <= 11) return 'fall';
    return 'spring';
  }
  if (baseballSeasons.some(function(season) { return season.value === value; })) return value;
  return 'spring';
}
function getBaseballSeasonLabel(value, date) {
  var season = getBaseballSeason(value, date);
  var parts = getDateParts(date);
  var match = baseballSeasons.find(function(item) { return item.value === season; });
  return (match ? match.label : 'Spring') + (parts ? ' ' + parts.year : '');
}
function updateGameSeasonHint() {
  var hint = document.getElementById('gameSeasonHint');
  var dateInput = document.getElementById('gameDate');
  if (!hint || !dateInput) return;
  hint.textContent = dateInput.value
    ? getBaseballSeasonLabel('', dateInput.value)
    : 'Season is set from the game date.';
}
function normalizeOpponent(opponent, index) {
  return {
    schoolName: opponent && opponent.schoolName ? opponent.schoolName : '',
    shortName: opponent && opponent.shortName ? opponent.shortName : '',
    mascot: opponent && opponent.mascot ? opponent.mascot : '',
    address: opponent && opponent.address ? opponent.address : '',
    logoUrl: opponent && opponent.logoUrl ? opponent.logoUrl : '',
    logoStoragePath: opponent && opponent.logoStoragePath ? opponent.logoStoragePath : '',
    maxprepsSchoolId: opponent && opponent.maxprepsSchoolId ? opponent.maxprepsSchoolId : '',
    maxprepsUrl: opponent && opponent.maxprepsUrl ? opponent.maxprepsUrl : '',
    sortOrder: opponent && opponent.sortOrder != null ? +opponent.sortOrder : index,
    _key: opponent && opponent._key != null ? opponent._key : String(index)
  };
}
function normalizeSchoolKey(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function findOpponentForMaxPreps(mpTeam, opponentsList) {
  const list = opponentsList || opponents;
  const mpId = mpTeam && mpTeam.maxprepsSchoolId;
  const mpKey = normalizeSchoolKey(mpTeam && mpTeam.schoolName);
  return list.find(function(opponent) {
    if (opponent.maxprepsSchoolId && mpId && opponent.maxprepsSchoolId === mpId) return true;
    return normalizeSchoolKey(opponent.schoolName) === mpKey;
  }) || null;
}
function maxprepsImportAction(mpTeam, existing) {
  if (!existing) return 'add';
  const needsMascot = mpTeam.mascot && !existing.mascot;
  const needsAddress = mpTeam.address && !existing.address;
  const needsLogo = mpTeam.logoUrl && !existing.logoUrl;
  if (needsMascot || needsAddress || needsLogo) return 'update';
  return 'skip';
}
function mascotBlobToPngFile(blob, schoolName) {
  return new Promise(function(resolve, reject) {
    const img = new Image();
    const objectUrl = URL.createObjectURL(blob);
    img.crossOrigin = 'anonymous';
    img.onload = function() {
      URL.revokeObjectURL(objectUrl);
      const size = 256;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, size, size);
      const scale = Math.min(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      canvas.toBlob(function(pngBlob) {
        if (!pngBlob) {
          reject(new Error('Could not convert logo'));
          return;
        }
        const safe = (schoolName || 'opponent').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'opponent';
        resolve(new File([pngBlob], safe + '.png', { type: 'image/png' }));
      }, 'image/png', 0.92);
    };
    img.onerror = function() {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Logo image failed to load'));
    };
    img.src = objectUrl;
  });
}
function opponentLogoFileFromUrl(logoUrl, schoolName) {
  return fetch(logoUrl, { mode: 'cors' }).then(function(response) {
    if (!response.ok) throw new Error('Logo download failed');
    return response.blob();
  }).then(function(blob) {
    return mascotBlobToPngFile(blob, schoolName);
  });
}
function normalizeOpponentList(opponents) {
  return (opponents || []).map(normalizeOpponent)
    .filter(function(opponent) { return opponent.schoolName; })
    .sort(function(a, b) {
      return (a.schoolName || '').localeCompare(b.schoolName || '', undefined, { sensitivity: 'base' });
    });
}
function findOpponentById(opponentId, opponents) {
  if (!opponentId) return null;
  return (opponents || getOpponents()).find(function(opponent) {
    return opponent && opponent._key === opponentId;
  }) || null;
}
function isHomeGameLocation(location) {
  return String(location || '').trim().toLowerCase() === 'home';
}

function opponentsMatch(a, b) {
  if (!a || !b) return false;
  if (a.opponentId && b.opponentId && a.opponentId === b.opponentId) return true;
  var aName = String(a.opponent || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  var bName = String(b.opponent || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (aName && bName) {
    if (aName === bName) return true;
    var shorter = aName.length <= bName.length ? aName : bName;
    var longer = aName.length > bName.length ? aName : bName;
    if (longer === shorter || longer.indexOf(shorter + ' ') === 0) return true;
  }
  return a.opponent === b.opponent;
}
function resultsSameContest(a, b) {
  if (!a || !b || a.date !== b.date) return false;
  if (getScheduleTeamLevel(a.teamLevel) !== getScheduleTeamLevel(b.teamLevel)) return false;
  if (getBaseballSeason(a.season, a.date) !== getBaseballSeason(b.season, b.date)) return false;
  if (!opponentsMatch(a, b)) return false;
  return !a.time || !b.time || a.time === b.time;
}
function enrichGameWithOpponent(game, opponents) {
  var enriched = Object.assign({}, game);
  enriched.teamLevel = getScheduleTeamLevel(enriched.teamLevel);
  enriched.season = getBaseballSeason(enriched.season, enriched.date);
  var opponent = findOpponentById(enriched.opponentId, opponents);
  if (opponent) {
    enriched.opponent = opponent.shortName || opponent.schoolName || enriched.opponent;
    enriched.opponentMascot = opponent.mascot || '';
    enriched.opponentLogoUrl = opponent.logoUrl || '';
    if (!isHomeGameLocation(enriched.location)) {
      enriched.locationAddress = enriched.locationAddress || opponent.address || '';
    }
  }
  if (isHomeGameLocation(enriched.location)) {
    enriched.locationAddress = '';
  }
  return enriched;
}
function adminPreviewLocationAddress(game) {
  if (!game || isHomeGameLocation(game.location)) return '';
  return game.locationAddress || '';
}
function enrichGamesWithOpponents(games, opponents) {
  return (games || []).map(function(game) {
    return enrichGameWithOpponent(game, opponents);
  });
}
function normalizeCarouselPhoto(photo, index) {
  if (typeof photo === 'string') return { src: photo, alt: 'Team photo', sortOrder: index, _key: String(index) };
  return {
    src: photo && photo.src ? photo.src : '',
    alt: photo && photo.alt ? photo.alt : 'Team photo',
    storagePath: photo && photo.storagePath ? photo.storagePath : '',
    width: photo && photo.width ? photo.width : null,
    height: photo && photo.height ? photo.height : null,
    updatedAt: photo && photo.updatedAt ? photo.updatedAt : null,
    sortOrder: photo && photo.sortOrder != null ? photo.sortOrder : index,
    _key: photo && photo._key != null ? photo._key : String(index)
  };
}
function nextCarouselSortOrder(photos) {
  return photos.reduce(function(max, photo, index) {
    var order = photo && photo.sortOrder != null ? +photo.sortOrder : index;
    return Number.isFinite(order) ? Math.max(max, order) : max;
  }, -1) + 1;
}
function getCarouselPhotos() {
  const fallback = window.defaultCarouselPhotos || [];
  const photos = cachedCarouselPhotos && cachedCarouselPhotos.length ? cachedCarouselPhotos : fallback;
  return photos.map(normalizeCarouselPhoto)
    .filter(photo => photo.src)
    .sort((a, b) => (+a.sortOrder || 0) - (+b.sortOrder || 0));
}

function normalizeCarouselPhotoList(photos) {
  return (photos || []).map(normalizeCarouselPhoto)
    .filter(photo => photo.src)
    .sort((a, b) => (+a.sortOrder || 0) - (+b.sortOrder || 0));
}

function refreshCarouselPhotos(photos) {
  cachedCarouselPhotos = photos.slice();
  if (window.timpanogosCarousel && document.querySelector('.carousel-track') && document.querySelector('.carousel-dots')) {
    try {
      window.timpanogosCarousel.setPhotos(cachedCarouselPhotos, true);
    } catch (err) {
      console.warn('Carousel preview refresh skipped:', err);
    }
  }
}

function announceCarouselPhotosChanged(timestamp) {
  var updatedAt = timestamp || Date.now();
  try {
    localStorage.setItem(carouselRefreshStorageKey, String(updatedAt));
  } catch (err) {}

  if (typeof db === 'undefined' || !db.ref) return Promise.resolve(updatedAt);
  return db.ref('siteMeta/carouselPhotosUpdatedAt').set(updatedAt).catch(function(err) {
    console.warn('Carousel refresh marker update failed:', err);
    return updatedAt;
  });
}

function fbSaveCarouselPhotos(photos) {
  const cleaned = photos.map(cleanFirebaseRecord).filter(photo => photo && photo.src);
  const data = cleaned.length ? cleaned : { __empty: true };
  return fbSet('carouselPhotos', data).then(function() {
    return announceCarouselPhotosChanged().then(function() {
      return cleaned;
    });
  });
}

function fbSaveCarouselPhotoOrder(photos) {
  var orderedPhotos = photos.map(function(photo, index) {
    var key = firebaseChildKey(photo, index);
    var cleaned = cleanFirebaseRecord(photo);
    cleaned.sortOrder = index;
    return Object.assign({ _key: key }, cleaned);
  }).filter(function(photo) {
    return photo && photo.src;
  });

  var updates = {};
  orderedPhotos.forEach(function(photo) {
    updates['carouselPhotos/' + photo._key + '/sortOrder'] = photo.sortOrder;
  });

  if (!Object.keys(updates).length) return Promise.resolve([]);
  return db.ref().update(updates).then(function() {
    return announceCarouselPhotosChanged().then(function() {
      return orderedPhotos;
    });
  });
}

function fbSaveCarouselPhotoChild(childKey, photo) {
  var cleaned = cleanFirebaseRecord(photo);
  return fbSet('carouselPhotos/' + childKey, cleaned).then(function() {
    return announceCarouselPhotosChanged(cleaned.updatedAt).then(function() {
      return Object.assign({ _key: childKey }, cleaned);
    });
  });
}
function fbAddCarouselPhoto(photo) {
  var cleaned = cleanFirebaseRecord(photo);
  return fbPush('carouselPhotos', cleaned).then(function(ref) {
    return announceCarouselPhotosChanged(cleaned.updatedAt).then(function() {
      return Object.assign({ _key: ref.key }, cleaned);
    });
  });
}
function carouselUploadPath(file) {
  const safeName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9._-]/gi, '-').toLowerCase();
  return 'photos/optimized/' + Date.now() + '-' + safeName + '.jpg';
}

const carouselOutputWidth = 800;
const carouselOutputHeight = 533;
const carouselOutputQuality = 0.82;
const carouselSharpenAmount = 0.18;

function formatDate(iso, opts) {
  const [y, m, d] = iso.split('-');
  const date = new Date(y, m - 1, d);
  if (isNaN(date)) return iso;
  return date.toLocaleDateString(undefined, opts || { year:'numeric', month:'short', day:'numeric' });
}

/* ── Sample Data ── */
function spring2026ScheduleGames() {
  return [
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
    { date:'2026-04-03', opponent:'Summit Academy', location:'Away', time:'3:00 PM' },
    { date:'2026-04-03', opponent:'Summit Academy', location:'Home', time:'5:00 PM' },
    { date:'2026-04-06', opponent:'Uintah', location:'Away', time:'1:00 PM' },
    { date:'2026-04-08', opponent:'Uintah', location:'Home', time:'1:00 PM' },
    { date:'2026-04-08', opponent:'Uintah', location:'Home', time:'3:00 PM' },
    { date:'2026-04-14', opponent:'Provo', location:'Away', time:'3:30 PM' },
    { date:'2026-04-15', opponent:'Provo', location:'Home', time:'3:30 PM' },
    { date:'2026-04-17', opponent:'Provo', location:'Away', time:'3:30 PM' },
    { date:'2026-04-21', opponent:'Orem', location:'Away', time:'3:30 PM' },
    { date:'2026-04-22', opponent:'Orem', location:'Home', time:'3:30 PM' },
    { date:'2026-04-24', opponent:'Orem', location:'Away', time:'3:30 PM' },
    { date:'2026-05-07', opponent:'Juan Diego', location:'Home', time:'4:00 PM', playoff:true },
    { date:'2026-05-08', opponent:'Juan Diego', location:'Home', time:'1:00 PM', playoff:true },
    { date:'2026-05-11', opponent:'Bear River', location:'Neutral', locationAddress:'5525 Cougar Ln, Kearns, UT 84118', time:'12:30 PM', playoff:true },
    { date:'2026-05-12', opponent:'Crimson Cliffs', location:'Neutral', locationAddress:'5525 Cougar Ln, Kearns, UT 84118', time:'10:00 AM', playoff:true },
  ];
}

function sampleGames() {
  const s = spring2026ScheduleGames();
  fbSave('games', s);
  return s;
}

function sampleResults() {
  const s = [
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
  fbSave('results', s);
  return s;
}

function summer2025Results() {
  return [
    { date:'2025-06-10', opponent:'Herriman', ourScore:4, theirScore:4 },
    { date:'2025-06-11', opponent:'Layton', ourScore:6, theirScore:6 },
    { date:'2025-06-17', opponent:'Westlake', ourScore:15, theirScore:5 },
    { date:'2025-06-19', opponent:'Westlake', ourScore:11, theirScore:10 },
    { date:'2025-06-23', opponent:'Farmington Phoenix', ourScore:8, theirScore:1 },
    { date:'2025-07-07', opponent:'Davis', ourScore:3, theirScore:5 },
    { date:'2025-07-09', opponent:'Wasatch', ourScore:10, theirScore:7 },
    { date:'2025-08-21', opponent:'Lehi 2', ourScore:6, theirScore:7 },
    { date:'2025-08-26', opponent:'American Fork', ourScore:4, theirScore:2 },
    { date:'2025-08-27', opponent:'Maple Mountain', ourScore:14, theirScore:0 }
  ];
}

function spring2026Results() {
  return [
    { date:'2026-03-05', opponent:'Crimson Cliffs', ourScore:3, theirScore:2 },
    { date:'2026-03-06', opponent:'Juab', ourScore:8, theirScore:6 },
    { date:'2026-03-07', opponent:'Ogden', ourScore:30, theirScore:0 },
    { date:'2026-03-07', opponent:'Murray', ourScore:14, theirScore:2 },
    { date:'2026-03-09', opponent:'American Fork', ourScore:1, theirScore:3 },
    { date:'2026-03-10', opponent:'Viewmont', ourScore:6, theirScore:1 },
    { date:'2026-03-12', opponent:'Fremont', ourScore:4, theirScore:3 },
    { date:'2026-03-17', opponent:'Alta', ourScore:3, theirScore:2 },
    { date:'2026-03-18', opponent:'Bear River', ourScore:12, theirScore:4 },
    { date:'2026-03-19', opponent:'Salem Hills', ourScore:9, theirScore:5 },
    { date:'2026-03-24', opponent:'Mountain View', ourScore:6, theirScore:5 },
    { date:'2026-03-25', opponent:'Mountain View', ourScore:11, theirScore:6 },
    { date:'2026-03-27', opponent:'Mountain View', ourScore:7, theirScore:4 },
    { date:'2026-03-31', opponent:'Summit Academy', ourScore:10, theirScore:0 },
    { date:'2026-04-03', opponent:'Summit Academy', ourScore:20, theirScore:1 },
    { date:'2026-04-03', opponent:'Summit Academy', ourScore:13, theirScore:0 },
    { date:'2026-04-06', opponent:'Uintah', ourScore:9, theirScore:1 },
    { date:'2026-04-08', opponent:'Uintah', ourScore:15, theirScore:3 },
    { date:'2026-04-08', opponent:'Uintah', ourScore:3, theirScore:7 },
    { date:'2026-04-14', opponent:'Provo', ourScore:6, theirScore:2 },
    { date:'2026-04-15', opponent:'Provo', ourScore:2, theirScore:5 },
    { date:'2026-04-17', opponent:'Provo', ourScore:9, theirScore:7 },
    { date:'2026-04-21', opponent:'Orem', ourScore:16, theirScore:4 },
    { date:'2026-04-22', opponent:'Orem', ourScore:3, theirScore:9 },
    { date:'2026-04-24', opponent:'Orem', ourScore:6, theirScore:2 },
    { date:'2026-05-07', opponent:'Juan Diego', ourScore:3, theirScore:2, playoff:true },
    { date:'2026-05-08', opponent:'Juan Diego', ourScore:11, theirScore:9, playoff:true },
    { date:'2026-05-11', opponent:'Bear River', location:'Neutral', locationAddress:'5525 Cougar Ln, Kearns, UT 84118', time:'12:30 PM', ourScore:5, theirScore:9, playoff:true }
  ];
}

function historical2025Results() {
  return [
    { date:'2025-03-07', opponent:'Crimson Cliffs', ourScore:2, theirScore:4 },
    { date:'2025-03-07', opponent:'Westlake', ourScore:18, theirScore:1 },
    { date:'2025-03-08', opponent:'ALA - Gilbert North', ourScore:6, theirScore:1 },
    { date:'2025-03-08', opponent:'Juab', ourScore:7, theirScore:2 },
    { date:'2025-03-12', opponent:'Skyridge', ourScore:2, theirScore:11 },
    { date:'2025-03-15', opponent:'Fremont', ourScore:1, theirScore:0 },
    { date:'2025-03-17', opponent:'Morgan', ourScore:14, theirScore:4 },
    { date:'2025-03-20', opponent:'Mountain Ridge', ourScore:7, theirScore:16 },
    { date:'2025-03-21', opponent:'Viewmont', ourScore:9, theirScore:5 },
    { date:'2025-03-25', opponent:'Payson', ourScore:12, theirScore:0 },
    { date:'2025-03-26', opponent:'Payson', ourScore:14, theirScore:3 },
    { date:'2025-03-28', opponent:'Payson', ourScore:13, theirScore:2 },
    { date:'2025-03-29', opponent:'American Fork', ourScore:2, theirScore:8 },
    { date:'2025-03-31', opponent:'Uintah', ourScore:13, theirScore:11 },
    { date:'2025-04-02', opponent:'Uintah', ourScore:14, theirScore:0 },
    { date:'2025-04-02', opponent:'Uintah', ourScore:6, theirScore:0 },
    { date:'2025-04-08', opponent:'Mountain Crest', ourScore:5, theirScore:6 },
    { date:'2025-04-15', opponent:'Provo', ourScore:15, theirScore:3 },
    { date:'2025-04-16', opponent:'Provo', ourScore:10, theirScore:0 },
    { date:'2025-04-18', opponent:'Provo', ourScore:6, theirScore:8 },
    { date:'2025-04-22', opponent:'Mountain View', ourScore:11, theirScore:1 },
    { date:'2025-04-24', opponent:'Mountain View', ourScore:16, theirScore:3 },
    { date:'2025-04-25', opponent:'Mountain View', ourScore:15, theirScore:5 },
    { date:'2025-04-28', opponent:'West Jordan', ourScore:3, theirScore:5 },
    { date:'2025-04-29', opponent:'West Field', ourScore:13, theirScore:12 },
    { date:'2025-05-08', opponent:'Pine View', ourScore:2, theirScore:0 },
    { date:'2025-05-09', opponent:'Pine View', ourScore:18, theirScore:0 },
    { date:'2025-05-12', opponent:'Park City', ourScore:8, theirScore:5 },
    { date:'2025-05-13', opponent:'Crimson Cliffs', ourScore:5, theirScore:7 },
    { date:'2025-05-14', opponent:'Desert Hills', ourScore:9, theirScore:8 },
    { date:'2025-05-14', opponent:'Crimson Cliffs', ourScore:5, theirScore:6 }
  ];
}

/* ── Result Table Builder (shared) ── */
function buildResultsByMonth(results, container) {
  results.sort((a, b) => new Date(b.date) - new Date(a.date));
  const groups = {};
  results.forEach(r => {
    const [y, m, d] = r.date.split('-');
    const date = new Date(y, m - 1, d);
    const key = `${y}-${m}`;
    if (!groups[key]) {
      groups[key] = {
        month: date.toLocaleDateString(undefined, { month:'long' }),
        year: date.toLocaleDateString(undefined, { year:'numeric' }),
        results: []
      };
    }
    groups[key].results.push(r);
  });
  Object.keys(groups).forEach(key => {
    const group = groups[key];
    const h3 = document.createElement('h3');
    const month = document.createElement('span');
    month.textContent = group.month;
    const year = document.createElement('span');
    year.textContent = group.year;
    year.className = 'result-year';
    h3.appendChild(month);
    h3.appendChild(year);
    container.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'results-table';
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    group.results.forEach(r => {
      const our = +r.ourScore, their = +r.theirScore;
      const win = our > their, loss = our < their;
      const cls = win ? 'win' : (loss ? 'loss' : 'tie');
      const lbl = win ? 'W' : (loss ? 'L' : 'T');
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${formatDate(r.date, { day:'numeric' })}</td>
        <td><div class="${win ? 'winner' : ''}">Timpanogos</div><div class="${loss ? 'winner' : ''}">${r.opponent}</div></td>
        <td><div class="${win ? 'winner' : ''}">${our}</div><div class="${loss ? 'winner' : ''}">${their}</div></td>
        <td><span class="${cls}">${lbl}</span></td>`;
      tbody.appendChild(tr);
    });
    container.appendChild(table);
  });
}

/* ── Game Card Builder (shared) ── */
function buildGameCard(g, result) {
  const card = document.createElement('div');
  card.className = 'game-card';
  const isHome = g.location.toLowerCase() === 'home';
  let overlay = '';
  if (result) {
    const won = result.ourScore > result.theirScore;
    const lost = result.ourScore < result.theirScore;
    const cls = won ? 'overlay-win' : (lost ? 'overlay-loss' : 'overlay-tie');
    const lbl = won ? 'WIN' : (lost ? 'LOSS' : 'TIE');
    overlay = '<div class="game-overlay ' + cls + '">' +
      '<div class="game-overlay-result">' + lbl + '</div>' +
      '<div class="game-overlay-score">' + result.ourScore + ' - ' + result.theirScore + '</div>' +
      '</div>';
  }
  card.innerHTML = `
    <div class="game-date"><div class="date-main">${formatDate(g.date, { weekday:'short', year:'numeric', month:'short', day:'numeric' })}</div></div>
    <div class="game-details">
      <div class="opponent">${g.opponent}</div>
      <div class="game-info">
        <span class="location ${isHome ? 'home' : 'away'}">${isHome ? 'HOME' : 'AWAY'}</span>
        <span class="time">${g.time}</span>
      </div>
    </div>` + overlay;
  if (result) {
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Show score for Timpanogos vs ${g.opponent}`);
    card.addEventListener('click', () => {
      if (window.matchMedia('(max-width: 768px)').matches) {
        const isOpen = card.classList.contains('show-overlay');
        document.querySelectorAll('.game-card.show-overlay').forEach(openCard => {
          if (openCard !== card) openCard.classList.remove('show-overlay');
        });
        card.classList.toggle('show-overlay', !isOpen);
      }
    });
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (window.matchMedia('(max-width: 768px)').matches) {
          const isOpen = card.classList.contains('show-overlay');
          document.querySelectorAll('.game-card.show-overlay').forEach(openCard => {
            if (openCard !== card) openCard.classList.remove('show-overlay');
          });
          card.classList.toggle('show-overlay', !isOpen);
        }
      }
    });
  }
  return card;
}

/* ══════════════════════════════════
   PAGE RENDERERS
   ══════════════════════════════════ */

function renderHome(app) {
  const games = getGames();
  const results = getResults();
  const blanketInventory = 9;
  const blanketPrice = 50;

  app.innerHTML = `
    <section class="quick-info">
      <div class="card"><h3>Next Game</h3><p id="nextGame">Loading...</p></div>
      <div class="card"><h3>Recent Results</h3><div id="recentResults">Loading...</div></div>
      <div class="card"><h3>Contact</h3><p>Jace Hunter<br/>Email: jacejohnny1@icloud.com</p></div>
    </section>
    <section class="swag-section">
      <div class="swag-copy">
        <span class="section-kicker">Team Swag</span>
        <h2>Timpanogos Baseball Blankets</h2>
        <p>Grab a blanket while they last.</p>
        <div class="swag-meta">
          <span>$${blanketPrice} each</span>
          <span>${blanketInventory} available</span>
        </div>
      </div>
      <div class="swag-card">
        <button type="button" class="swag-image-button" id="blanketImageButton" aria-label="View larger blanket photo">
          <img src="../images/timp_blanket.jpg" alt="Timpanogos baseball blanket" loading="lazy" decoding="async" />
        </button>
        <div>
          <h3>Pay by Venmo</h3>
          <p>Send $${blanketPrice} per blanket to @melanie_hunter and include "Baseball blanket" plus your name in the note.</p>
        </div>
        <a class="btn" href="https://venmo.com/u/melanie_hunter" target="_blank" rel="noopener">Pay @melanie_hunter</a>
      </div>
    </section>
    <div class="image-modal" id="blanketImageModal" hidden>
      <button type="button" class="image-modal-backdrop" aria-label="Close blanket photo"></button>
      <div class="image-modal-content" role="dialog" aria-modal="true" aria-label="Timpanogos baseball blanket">
        <button type="button" class="image-modal-close" aria-label="Close blanket photo">x</button>
        <img src="../images/timp_blanket.jpg" alt="Timpanogos baseball blanket" loading="lazy" decoding="async" />
      </div>
    </div>
    <div class="stats-row">
      <section class="scoreboard" id="scoreboard"></section>
      <section class="tracker-section">
        <h2>Spring 2026 Season Tracker</h2>
        <div class="tracker-record" id="trackerRecord"></div>
        <div class="tracker-chart" id="trackerChart"></div>
      </section>
    </div>
    <div class="weather-widget" id="weatherCard" style="display:none"></div>`;

  const blanketImageButton = document.getElementById('blanketImageButton');
  const blanketImageModal = document.getElementById('blanketImageModal');
  const closeBlanketModal = () => {
    if (!blanketImageModal) return;
    blanketImageModal.hidden = true;
    document.body.classList.remove('modal-open');
  };
  const openBlanketModal = () => {
    if (!blanketImageModal) return;
    blanketImageModal.hidden = false;
    document.body.classList.add('modal-open');
  };
  if (blanketImageButton && blanketImageModal) {
    blanketImageButton.addEventListener('click', openBlanketModal);
    blanketImageModal.querySelectorAll('button').forEach(btn => btn.addEventListener('click', closeBlanketModal));
    if (window.blanketModalKeydown) document.removeEventListener('keydown', window.blanketModalKeydown);
    window.blanketModalKeydown = e => {
      if (e.key === 'Escape' && !blanketImageModal.hidden) closeBlanketModal();
    };
    document.addEventListener('keydown', window.blanketModalKeydown);
  }

  // Next game
  games.sort((a, b) => new Date(a.date) - new Date(b.date));
  const next = games.find(g => new Date(g.date) >= new Date());
  const nextEl = document.getElementById('nextGame');
  const nextCard = nextEl.closest('.card');
  if (next) {
    nextEl.textContent = `${formatDate(next.date)} - ${next.opponent} (${next.location}) @ ${next.time}`;
    if (next.playoff) {
      nextCard.classList.add('playoff-card');
      nextCard.querySelector('h3').textContent = '🏆 Next Game - Playoffs';
    }
  } else {
    nextEl.textContent = 'No future games scheduled.';
  }

  // Countdown timer using Tick library
  if (next) {
    const section = document.getElementById('countdownSection');
    section.style.display = '';
    const oppEl = document.getElementById('countdownOpponent');
    oppEl.innerHTML = next.playoff
      ? '\ud83c\udfc6 Playoffs vs ' + next.opponent + '<br>' + formatDate(next.date) + ' @ ' + next.time
      : 'vs ' + next.opponent + ' \u2014 ' + formatDate(next.date) + ' @ ' + next.time;
    if (next.playoff) section.classList.add('playoff-countdown');

    const timeParts = next.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
    let h = timeParts ? +timeParts[1] : 15, m = timeParts ? +timeParts[2] : 30;
    if (timeParts && timeParts[3].toUpperCase() === 'PM' && h !== 12) h += 12;
    if (timeParts && timeParts[3].toUpperCase() === 'AM' && h === 12) h = 0;
    const [gy, gm, gd] = next.date.split('-');
    const gameDate = new Date(gy, gm - 1, gd, h, m);

    if (typeof Tick !== 'undefined' && !document.getElementById('tickClock')._tickInit) {
      document.getElementById('tickClock')._tickInit = true;
      setTimeout(function() {
        var tickEl = document.getElementById('tickClock');
        Tick.DOM.create(tickEl, {
          didInit: function(tick) {
            Tick.count.down(gameDate, {format: ['d','h','m','s']}).onupdate = function(val) {
              tick.value = val;
            };
          }
        });
      }, 0);
    }
  }

  // Recent results - combine all seasons
  const allResults = results.concat(spring2026Results(), summer2025Results(), historical2025Results());
  allResults.sort((a, b) => new Date(b.date) - new Date(a.date));
  const recent = allResults.slice(0, 3);
  if (recent.length) {
    document.getElementById('recentResults').innerHTML = recent.map(r => {
      const our = +r.ourScore, their = +r.theirScore;
      const win = our > their, loss = our < their;
      const cls = win ? 'win' : (loss ? 'loss' : 'tie');
      const lbl = win ? 'W' : (loss ? 'L' : 'T');
      return `<div class="result-row"><span class="${cls} result-outcome">${lbl}</span><div class="result-score">${our} - ${their}</div><div class="result-info"><div>${r.opponent}</div><small class="result-date">${formatDate(r.date)}</small></div></div>`;
    }).join('');
  } else {
    document.getElementById('recentResults').textContent = 'No results yet';
  }

  // Animated Scoreboard - last game
  const allGames = spring2026Results().sort((a,b) => new Date(b.date) - new Date(a.date));
  const lastGame = allGames[0];
  if (lastGame) {
    const won = lastGame.ourScore > lastGame.theirScore;
    const lost = lastGame.ourScore < lastGame.theirScore;
    const outcomeText = won ? 'WIN' : (lost ? 'LOSS' : 'TIE');
    const outcomeClass = won ? 'sb-win' : (lost ? 'sb-loss' : 'sb-tie');
    document.getElementById('scoreboard').innerHTML =
      '<div class="sb-header">' +
        '<span class="sb-label">Last Game</span>' +
        '<span class="sb-date">' + formatDate(lastGame.date) + '</span>' +
      '</div>' +
      '<div class="sb-body">' +
        '<div class="sb-team sb-home">' +
          '<div class="sb-name">Timpanogos</div>' +
          '<div class="sb-score sb-score-animate" id="sbOur">0</div>' +
        '</div>' +
        '<div class="sb-vs">VS</div>' +
        '<div class="sb-team sb-away">' +
          '<div class="sb-name">' + lastGame.opponent + '</div>' +
          '<div class="sb-score sb-score-animate" id="sbTheir">0</div>' +
        '</div>' +
      '</div>' +
      '<div class="sb-outcome ' + outcomeClass + '">' + outcomeText + '</div>';

    // Animate scores counting up
    function animateScore(el, target) {
      let current = 0;
      const step = Math.max(1, Math.ceil(target / 20));
      const interval = setInterval(function() {
        current += step;
        if (current >= target) { current = target; clearInterval(interval); }
        el.textContent = current;
      }, 50);
    }
    setTimeout(function() {
      animateScore(document.getElementById('sbOur'), lastGame.ourScore);
      animateScore(document.getElementById('sbTheir'), lastGame.theirScore);
    }, 300);
  }

  // Win/Loss Tracker
  const seasonGames = spring2026Results().sort((a,b) => new Date(a.date) - new Date(b.date));
  let wins = 0, losses = 0;
  const points = seasonGames.map((g, i) => {
    if (g.ourScore > g.theirScore) wins++; else losses++;
    return { game: i + 1, wins, losses, opponent: g.opponent, w: g.ourScore > g.theirScore };
  });

  // Record summary
  document.getElementById('trackerRecord').innerHTML =
    '<span class="tracker-wins">' + wins + ' Wins</span>' +
    '<span class="tracker-losses">' + losses + ' Losses</span>' +
    '<span class="tracker-pct">' + (wins / (wins + losses) * 100).toFixed(0) + '% Win Rate</span>';

  // SVG Chart
  const chart = document.getElementById('trackerChart');
  const svgW = 700, svgH = 200, pad = 40;
  const maxVal = Math.max(wins, losses, 5);
  const stepX = (svgW - pad * 2) / (points.length - 1 || 1);
  const scaleY = (svgH - pad * 2) / maxVal;

  let winPath = 'M';
  let lossPath = 'M';
  let dots = '';
  points.forEach((p, i) => {
    const x = pad + i * stepX;
    const wy = svgH - pad - p.wins * scaleY;
    const ly = svgH - pad - p.losses * scaleY;
    winPath += (i === 0 ? '' : ' L') + x + ' ' + wy;
    lossPath += (i === 0 ? '' : ' L') + x + ' ' + ly;
    dots += '<circle cx="' + x + '" cy="' + wy + '" r="4" fill="#16a34a" class="tracker-dot"><title>Game ' + p.game + ': ' + p.opponent + ' (W:' + p.wins + ')</title></circle>';
    dots += '<circle cx="' + x + '" cy="' + ly + '" r="4" fill="#e53e3e" class="tracker-dot"><title>Game ' + p.game + ': ' + p.opponent + ' (L:' + p.losses + ')</title></circle>';
  });

  // Grid lines
  let grid = '';
  for (let i = 0; i <= maxVal; i += Math.ceil(maxVal / 5)) {
    const y = svgH - pad - i * scaleY;
    grid += '<line x1="' + pad + '" y1="' + y + '" x2="' + (svgW - pad) + '" y2="' + y + '" stroke="rgba(0,0,0,.08)" />';
    grid += '<text x="' + (pad - 8) + '" y="' + (y + 4) + '" text-anchor="end" fill="#999" font-size="11">' + i + '</text>';
  }

  chart.innerHTML = '<svg viewBox="0 0 ' + svgW + ' ' + svgH + '" class="tracker-svg">' +
    grid +
    '<path d="' + winPath + '" fill="none" stroke="#16a34a" stroke-width="3" class="tracker-line tracker-line-win" />' +
    '<path d="' + lossPath + '" fill="none" stroke="#e53e3e" stroke-width="3" class="tracker-line tracker-line-loss" />' +
    dots +
    '<text x="' + (svgW - pad) + '" y="' + (svgH - pad - wins * scaleY - 10) + '" fill="#16a34a" font-size="12" font-weight="700" text-anchor="end">Wins</text>' +
    '<text x="' + (svgW - pad) + '" y="' + (svgH - pad - losses * scaleY + 18) + '" fill="#e53e3e" font-size="12" font-weight="700" text-anchor="end">Losses</text>' +
    '</svg>';
}

/* ── Schedule ── */
const regionTeams = ['Mountain View','Summit Academy','Uintah','Provo','Orem'];

function gameDateTimeValue(game) {
  const dateValue = game && game.date ? game.date : '';
  const timeValue = game && game.time ? game.time : '';
  const parsed = new Date((dateValue + ' ' + timeValue).trim()).getTime();
  return Number.isFinite(parsed) ? parsed : new Date(dateValue).getTime();
}

function newestGameFirst(a, b) {
  return gameDateTimeValue(b) - gameDateTimeValue(a);
}

function oldestGameFirst(a, b) {
  return gameDateTimeValue(a) - gameDateTimeValue(b);
}

function renderSchedule(app) {
  app.innerHTML = `
    <section>
      <h2>2026 Season Schedule</h2>
      <div id="playoffSection" style="display:none">
        <h3 class="schedule-heading playoff">State Playoff Games</h3>
        <div id="playoffGrid" class="game-grid"></div>
      </div>
      <h3 class="schedule-heading region">Region Games</h3>
      <div id="regionGrid" class="game-grid"></div>
      <h3 class="schedule-heading">Non-Region Games</h3>
      <div id="nonRegionGrid" class="game-grid"></div>
    </section>`;

  const games = getGames().slice();
  const results2026 = spring2026Results();
  const usedResults = [];
  const playoffGames = [];
  const regionGames = [];
  const nonRegionGames = [];

  games.forEach(g => {
    if (g.playoff) playoffGames.push(g);
    else if (regionTeams.includes(g.opponent)) regionGames.push(g);
    else nonRegionGames.push(g);
  });

  [
    { id: 'playoffGrid', games: playoffGames.sort(oldestGameFirst) },
    { id: 'regionGrid', games: regionGames.sort(newestGameFirst) },
    { id: 'nonRegionGrid', games: nonRegionGames.sort(newestGameFirst) }
  ].forEach(group => {
    const grid = document.getElementById(group.id);
    group.games.forEach(g => {
      const result = results2026.find((r, i) => r.date === g.date && r.opponent === g.opponent && !usedResults.includes(i));
      if (result) usedResults.push(results2026.indexOf(result));
      grid.appendChild(buildGameCard(g, result));
    });
  });
  if (playoffGames.length) document.getElementById('playoffSection').style.display = '';
}

/* ── Results ── */
function renderResults(app) {
  app.innerHTML = `
    <section>
      <h2>Spring 2026 Results</h2>
      <div id="spring2026Results"></div>
    </section>
    <section>
      <h2>Fall 2025 Results</h2>
      <div id="fallResults"></div>
    </section>
    <section>
      <h2>Summer 2025 Results</h2>
      <div id="summerResults"></div>
    </section>
    <section>
      <h2>Spring 2025 Results</h2>
      <div id="springResults"></div>
    </section>`;

  buildResultsByMonth(spring2026Results(), document.getElementById('spring2026Results'));
  const results = getResults();
  buildResultsByMonth(results, document.getElementById('fallResults'));
  buildResultsByMonth(summer2025Results(), document.getElementById('summerResults'));
  buildResultsByMonth(historical2025Results(), document.getElementById('springResults'));

  // Set sticky offset below header
  const headerH = document.querySelector('.site-header').offsetHeight;
  document.documentElement.style.setProperty('--header-height', headerH + 'px');

  if (window.resultStickyHeaderHandler) {
    window.removeEventListener('scroll', window.resultStickyHeaderHandler);
    window.removeEventListener('resize', window.resultStickyHeaderHandler);
  }

  window.resultStickyHeaderHandler = function() {
    const stickyTop = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || headerH;
    document.querySelectorAll('#spring2026Results h3,#fallResults h3,#summerResults h3,#springResults h3').forEach(h3 => {
      const rect = h3.getBoundingClientRect();
      h3.classList.toggle('stuck', rect.top <= stickyTop + 1 && rect.bottom > stickyTop);
    });
  };
  window.addEventListener('scroll', window.resultStickyHeaderHandler, { passive: true });
  window.addEventListener('resize', window.resultStickyHeaderHandler);
  window.resultStickyHeaderHandler();
}

/* ── Admin ── */
let editingGameIdx = -1, editingResultIdx = -1, editingCarouselPhotoIdx = -1;

function renderAdminLogin(app) {
  app.className = 'container admin-login-page';
  if (!authReady) {
    app.innerHTML = `
      <section class="admin-card auth-card">
        <h2>Admin Login</h2>
        <p class="muted">Checking admin session...</p>
      </section>`;
    return;
  }

  app.innerHTML = `
    <section class="admin-card auth-card">
      <h2>Admin Login</h2>
      <form id="adminLoginForm">
        <label>Email:<input type="email" id="adminEmail" autocomplete="username" required /></label>
        <label>Password:<input type="password" id="adminPassword" autocomplete="current-password" required /></label>
        <div class="form-row">
          <button type="submit" class="btn">Sign In</button>
        </div>
        <p class="auth-error" id="authError"></p>
      </form>
    </section>`;

  document.getElementById('adminLoginForm').addEventListener('submit', e => {
    e.preventDefault();
    const errorEl = document.getElementById('authError');
    const submitBtn = e.currentTarget.querySelector('button[type="submit"]');
    errorEl.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing In...';
    fbSignIn(
      document.getElementById('adminEmail').value,
      document.getElementById('adminPassword').value
    ).then(() => {
      navigate();
    }).catch(err => {
      errorEl.textContent = err.message || 'Unable to sign in.';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    });
  });
}

function renderAdmin(app) {
  if (!authReady || !currentAdminUser) {
    renderAdminLogin(app);
    return;
  }

  app.className = 'container admin-page';
  app.innerHTML = `
    <aside class="admin-card admin-sidebar">
      <button type="button" class="admin-nav-link active" data-admin-panel="dashboard">Dashboard</button>
      <button type="button" class="admin-nav-link admin-nav-link-action" id="adminAddGameNavBtn">Add game</button>
      <button type="button" class="admin-nav-link" data-admin-panel="opponents">Opponents</button>
      <button type="button" class="admin-nav-link" data-admin-panel="carousel">Carousel photos</button>
      <button type="button" class="admin-nav-link" data-admin-panel="news">Utah News</button>
    </aside>
    <div class="admin-content">
      <section class="admin-card admin-session">
        <div>
          <h2>Admin</h2>
          <p class="muted">Signed in as ${currentAdminUser.email}</p>
        </div>
        <button type="button" class="btn alt" id="adminSignOut">Sign Out</button>
      </section>
      <div class="admin-panel active" data-admin-panel-view="dashboard">
        <section class="admin-card">
          <h2>Saved Games & Results</h2>
          <p class="muted">Use <strong>Add game</strong> in the sidebar or <strong>Edit</strong> on a row to open the form.</p>
          <ul id="gamesPreview" class="list"></ul>
        </section>
        <section class="admin-card admin-reseed-section" hidden>
          <h2>Rebuild schedule</h2>
          <p class="muted">Replace every game and result in Firebase with the backup in <code>schedule-seed-data.js</code>. Use this for a clean rebuild.</p>
          <div class="form-row">
            <button type="button" class="btn alt" id="adminReseedScheduleBtn">Rebuild games &amp; results</button>
          </div>
          <p class="auth-error" id="adminReseedError"></p>
          <p class="save-success" id="adminReseedSuccess"></p>
        </section>
      </div>
      <div class="admin-panel" data-admin-panel-view="opponents">
        <section class="admin-card" id="opponentAdminCard">
          <h2>Opponents</h2>
          <form id="opponentForm">
            <label>School name:<input type="text" id="opponentSchoolName" required placeholder="Mountain View" /></label>
            <label>Mascot:<input type="text" id="opponentMascot" placeholder="Bruins" /></label>
            <label>Address:<input type="text" id="opponentAddress" placeholder="Full address for calendar sync" /></label>
            <label>Upload logo:<input type="file" id="opponentLogoFile" accept="image/*" /></label>
            <div class="form-row">
              <button type="submit" class="btn">Add Opponent</button>
            </div>
            <p class="auth-error" id="opponentSaveError"></p>
            <p class="save-success" id="opponentSaveSuccess"></p>
          </form>
        </section>
        <section class="admin-card">
          <h2>Saved Opponents</h2>
          <ul id="opponentsPreview" class="list opponent-list"></ul>
        </section>
        <section class="admin-card" id="maxprepsOpponentsCard">
          <h2>Import from MaxPreps</h2>
          <p class="muted">Loads school name, mascot, address, and a 256px PNG mascot logo from varsity schedules scraped into <code>public/data/opponents-maxpreps.json</code>. Refresh that file with <code>npm run fetch-opponents</code> (included in <code>build:pages</code>).</p>
          <div class="form-row">
            <button type="button" class="btn" id="maxprepsOpponentsLoadBtn">Load MaxPreps list</button>
            <button type="button" class="btn alt" id="maxprepsOpponentsImportBtn" hidden disabled>Import selected</button>
          </div>
          <ul id="maxprepsOpponentsImportList" class="list opponent-import-list" hidden></ul>
          <p class="auth-error" id="maxprepsOpponentsError"></p>
          <p class="save-success" id="maxprepsOpponentsSuccess"></p>
        </section>
      </div>
      <div class="admin-panel" data-admin-panel-view="carousel">
        <section class="admin-card" id="carouselAdminCard">
          <h2>Carousel Photos</h2>
          <form id="carouselPhotoForm">
            <label>Upload image:<input type="file" id="carouselPhotoFile" accept="image/*" /></label>
            <p class="muted crop-note" id="carouselCropNote">Choose an image file to crop and optimize it before upload.</p>
            <div class="crop-editor" id="carouselCropEditor" hidden>
              <div class="crop-preview">
                <img id="carouselCropImage" alt="Carousel crop preview" />
              </div>
              <div class="crop-controls">
                <label>Zoom:<input type="range" id="carouselCropZoom" min="1" max="5" step="0.05" value="1" /></label>
                <p class="muted crop-note">Drag the image in the crop frame to position it.</p>
              </div>
            </div>
            <label>Alt text:<input type="text" id="carouselPhotoAlt" placeholder="Team photo" /></label>
            <div class="form-row">
              <button type="submit" class="btn">Add Photo</button>
            </div>
            <p class="auth-error" id="carouselPhotoSaveError"></p>
            <p class="save-success" id="carouselPhotoSaveSuccess"></p>
          </form>
        </section>
        <section class="admin-card">
          <h2>Current Carousel Photos</h2>
          <p class="auth-error" id="carouselPhotoOrderError"></p>
          <ul id="carouselPhotosPreview" class="list photo-list"></ul>
        </section>
      </div>
      <div class="admin-panel" data-admin-panel-view="news">
        <section class="admin-card" id="newsAdminCard">
          <h2>Utah News</h2>
          <p class="muted">Refresh coverage from Herald Extra, KSL, and other Utah feeds. Saved articles appear on the public <a href="news/">News page</a> immediately.</p>
          <dl class="admin-news-stats">
            <div><dt>Last updated</dt><dd id="adminNewsLastUpdated">Never</dd></div>
            <div><dt>Articles saved</dt><dd id="adminNewsCount">0</dd></div>
          </dl>
          <div class="form-row">
            <button type="button" class="btn" id="adminNewsRefreshBtn">Update news articles</button>
          </div>
          <p class="save-success" id="adminNewsStatus"></p>
          <p class="auth-error" id="adminNewsError"></p>
          <p class="muted admin-news-note">Run this whenever you want fresh stories. For deploy backups, <code>npm run fetch-news</code> still updates <code>public/data/news.json</code>.</p>
        </section>
        <section class="admin-card">
          <h2>Latest headlines</h2>
          <ul id="adminNewsPreview" class="list admin-news-preview"></ul>
        </section>
      </div>
    </div>
    <div class="admin-opponent-modal admin-game-form-modal" id="gameFormModal" hidden>
      <button type="button" class="admin-opponent-modal-backdrop" id="gameFormModalBackdrop" aria-label="Close game form"></button>
      <div class="admin-opponent-modal-panel admin-game-form-modal-panel" role="dialog" aria-modal="true" aria-labelledby="gameFormModalTitle">
        <header class="admin-opponent-modal-header">
          <h3 id="gameFormModalTitle">Add Game / Result</h3>
          <button type="button" class="admin-opponent-modal-close" id="gameFormModalClose" aria-label="Close">×</button>
        </header>
        <div class="admin-game-form-modal-body">
          <form id="gameForm">
            <label>Schedule:<select id="gameTeamLevel">${scheduleTeamLevels.map(level => `<option value="${level.value}">${level.label}</option>`).join('')}</select></label>
            <label class="admin-date-field">Date (MM-DD-YYYY):<input type="date" id="gameDate" required /><span class="admin-season-hint muted" id="gameSeasonHint" aria-live="polite"></span></label>
            <div class="admin-opponent-picker-field">
              <span class="admin-field-label">Opponent</span>
              <input type="hidden" id="gameOpponentId" value="" />
              <button type="button" class="admin-opponent-picker-btn" id="gameOpponentPickerBtn" aria-haspopup="dialog" aria-controls="gameOpponentModal">
                <span id="gameOpponentPickerLabel">Choose or add opponent</span>
              </button>
            </div>
            <label>Location:<input type="text" id="gameLocation" required placeholder="Home/Away" /></label>
            <label>Location Address:<input type="text" id="gameLocationAddress" placeholder="Auto-filled from opponent when available" /></label>
            <label>Time:<input type="text" id="gameTime" required placeholder="4:00 PM" /></label>
            <label>Our Score:<input id="gameOurScore" type="number" placeholder="Optional" /></label>
            <label>Their Score:<input id="gameTheirScore" type="number" placeholder="Optional" /></label>
            <label class="checkbox-label"><input type="checkbox" id="gamePlayoff" /> Playoff Game</label>
            <div class="form-row">
              <button type="submit" class="btn">Add Game</button>
            </div>
            <p class="auth-error" id="gameSaveError"></p>
          </form>
        </div>
      </div>
    </div>
    <div class="admin-opponent-modal" id="gameOpponentModal" hidden>
      <button type="button" class="admin-opponent-modal-backdrop" aria-label="Close opponent picker"></button>
      <div class="admin-opponent-modal-panel" role="dialog" aria-modal="true" aria-labelledby="gameOpponentModalTitle">
        <header class="admin-opponent-modal-header">
          <h3 id="gameOpponentModalTitle">Choose opponent</h3>
          <button type="button" class="admin-opponent-modal-close" aria-label="Close">×</button>
        </header>
        <div class="admin-opponent-modal-search">
          <input type="search" id="gameOpponentModalSearch" placeholder="Search schools or mascots…" autocomplete="off" />
        </div>
        <ul id="gameOpponentModalList" class="admin-opponent-picker-list"></ul>
        <footer class="admin-opponent-modal-footer">
          <div id="gameOpponentQuickAddPanel" class="admin-opponent-quick-add-panel" hidden>
            <form id="gameOpponentQuickAddForm" class="admin-opponent-quick-add">
              <label>School name<input type="text" id="gameOpponentQuickName" required placeholder="Mountain View" /></label>
              <label>Mascot<input type="text" id="gameOpponentQuickMascot" placeholder="Bruins" /></label>
              <label>Address<input type="text" id="gameOpponentQuickAddress" placeholder="Full address for calendar sync" /></label>
              <p class="auth-error" id="gameOpponentQuickError"></p>
              <button type="submit" class="btn small">Save &amp; select</button>
            </form>
          </div>
          <div class="admin-opponent-modal-footer-actions">
            <button type="button" class="btn alt" id="gameOpponentModalClear">Clear selection</button>
            <button type="button" class="btn" id="gameOpponentModalAddToggle" aria-expanded="false" aria-controls="gameOpponentQuickAddPanel">+ Add new school</button>
          </div>
        </footer>
      </div>
    </div>`;

  document.getElementById('adminSignOut').addEventListener('click', () => {
    fbSignOut().then(() => navigate());
  });

  const adminReseedBtn = document.getElementById('adminReseedScheduleBtn');
  if (adminReseedBtn) {
    adminReseedBtn.addEventListener('click', () => {
      const btn = adminReseedBtn;
      const errorEl = document.getElementById('adminReseedError');
      const successEl = document.getElementById('adminReseedSuccess');
      errorEl.textContent = '';
      successEl.textContent = '';
      if (!window.confirm('Replace all games and results in Firebase with the backup? This cannot be undone.')) return;
      if (typeof reseedScheduleDatabase !== 'function') {
        errorEl.textContent = 'Reseed is not available. Load schedule-seed-data.js before firebase-config.js.';
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Rebuilding…';
      reseedScheduleDatabase().then(() => {
        return Promise.all([fbGet('games'), fbGet('results')]);
      }).then(vals => {
        games = fbToArray(vals[0]);
        results = fbToArray(vals[1]);
        cachedGames = games.slice();
        cachedResults = results.slice();
        syncAdminResults();
        renderGamesPreview();
        successEl.textContent = 'Schedule rebuilt from backup.';
      }).catch(err => {
        errorEl.textContent = err && err.message ? err.message : 'Rebuild failed.';
      }).finally(() => {
        btn.disabled = false;
        btn.textContent = 'Rebuild games & results';
      });
    });
  }

  function showAdminPanel(panelName) {
    document.querySelectorAll('.admin-nav-link').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.adminPanel === panelName);
    });
    document.querySelectorAll('.admin-panel').forEach(panel => {
      panel.classList.toggle('active', panel.dataset.adminPanelView === panelName);
    });
  }

  function resetGameFormForAdd() {
    editingGameIdx = -1;
    editingResultIdx = -1;
    const form = document.getElementById('gameForm');
    if (form) form.reset();
    updateGameSeasonHint();
    updateGameOpponentPickerDisplay();
    const submitBtn = form && form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Add Game';
    const titleEl = document.getElementById('gameFormModalTitle');
    if (titleEl) titleEl.textContent = 'Add Game / Result';
    const errorEl = document.getElementById('gameSaveError');
    if (errorEl) errorEl.textContent = '';
  }

  function fillGameFormFromRecord(g, result, record) {
    document.getElementById('gameTeamLevel').value = getScheduleTeamLevel(g.teamLevel);
    document.getElementById('gameDate').value = g.date;
    updateGameSeasonHint();
    const matchedOpponent = matchOpponentForGame(g);
    setGameOpponentSelection(matchedOpponent ? matchedOpponent._key : (g.opponentId || ''));
    document.getElementById('gameLocation').value = g.location || '';
    document.getElementById('gameLocationAddress').value = g.locationAddress || '';
    document.getElementById('gameTime').value = g.time || '';
    document.getElementById('gamePlayoff').checked = !!g.playoff;
    document.getElementById('gameOurScore').value = result ? result.ourScore : '';
    document.getElementById('gameTheirScore').value = result ? result.theirScore : '';
    editingGameIdx = record.gameIndex;
    editingResultIdx = record.resultIndex;
    if (editingGameIdx < 0 && record.adminResultIndex >= 0) {
      editingResultIdx = savedResultIndexFromAdminIndex(record.adminResultIndex);
    }
    const submitBtn = document.querySelector('#gameForm button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Update';
    const titleEl = document.getElementById('gameFormModalTitle');
    if (titleEl) titleEl.textContent = 'Edit Game / Result';
    const errorEl = document.getElementById('gameSaveError');
    if (errorEl) errorEl.textContent = '';
  }

  function gameFormModalKeydown(event) {
    if (event.key === 'Escape') {
      const opponentModal = document.getElementById('gameOpponentModal');
      if (opponentModal && !opponentModal.hidden) return;
      closeGameFormModal();
    }
  }

  function openGameFormModal() {
    const modal = document.getElementById('gameFormModal');
    if (!modal) return;
    modal.hidden = false;
    document.body.classList.add('admin-modal-open');
    document.addEventListener('keydown', gameFormModalKeydown);
    const dateInput = document.getElementById('gameDate');
    if (dateInput) setTimeout(function() { dateInput.focus(); }, 0);
  }

  function closeGameFormModal() {
    const modal = document.getElementById('gameFormModal');
    if (!modal) return;
    modal.hidden = true;
    if (!document.getElementById('gameOpponentModal') || document.getElementById('gameOpponentModal').hidden) {
      document.body.classList.remove('admin-modal-open');
    }
    document.removeEventListener('keydown', gameFormModalKeydown);
  }

  function wireGameFormModal() {
    const modal = document.getElementById('gameFormModal');
    if (!modal) return;
    const backdrop = document.getElementById('gameFormModalBackdrop');
    const closeBtn = document.getElementById('gameFormModalClose');
    if (backdrop) backdrop.addEventListener('click', closeGameFormModal);
    if (closeBtn) closeBtn.addEventListener('click', closeGameFormModal);
  }

  document.querySelectorAll('.admin-nav-link[data-admin-panel]').forEach(btn => {
    btn.addEventListener('click', () => {
      const panelName = btn.dataset.adminPanel;
      showAdminPanel(panelName);
      if (panelName === 'news' && window.AdminNews) {
        window.AdminNews.loadStatus();
      }
    });
  });

  const adminAddGameNavBtn = document.getElementById('adminAddGameNavBtn');
  if (adminAddGameNavBtn) {
    adminAddGameNavBtn.addEventListener('click', () => {
      showAdminPanel('dashboard');
      resetGameFormForAdd();
      openGameFormModal();
    });
  }

  wireGameFormModal();

  let games = getGames().slice();
  let results = getResults().slice();
  let adminResults = [];
  let carouselPhotos = getCarouselPhotos();
  let opponents = normalizeOpponentList(getOpponents());
  let editingOpponentIdx = -1;
  let maxprepsImportCandidates = [];

  function syncAdminResults() {
    adminResults = results.slice();
  }

  syncAdminResults();

  function buildResultSummary(r) {
    const span = document.createElement('span');
    const our = +r.ourScore, their = +r.theirScore;
    const win = our > their, loss = our < their;
    const outcome = document.createElement('span');
    outcome.textContent = win ? 'W' : (loss ? 'L' : 'T');
    outcome.className = win ? 'win' : (loss ? 'loss' : 'tie');
    if (win) span.innerHTML = `<strong>Timpanogos</strong>, ${our} ${r.opponent}, ${their} `;
    else if (loss) span.innerHTML = `Timpanogos, ${our} <strong>${r.opponent}</strong>, ${their} `;
    else span.innerHTML = `Timpanogos, ${our} ${r.opponent}, ${their} `;
    span.appendChild(outcome);
    return span;
  }

  function findResultIndexForGame(game) {
    return results.findIndex(result => resultsSameContest(result, game));
  }

  function findGameIndexForResult(result) {
    return games.findIndex(game => resultsSameContest(result, game));
  }

  function savedResultIndexFromAdminIndex(adminResultIndex) {
    if (adminResultIndex < 0 || !adminResults[adminResultIndex]) return -1;
    const result = adminResults[adminResultIndex];
    return results.findIndex(saved => {
      if (result._key != null && saved._key === result._key) return true;
      return resultsSameContest(saved, result);
    });
  }

  function adminGameDateTimeValue(game) {
    if (!game || !game.date) return 0;
    const dateParts = String(game.date).split('-').map(Number);
    if (dateParts.length < 3 || dateParts.some(part => !Number.isFinite(part))) return 0;

    let hours = 23;
    let minutes = 59;
    const timeMatch = String(game.time || '').trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
    if (timeMatch) {
      hours = Number(timeMatch[1]);
      minutes = Number(timeMatch[2] || 0);
      const meridiem = (timeMatch[3] || '').toUpperCase();
      if (meridiem === 'PM' && hours < 12) hours += 12;
      if (meridiem === 'AM' && hours === 12) hours = 0;
    }

    return new Date(dateParts[0], dateParts[1] - 1, dateParts[2], hours, minutes).getTime();
  }

  function buildCombinedGameResults() {
    const usedResultIndexes = [];
    const combinedGames = games.map(function(game, index) {
      return Object.assign({ _adminGameIndex: index }, enrichGameWithOpponent(game, opponents));
    });

    const combined = combinedGames.map((game) => {
      const gameIndex = game._adminGameIndex;
      const resultIndex = adminResults.findIndex((result, index) =>
        usedResultIndexes.indexOf(index) === -1 &&
        resultsSameContest(result, game)
      );
      const result = resultIndex >= 0 ? adminResults[resultIndex] : null;
      if (resultIndex >= 0) usedResultIndexes.push(resultIndex);
      return { game, gameIndex, result, resultIndex: savedResultIndexFromAdminIndex(resultIndex), adminResultIndex: resultIndex };
    });

    adminResults.forEach((result, resultIndex) => {
      if (usedResultIndexes.indexOf(resultIndex) !== -1) return;
      combined.push({
        game: {
          date: result.date,
          opponent: result.opponent,
          teamLevel: getScheduleTeamLevel(result.teamLevel),
          season: getBaseballSeason(result.season, result.date),
          location: result.location || '',
          locationAddress: isHomeGameLocation(result.location) ? '' : (result.locationAddress || ''),
          time: result.time || '',
          playoff: !!result.playoff
        },
        gameIndex: findGameIndexForResult(result),
        result,
        resultIndex: savedResultIndexFromAdminIndex(resultIndex),
        adminResultIndex: resultIndex
      });
    });

    return combined.sort((a, b) => {
      return adminGameDateTimeValue(a.game) - adminGameDateTimeValue(b.game);
    });
  }

  function getGameScoreResult(game) {
    const ourScore = document.getElementById('gameOurScore').value;
    const theirScore = document.getElementById('gameTheirScore').value;
    if (ourScore === '' && theirScore === '') return null;
    if (ourScore === '' || theirScore === '') {
      throw new Error('Enter both scores, or leave both score fields blank.');
    }
    return {
      date: game.date,
      opponent: game.opponent,
      teamLevel: getScheduleTeamLevel(game.teamLevel),
      season: getBaseballSeason(game.season, game.date),
      opponentId: game.opponentId || '',
      location: game.location,
      locationAddress: game.locationAddress || '',
      time: game.time,
      playoff: !!game.playoff,
      ourScore: +ourScore,
      theirScore: +theirScore
    };
  }

  function saveResultForGame(matchGame, result, preferredResultIndex) {
    if (!result) return Promise.resolve(null);

    const resultIndex = preferredResultIndex >= 0 ? preferredResultIndex : findResultIndexForGame(matchGame);
    if (resultIndex >= 0) {
      const resultKey = firebaseChildKey(results[resultIndex], resultIndex);
      results[resultIndex] = result;
      return fbSaveChild('results', resultKey, result).then(savedResult => {
        results[resultIndex] = savedResult;
        cachedResults = results.slice();
        syncAdminResults();
        return savedResult;
      });
    }

    results.push(result);
    return fbAddChild('results', result).then(savedResult => {
      results = results.filter(saved => saved !== result).concat(savedResult);
      cachedResults = results.slice();
      syncAdminResults();
      return savedResult;
    });
  }

  function deleteResultForGame(matchGame, preferredResultIndex) {
    const resultIndex = preferredResultIndex >= 0 ? preferredResultIndex : findResultIndexForGame(matchGame);
    if (resultIndex < 0) return Promise.resolve();
    const resultKey = firebaseChildKey(results[resultIndex], resultIndex);
    results.splice(resultIndex, 1);
    return fbDeleteChild('results', resultKey).then(() => {
      cachedResults = results.slice();
      syncAdminResults();
    });
  }

  function formatAdminGameLine(game, result) {
    const details = [];
    if (game.location) details.push(game.location);
    const previewAddress = adminPreviewLocationAddress(game);
    if (previewAddress) details.push(previewAddress);
    if (game.time) details.push(game.time);
    const detailText = details.length ? ' (' + details.join(' | ') + ')' : '';
    const score = result ? ` | Timpanogos ${result.ourScore}, ${game.opponent} ${result.theirScore}` : '';
    return `${getScheduleTeamLabel(game.teamLevel)} | ${getBaseballSeasonLabel(game.season, game.date)} | ${formatDate(game.date, { year:'numeric', month:'long', day:'numeric' })} - ${game.opponent}${detailText}${score}`;
  }

  function renderGamesPreview() {
    const ul = document.getElementById('gamesPreview');
    ul.innerHTML = '';
    const groupedRecords = new Map();
    const groupedOrder = [];

    buildCombinedGameResults().forEach(record => {
      const g = record.game;
      const year = (String(g.date || '').split('-').map(Number)[0]) || '';
      const seasonLabel = getBaseballSeasonLabel(g.season, g.date);
      const teamLabel = getScheduleTeamLabel(g.teamLevel);
      const groupKey = `${year}|${seasonLabel}|${teamLabel}`;
      if (!groupedRecords.has(groupKey)) {
        groupedRecords.set(groupKey, {
          label: `${seasonLabel} • ${teamLabel}`,
          records: [],
          sortYear: Number(year) || 0,
          sortSeason: getBaseballSeason(g.season, g.date),
          sortTeam: getScheduleTeamLevel(g.teamLevel)
        });
        groupedOrder.push(groupKey);
      }
      groupedRecords.get(groupKey).records.push(record);
    });

    groupedOrder.sort(function(keyA, keyB) {
      const groupA = groupedRecords.get(keyA);
      const groupB = groupedRecords.get(keyB);
      if (groupA.sortYear !== groupB.sortYear) return groupB.sortYear - groupA.sortYear;
      const seasonOrderA = (baseballSeasons.find(function(season) { return season.value === groupA.sortSeason; }) || {}).order || 0;
      const seasonOrderB = (baseballSeasons.find(function(season) { return season.value === groupB.sortSeason; }) || {}).order || 0;
      if (seasonOrderA !== seasonOrderB) return seasonOrderB - seasonOrderA;
      return getScheduleTeamLabel(groupA.sortTeam).localeCompare(getScheduleTeamLabel(groupB.sortTeam));
    });

    groupedOrder.forEach(groupKey => {
      const group = groupedRecords.get(groupKey);
      group.records.sort(function(a, b) {
        return adminGameDateTimeValue(a.game) - adminGameDateTimeValue(b.game);
      });
      const heading = document.createElement('li');
      heading.className = 'game-preview-group-heading';
      heading.textContent = group.label;
      ul.appendChild(heading);

      group.records.forEach(record => {
        const g = record.game;
        const result = record.result;
        const details = [];
        details.push(getScheduleTeamLabel(g.teamLevel));
        details.push(getBaseballSeasonLabel(g.season, g.date));
        if (g.playoff) details.push('State Playoff');
        if (g.location) details.push(g.location);
        const previewAddress = adminPreviewLocationAddress(g);
        if (previewAddress) details.push(previewAddress);
        if (g.time) details.push(g.time);
        const li = document.createElement('li');
        li.className = 'game-preview-item';
        const span = document.createElement('span');
        span.className = 'game-preview-details';
        const dateEl = document.createElement('span');
        dateEl.className = 'game-preview-date';
        dateEl.textContent = formatDate(g.date, { year:'numeric', month:'long', day:'numeric' });
        const opponentEl = document.createElement('span');
        opponentEl.className = 'game-preview-opponent';
        opponentEl.textContent = g.opponent;
        span.appendChild(dateEl);
        span.appendChild(opponentEl);
        if (g.opponentMascot) {
          const mascotEl = document.createElement('small');
          mascotEl.textContent = g.opponentMascot;
          span.appendChild(mascotEl);
        }
        if (details.length) {
          const metaEl = document.createElement('small');
          metaEl.textContent = details.join(' | ');
          span.appendChild(metaEl);
        }
        if (result) {
          const scoreEl = document.createElement('span');
          const resultClass = result.ourScore > result.theirScore
            ? 'win'
            : (result.ourScore < result.theirScore ? 'loss' : 'tie');
          scoreEl.className = 'game-preview-score ' + resultClass;
          scoreEl.textContent = `Timpanogos ${result.ourScore}, ${g.opponent} ${result.theirScore}`;
          span.appendChild(scoreEl);
        }
        li.appendChild(span);
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit'; editBtn.className = 'btn small';
        editBtn.addEventListener('click', () => {
          showAdminPanel('dashboard');
          fillGameFormFromRecord(g, result, record);
          openGameFormModal();
        });
        const delBtn = document.createElement('button');
        delBtn.textContent = 'Delete'; delBtn.className = 'btn small alt';
        delBtn.addEventListener('click', () => {
          const previousGames = games.slice();
          const previousResults = results.slice();
          const previousAdminResults = adminResults.slice();
          const deletes = [];
          if (record.gameIndex >= 0) {
            const gameKey = firebaseChildKey(games[record.gameIndex], record.gameIndex);
            games.splice(record.gameIndex, 1);
            deletes.push(fbDeleteChild('games', gameKey));
          }
          if (record.resultIndex >= 0) {
            const resultKey = firebaseChildKey(results[record.resultIndex], record.resultIndex);
            results.splice(record.resultIndex, 1);
            deletes.push(fbDeleteChild('results', resultKey));
          }
          Promise.all(deletes).then(() => {
            cachedGames = games.slice();
            cachedResults = results.slice();
            syncAdminResults();
            renderGamesPreview();
          }).catch(err => {
            games = previousGames;
            results = previousResults;
            cachedGames = previousGames.slice();
            cachedResults = previousResults.slice();
            adminResults = previousAdminResults;
            document.getElementById('gameSaveError').textContent = err.message || 'Unable to delete game.';
          });
        });
        const btns = document.createElement('div');
        btns.className = 'list-actions';
        btns.appendChild(editBtn); btns.appendChild(delBtn);
        li.appendChild(btns);
        ul.appendChild(li);
      });
    });
  }

  function getGameOpponentDisplayName(opponent) {
    if (!opponent) return '';
    return opponent.shortName || opponent.schoolName || '';
  }

  function matchOpponentForGame(game) {
    if (!game) return null;
    if (game.opponentId) {
      const byId = findOpponentById(game.opponentId, opponents);
      if (byId) return byId;
    }
    if (!game.opponent) return null;
    const key = normalizeSchoolKey(game.opponent);
    return opponents.find(function(opponent) {
      return normalizeSchoolKey(opponent.schoolName) === key
        || (opponent.shortName && normalizeSchoolKey(opponent.shortName) === key);
    }) || null;
  }

  function setGameOpponentSelection(opponentId) {
    const hidden = document.getElementById('gameOpponentId');
    if (hidden) hidden.value = opponentId || '';
    updateGameOpponentPickerDisplay();
  }

  function updateGameOpponentPickerDisplay() {
    const label = document.getElementById('gameOpponentPickerLabel');
    const btn = document.getElementById('gameOpponentPickerBtn');
    const hidden = document.getElementById('gameOpponentId');
    if (!label || !hidden) return;
    const opponent = findOpponentById(hidden.value, opponents);
    if (opponent) {
      label.textContent = opponent.schoolName + (opponent.mascot ? ' (' + opponent.mascot + ')' : '');
      if (btn) btn.classList.add('is-selected');
    } else {
      label.textContent = 'Choose or add opponent';
      if (btn) btn.classList.remove('is-selected');
    }
  }

  function renderOpponentOptions(selectedId) {
    setGameOpponentSelection(selectedId);
    const searchEl = document.getElementById('gameOpponentModalSearch');
    renderOpponentPickerList(searchEl ? searchEl.value : '');
  }

  function applySelectedOpponentToGameForm() {
    const opponent = findOpponentById(document.getElementById('gameOpponentId').value, opponents);
    if (!opponent) return;
    const locationEl = document.getElementById('gameLocation');
    const addressEl = document.getElementById('gameLocationAddress');
    const isHome = locationEl && isHomeGameLocation(locationEl.value);
    if (opponent.address && addressEl && !addressEl.value && !isHome) {
      addressEl.value = opponent.address;
    }
  }

  function setQuickAddOpponentFormVisible(show, schoolName) {
    const panel = document.getElementById('gameOpponentQuickAddPanel');
    const form = document.getElementById('gameOpponentQuickAddForm');
    const toggle = document.getElementById('gameOpponentModalAddToggle');
    const nameEl = document.getElementById('gameOpponentQuickName');
    const errorEl = document.getElementById('gameOpponentQuickError');
    if (!panel || !toggle) return;
    panel.hidden = !show;
    toggle.setAttribute('aria-expanded', show ? 'true' : 'false');
    toggle.textContent = show ? 'Cancel new school' : '+ Add new school';
    if (errorEl) errorEl.textContent = '';
    if (show && nameEl) {
      if (schoolName) nameEl.value = schoolName;
      panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      setTimeout(function() { nameEl.focus(); }, 0);
    } else if (!show && form) {
      form.reset();
    }
  }

  function saveQuickAddOpponent(event) {
    if (event) event.preventDefault();
    const errorEl = document.getElementById('gameOpponentQuickError');
    const submitBtn = document.querySelector('#gameOpponentQuickAddForm button[type="submit"]');
    const schoolName = document.getElementById('gameOpponentQuickName').value.trim();
    if (!schoolName) {
      if (errorEl) errorEl.textContent = 'School name is required.';
      return Promise.resolve();
    }
    const opponent = {
      schoolName: schoolName,
      shortName: '',
      mascot: document.getElementById('gameOpponentQuickMascot').value.trim(),
      address: document.getElementById('gameOpponentQuickAddress').value.trim(),
      logoUrl: '',
      logoStoragePath: '',
      maxprepsSchoolId: '',
      maxprepsUrl: '',
      sortOrder: opponents.length
    };
    const savedText = submitBtn && submitBtn.textContent;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';
    }
    if (errorEl) errorEl.textContent = '';
    const previousOpponents = opponents.slice();
    return fbAddChild('opponents', opponent).then(function(savedOpponent) {
      opponents = normalizeOpponentList(previousOpponents.concat(normalizeOpponent(savedOpponent, previousOpponents.length)));
      cachedOpponents = opponents.slice();
      renderOpponentsPreview();
      renderOpponentOptions(savedOpponent._key);
      setQuickAddOpponentFormVisible(false);
      selectGameOpponent(findOpponentById(savedOpponent._key, opponents));
    }).catch(function(err) {
      opponents = previousOpponents;
      cachedOpponents = previousOpponents.slice();
      if (errorEl) {
        errorEl.textContent = typeof fbFormatError === 'function'
          ? fbFormatError(err, 'opponents')
          : (err.message || 'Unable to save opponent.');
      }
    }).finally(function() {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = savedText;
      }
    });
  }

  function selectGameOpponent(opponent) {
    if (!opponent) return;
    setGameOpponentSelection(opponent._key);
    applySelectedOpponentToGameForm();
    closeOpponentPickerModal();
  }

  function clearGameOpponentSelection() {
    setGameOpponentSelection('');
    closeOpponentPickerModal();
  }

  function opponentPickerModalKeydown(event) {
    if (event.key === 'Escape') closeOpponentPickerModal();
  }

  function openOpponentPickerModal() {
    const modal = document.getElementById('gameOpponentModal');
    const searchEl = document.getElementById('gameOpponentModalSearch');
    if (!modal) return;
    setQuickAddOpponentFormVisible(false);
    renderOpponentPickerList('');
    modal.hidden = false;
    document.body.classList.add('admin-modal-open');
    document.addEventListener('keydown', opponentPickerModalKeydown);
    if (searchEl) {
      searchEl.value = '';
      renderOpponentPickerList('');
      setTimeout(function() { searchEl.focus(); }, 0);
    }
  }

  function closeOpponentPickerModal() {
    const modal = document.getElementById('gameOpponentModal');
    if (!modal) return;
    modal.hidden = true;
    const gameModal = document.getElementById('gameFormModal');
    if (!gameModal || gameModal.hidden) {
      document.body.classList.remove('admin-modal-open');
    }
    document.removeEventListener('keydown', opponentPickerModalKeydown);
    setQuickAddOpponentFormVisible(false);
  }

  function renderOpponentPickerList(query) {
    const ul = document.getElementById('gameOpponentModalList');
    if (!ul) return;
    const selectedId = document.getElementById('gameOpponentId') && document.getElementById('gameOpponentId').value;
    const needle = normalizeSchoolKey(query);
    const filtered = opponents.filter(function(opponent) {
      if (!needle) return true;
      const haystack = normalizeSchoolKey(
        [opponent.schoolName, opponent.mascot, opponent.address].filter(Boolean).join(' ')
      );
      return haystack.indexOf(needle) !== -1;
    }).sort(function(a, b) {
      return (a.schoolName || '').localeCompare(b.schoolName || '', undefined, { sensitivity: 'base' });
    });
    ul.innerHTML = '';
    if (!opponents.length && !needle) {
      const empty = document.createElement('li');
      empty.className = 'admin-opponent-picker-empty';
      empty.textContent = 'No schools saved yet. Use Add new school above.';
      ul.appendChild(empty);
      return;
    }
    if (!filtered.length) {
      const empty = document.createElement('li');
      empty.className = 'admin-opponent-picker-empty';
      if (needle && query && query.trim()) {
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'btn small';
        addBtn.textContent = 'Add "' + query.trim() + '" as new school';
        addBtn.addEventListener('click', function() {
          setQuickAddOpponentFormVisible(true, query.trim());
        });
        empty.appendChild(addBtn);
      } else {
        empty.textContent = 'No schools match your search.';
      }
      ul.appendChild(empty);
      return;
    }
    filtered.forEach(function(opponent) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'admin-opponent-picker-option' + (opponent._key === selectedId ? ' is-selected' : '');
      const logo = document.createElement('span');
      logo.className = 'opponent-logo-preview';
      if (opponent.logoUrl) {
        const img = document.createElement('img');
        img.src = opponent.logoUrl;
        img.alt = '';
        img.loading = 'lazy';
        logo.appendChild(img);
      } else {
        logo.textContent = (opponent.schoolName || 'OP').slice(0, 2).toUpperCase();
      }
      btn.appendChild(logo);
      const details = document.createElement('span');
      details.className = 'admin-opponent-picker-details';
      const title = document.createElement('span');
      title.className = 'admin-opponent-picker-name';
      title.textContent = opponent.schoolName;
      details.appendChild(title);
      if (opponent.mascot) {
        const mascot = document.createElement('span');
        mascot.className = 'admin-opponent-picker-mascot';
        mascot.textContent = opponent.mascot;
        details.appendChild(mascot);
      }
      if (opponent.address) {
        const address = document.createElement('span');
        address.className = 'admin-opponent-picker-address';
        address.textContent = opponent.address;
        details.appendChild(address);
      }
      btn.appendChild(details);
      btn.addEventListener('click', function() {
        selectGameOpponent(opponent);
      });
      li.appendChild(btn);
      ul.appendChild(li);
    });
  }

  function wireOpponentPickerModal() {
    const openBtn = document.getElementById('gameOpponentPickerBtn');
    const modal = document.getElementById('gameOpponentModal');
    const searchEl = document.getElementById('gameOpponentModalSearch');
    const clearBtn = document.getElementById('gameOpponentModalClear');
    const addToggle = document.getElementById('gameOpponentModalAddToggle');
    const quickAddForm = document.getElementById('gameOpponentQuickAddForm');
    if (!modal) return;

    if (openBtn) openBtn.addEventListener('click', openOpponentPickerModal);
    if (clearBtn) clearBtn.addEventListener('click', clearGameOpponentSelection);
    if (addToggle) {
      addToggle.addEventListener('click', function() {
        const panel = document.getElementById('gameOpponentQuickAddPanel');
        setQuickAddOpponentFormVisible(panel ? panel.hidden : true);
      });
    }
    setQuickAddOpponentFormVisible(false);
    if (quickAddForm) quickAddForm.addEventListener('submit', saveQuickAddOpponent);
    if (searchEl) {
      searchEl.addEventListener('input', function() {
        renderOpponentPickerList(searchEl.value);
      });
    }

    modal.querySelectorAll('.admin-opponent-modal-backdrop, .admin-opponent-modal-close').forEach(function(el) {
      el.addEventListener('click', closeOpponentPickerModal);
    });
  }

  function showOpponentMessage(message) {
    const successEl = document.getElementById('opponentSaveSuccess');
    if (successEl) successEl.textContent = message;
    clearTimeout(showOpponentMessage.timer);
    showOpponentMessage.timer = setTimeout(() => {
      if (successEl) successEl.textContent = '';
    }, 4500);
  }

  function showMaxPrepsOpponentMessage(message) {
    const successEl = document.getElementById('maxprepsOpponentsSuccess');
    const errorEl = document.getElementById('maxprepsOpponentsError');
    if (errorEl) errorEl.textContent = '';
    if (successEl) successEl.textContent = message || '';
    clearTimeout(showMaxPrepsOpponentMessage.timer);
    showMaxPrepsOpponentMessage.timer = setTimeout(function() {
      if (successEl) successEl.textContent = '';
    }, 6000);
  }

  function renderMaxPrepsImportList() {
    const ul = document.getElementById('maxprepsOpponentsImportList');
    const importBtn = document.getElementById('maxprepsOpponentsImportBtn');
    if (!ul || !importBtn) return;
    ul.innerHTML = '';
    if (!maxprepsImportCandidates.length) {
      ul.hidden = true;
      importBtn.hidden = true;
      importBtn.disabled = true;
      return;
    }
    ul.hidden = false;
    importBtn.hidden = false;
    importBtn.disabled = false;
    maxprepsImportCandidates.forEach(function(candidate, index) {
      const li = document.createElement('li');
      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = candidate.action !== 'skip';
      checkbox.disabled = candidate.action === 'skip';
      checkbox.dataset.index = String(index);
      label.appendChild(checkbox);

      const logo = document.createElement('span');
      logo.className = 'maxpreps-import-logo';
      if (candidate.mp.logoUrl) {
        const img = document.createElement('img');
        img.src = candidate.mp.logoUrl;
        img.alt = '';
        img.loading = 'lazy';
        logo.appendChild(img);
      } else {
        logo.textContent = (candidate.mp.schoolName || 'OP').slice(0, 2).toUpperCase();
      }
      label.appendChild(logo);

      const main = document.createElement('span');
      main.className = 'maxpreps-import-main';
      const name = document.createElement('span');
      name.className = 'maxpreps-import-name';
      name.textContent = candidate.mp.schoolName || 'Unknown school';
      main.appendChild(name);
      if (candidate.mp.mascot) {
        const mascot = document.createElement('span');
        mascot.className = 'maxpreps-import-mascot';
        mascot.textContent = candidate.mp.mascot;
        main.appendChild(mascot);
      }
      label.appendChild(main);

      const badge = document.createElement('span');
      badge.className = 'maxpreps-import-badge ' + candidate.action;
      badge.textContent = candidate.action === 'add' ? 'New' : (candidate.action === 'update' ? 'Update' : 'Saved');
      label.appendChild(badge);

      li.appendChild(label);
      if (candidate.mp.address) {
        const small = document.createElement('small');
        small.textContent = candidate.mp.address;
        li.appendChild(small);
      }
      ul.appendChild(li);
    });
  }

  function loadMaxPrepsOpponents() {
    const loadBtn = document.getElementById('maxprepsOpponentsLoadBtn');
    const errorEl = document.getElementById('maxprepsOpponentsError');
    if (!loadBtn) return Promise.resolve();
    const savedText = loadBtn.textContent;
    loadBtn.disabled = true;
    loadBtn.textContent = 'Loading...';
    if (errorEl) errorEl.textContent = '';
    const dataUrl = (window.__SITE_BASE_PATH || '') + '/data/opponents-maxpreps.json';
    return fetch(dataUrl + (dataUrl.indexOf('?') === -1 ? '?' : '&') + 't=' + Date.now())
      .then(function(response) {
        if (!response.ok) throw new Error('Could not load opponents-maxpreps.json. Run npm run fetch-opponents and deploy, or open admin from the site root.');
        return response.json();
      })
      .then(function(payload) {
        const list = payload && Array.isArray(payload.opponents) ? payload.opponents : [];
        maxprepsImportCandidates = list.map(function(mp) {
          const existing = findOpponentForMaxPreps(mp, opponents);
          return { mp: mp, existing: existing, action: maxprepsImportAction(mp, existing) };
        });
        renderMaxPrepsImportList();
        const addCount = maxprepsImportCandidates.filter(function(c) { return c.action === 'add'; }).length;
        const updateCount = maxprepsImportCandidates.filter(function(c) { return c.action === 'update'; }).length;
        showMaxPrepsOpponentMessage(
          list.length + ' schools from MaxPreps — ' + addCount + ' new, ' + updateCount + ' to update.'
        );
      })
      .catch(function(err) {
        maxprepsImportCandidates = [];
        renderMaxPrepsImportList();
        if (errorEl) errorEl.textContent = err.message || 'Unable to load MaxPreps opponents.';
      })
      .finally(function() {
        loadBtn.disabled = false;
        loadBtn.textContent = savedText;
      });
  }

  function importOneMaxPrepsOpponent(candidate) {
    const mp = candidate.mp;
    const existing = candidate.existing;
    const opponent = {
      schoolName: mp.schoolName,
      shortName: existing && existing.shortName ? existing.shortName : '',
      mascot: mp.mascot || (existing && existing.mascot) || '',
      address: mp.address || (existing && existing.address) || '',
      logoUrl: existing && existing.logoUrl ? existing.logoUrl : '',
      logoStoragePath: existing && existing.logoStoragePath ? existing.logoStoragePath : '',
      maxprepsSchoolId: mp.maxprepsSchoolId || '',
      maxprepsUrl: mp.maxprepsUrl || '',
      sortOrder: existing ? existing.sortOrder : opponents.length
    };
    const shouldFetchLogo = mp.logoUrl && (!existing || !existing.logoUrl);
    const logoPromise = shouldFetchLogo
      ? opponentLogoFileFromUrl(mp.logoUrl, mp.schoolName).then(function(file) {
        return uploadOpponentLogoIfNeeded(opponent, file, existing);
      })
      : Promise.resolve(opponent);

    return logoPromise.then(function(finalOpponent) {
      if (existing) {
        const idx = opponents.indexOf(existing);
        const opponentKey = firebaseChildKey(existing, idx);
        return fbSaveChild('opponents', opponentKey, finalOpponent).then(function(savedOpponent) {
          opponents[idx] = normalizeOpponent(savedOpponent, idx);
        });
      }
      return fbAddChild('opponents', finalOpponent).then(function(savedOpponent) {
        opponents.push(normalizeOpponent(savedOpponent, opponents.length));
      });
    });
  }

  function importSelectedMaxPrepsOpponents() {
    const importBtn = document.getElementById('maxprepsOpponentsImportBtn');
    const errorEl = document.getElementById('maxprepsOpponentsError');
    const checkboxes = document.querySelectorAll('#maxprepsOpponentsImportList input[type="checkbox"]:checked:not(:disabled)');
    const selected = Array.from(checkboxes).map(function(cb) {
      return maxprepsImportCandidates[Number(cb.dataset.index)];
    }).filter(Boolean);
    if (!selected.length) {
      if (errorEl) errorEl.textContent = 'Select at least one school to import.';
      return Promise.resolve();
    }
    const previousOpponents = opponents.slice();
    const savedText = importBtn.textContent;
    importBtn.disabled = true;
    importBtn.textContent = 'Importing...';
    if (errorEl) errorEl.textContent = '';

    let chain = Promise.resolve();
    selected.forEach(function(candidate) {
      chain = chain.then(function() {
        return importOneMaxPrepsOpponent(candidate);
      });
    });

    return chain.then(function() {
      opponents = normalizeOpponentList(opponents);
      cachedOpponents = opponents.slice();
      renderOpponentOptions();
      renderOpponentsPreview();
      maxprepsImportCandidates = maxprepsImportCandidates.map(function(candidate) {
        const existing = findOpponentForMaxPreps(candidate.mp, opponents);
        return { mp: candidate.mp, existing: existing, action: maxprepsImportAction(candidate.mp, existing) };
      });
      renderMaxPrepsImportList();
      showMaxPrepsOpponentMessage('Imported ' + selected.length + ' opponent' + (selected.length === 1 ? '' : 's') + ' from MaxPreps.');
    }).catch(function(err) {
      opponents = previousOpponents;
      cachedOpponents = previousOpponents.slice();
      if (errorEl) {
        errorEl.textContent = typeof fbFormatError === 'function'
          ? fbFormatError(err, 'opponents')
          : (err.message || 'Import failed.');
      }
    }).finally(function() {
      importBtn.disabled = false;
      importBtn.textContent = savedText;
    });
  }

  function renderOpponentsPreview() {
    const ul = document.getElementById('opponentsPreview');
    if (!ul) return;
    ul.innerHTML = '';
    opponents.forEach((opponent, i) => {
      const li = document.createElement('li');
      li.className = 'opponent-list-item';

      const logo = document.createElement('span');
      logo.className = 'opponent-logo-preview';
      if (opponent.logoUrl) {
        const img = document.createElement('img');
        img.src = opponent.logoUrl;
        img.alt = '';
        img.loading = 'lazy';
        logo.appendChild(img);
      } else {
        logo.textContent = (opponent.schoolName || 'OP').slice(0, 2).toUpperCase();
      }
      li.appendChild(logo);

      const details = document.createElement('span');
      details.className = 'game-preview-details';
      const title = document.createElement('span');
      title.className = 'game-preview-opponent';
      title.textContent = opponent.schoolName;
      details.appendChild(title);
      const meta = [opponent.mascot, opponent.address].filter(Boolean);
      if (meta.length) {
        const small = document.createElement('small');
        small.textContent = meta.join(' | ');
        details.appendChild(small);
      }
      li.appendChild(details);

      const editBtn = document.createElement('button');
      editBtn.textContent = 'Edit';
      editBtn.className = 'btn small';
      editBtn.addEventListener('click', () => {
        document.getElementById('opponentSchoolName').value = opponent.schoolName || '';
        document.getElementById('opponentMascot').value = opponent.mascot || '';
        document.getElementById('opponentAddress').value = opponent.address || '';
        document.getElementById('opponentLogoFile').value = '';
        editingOpponentIdx = i;
        document.querySelector('#opponentForm button[type="submit"]').textContent = 'Update Opponent';
        showAdminPanel('opponents');
        document.getElementById('opponentAdminCard').scrollIntoView({ behavior: 'smooth' });
      });

      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.className = 'btn small alt';
      delBtn.addEventListener('click', () => {
        const previousOpponents = opponents.slice();
        const opponentKey = firebaseChildKey(opponents[i], i);
        opponents.splice(i, 1);
        fbDeleteChild('opponents', opponentKey).then(() => {
          cachedOpponents = opponents.slice();
          renderOpponentOptions();
          renderOpponentsPreview();
          renderGamesPreview();
          showOpponentMessage('Opponent deleted.');
          if (previousOpponents[i] && previousOpponents[i].logoStoragePath) {
            fbDeleteFile(previousOpponents[i].logoStoragePath).catch(err => console.warn('Opponent logo file delete failed:', err));
          }
        }).catch(err => {
          opponents = previousOpponents;
          document.getElementById('opponentSaveError').textContent = err.message || 'Unable to delete opponent.';
          renderOpponentsPreview();
        });
      });

      const btns = document.createElement('div');
      btns.className = 'list-actions';
      btns.appendChild(editBtn);
      btns.appendChild(delBtn);
      li.appendChild(btns);
      ul.appendChild(li);
    });
  }

  function uploadOpponentLogoIfNeeded(opponent, file, previousOpponent) {
    if (!file) return Promise.resolve(opponent);
    const safeName = (opponent.schoolName || 'opponent').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'opponent';
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const storagePath = 'opponents/' + safeName + '-' + Date.now() + '.' + ext;
    return fbUploadFile(storagePath, file, { contentType: file.type || 'image/jpeg' }).then(uploaded => {
      opponent.logoUrl = uploaded.url;
      opponent.logoStoragePath = uploaded.storagePath;
      if (previousOpponent && previousOpponent.logoStoragePath && previousOpponent.logoStoragePath !== uploaded.storagePath) {
        fbDeleteFile(previousOpponent.logoStoragePath).catch(err => console.warn('Old opponent logo delete failed:', err));
      }
      return opponent;
    });
  }

  function renderCarouselPhotosPreview() {
    const ul = document.getElementById('carouselPhotosPreview');
    ul.innerHTML = '';
    carouselPhotos.forEach((photo, i) => {
      const li = document.createElement('li');
      li.className = 'photo-list-item';
      li.draggable = true;
      li.dataset.index = String(i);

      const handle = document.createElement('button');
      handle.type = 'button';
      handle.className = 'drag-handle';
      handle.textContent = '☰';
      handle.setAttribute('aria-label', 'Drag to reorder');
      li.appendChild(handle);

      const img = document.createElement('img');
      img.src = photo.src + (photo.src.includes('?') ? '&' : '?') + 'thumbBust=' + encodeURIComponent(photo.updatedAt || Date.now());
      img.alt = photo.alt || 'Carousel photo';
      img.loading = 'lazy';
      li.appendChild(img);

      const span = document.createElement('span');
      const title = document.createElement('strong');
      title.textContent = photo.alt || 'Team photo';
      const src = document.createElement('small');
      src.textContent = photo.src;
      span.appendChild(title);
      span.appendChild(src);
      li.appendChild(span);

      const editBtn = document.createElement('button');
      editBtn.textContent = 'Edit'; editBtn.className = 'btn small';
      editBtn.addEventListener('click', () => {
        document.getElementById('carouselPhotoAlt').value = photo.alt || '';
        document.getElementById('carouselPhotoFile').value = '';
        document.getElementById('carouselCropEditor').hidden = true;
        document.getElementById('carouselCropNote').textContent = 'This saved photo is already optimized. Choose a new image file to replace it and crop the replacement.';
        cropState.file = null;
        cropState.image = null;
        cropState.previewMode = 'fit';
        editingCarouselPhotoIdx = i;
        document.querySelector('#carouselPhotoForm button[type="submit"]').textContent = 'Update Photo';
        showAdminPanel('carousel');
        document.getElementById('carouselAdminCard').scrollIntoView({ behavior: 'smooth' });
      });

      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete'; delBtn.className = 'btn small alt';
      delBtn.addEventListener('click', () => {
        const previousPhotos = carouselPhotos.slice();
        const photoKey = firebaseChildKey(carouselPhotos[i], i);
        carouselPhotos.splice(i, 1);
        fbDeleteChild('carouselPhotos', photoKey).then(() => {
          refreshCarouselPhotos(carouselPhotos);
          renderCarouselPhotosPreview();
          showCarouselPhotoMessage('Carousel photo deleted.');
          announceCarouselPhotosChanged();
          if (previousPhotos[i] && previousPhotos[i].storagePath) {
            fbDeleteFile(previousPhotos[i].storagePath).catch(err => console.warn('Carousel photo file delete failed:', err));
          }
        }).catch(err => {
          carouselPhotos = previousPhotos;
          document.getElementById('carouselPhotoSaveError').textContent = err.message || 'Unable to delete photo.';
        });
      });

      const btns = document.createElement('div');
      btns.className = 'list-actions';
      btns.appendChild(editBtn); btns.appendChild(delBtn);
      li.appendChild(btns);
      ul.appendChild(li);
    });
  }

  let carouselDragIndex = null;

  function setCarouselPhotoOrderError(message) {
    const formErrorEl = document.getElementById('carouselPhotoSaveError');
    const orderErrorEl = document.getElementById('carouselPhotoOrderError');
    if (formErrorEl) formErrorEl.textContent = message || '';
    if (orderErrorEl) orderErrorEl.textContent = message || '';
  }

  function saveCarouselPhotoOrder(previousPhotos) {
    setCarouselPhotoOrderError('');
    const reorderedPhotos = carouselPhotos.map((photo, index) => {
      const cleaned = cleanFirebaseRecord(photo);
      cleaned.sortOrder = index;
      return Object.assign({ _key: firebaseChildKey(photo, index) }, cleaned);
    });
    fbSaveCarouselPhotoOrder(reorderedPhotos).then(savedPhotos => {
      return fbGet('carouselPhotos').then(latestPhotos => {
        carouselPhotos = normalizeCarouselPhotoList(fbToArray(latestPhotos));
        refreshCarouselPhotos(carouselPhotos);
        renderCarouselPhotosPreview();
      }).catch(() => {
        carouselPhotos = normalizeCarouselPhotoList(savedPhotos);
        refreshCarouselPhotos(carouselPhotos);
        renderCarouselPhotosPreview();
      });
    }).catch(err => {
      if (previousPhotos) {
        carouselPhotos = previousPhotos;
        refreshCarouselPhotos(carouselPhotos);
      }
      const message = err.message || err.code || 'Unable to save photo order.';
      setCarouselPhotoOrderError(message);
      renderCarouselPhotosPreview();
    });
  }

  function reorderCarouselPhoto(fromIndex, toIndex) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= carouselPhotos.length || toIndex >= carouselPhotos.length) return;
    const previousPhotos = carouselPhotos.slice();
    const moved = carouselPhotos.splice(fromIndex, 1)[0];
    carouselPhotos.splice(toIndex, 0, moved);
    renderCarouselPhotosPreview();
    refreshCarouselPhotos(carouselPhotos);
    saveCarouselPhotoOrder(previousPhotos);
  }

  function showCarouselPhotoMessage(message) {
    const successEl = document.getElementById('carouselPhotoSaveSuccess');
    if (successEl) successEl.textContent = message;
    clearTimeout(showCarouselPhotoMessage.timer);
    showCarouselPhotoMessage.timer = setTimeout(() => {
      if (successEl) successEl.textContent = '';
    }, 4500);
  }

  const cropState = {
    file: null,
    image: null,
    objectUrl: '',
    offsetX: 0,
    offsetY: 0,
    zoom: 1,
    previewMode: 'fit'
  };

  function setCropPreviewMode(mode) {
    cropState.previewMode = mode;
    const preview = document.querySelector('.crop-preview');
    if (preview) preview.classList.toggle('is-fit-preview', mode === 'fit');
    updateCropPreview();
  }

  function cropMetrics() {
    const preview = document.querySelector('.crop-preview');
    if (!preview || !cropState.image) return null;
    const rect = preview.getBoundingClientRect();
    const image = cropState.image;
    const frameW = rect.width;
    const frameH = rect.height;
    const containScale = Math.min(frameW / image.naturalWidth, frameH / image.naturalHeight);
    const displayW = image.naturalWidth * containScale * cropState.zoom;
    const displayH = image.naturalHeight * containScale * cropState.zoom;
    const minVisible = Math.min(40, frameW / 4, frameH / 4);
    const maxX = Math.max(0, (displayW + frameW) / 2 - minVisible);
    const maxY = Math.max(0, (displayH + frameH) / 2 - minVisible);
    const imageX = (frameW - displayW) / 2 + cropState.offsetX;
    const imageY = (frameH - displayH) / 2 + cropState.offsetY;
    return { frameW, frameH, displayW, displayH, imageX, imageY, maxX, maxY };
  }

  function clampCropOffset() {
    const metrics = cropMetrics();
    if (!metrics) return;
    cropState.offsetX = Math.max(-metrics.maxX, Math.min(metrics.maxX, cropState.offsetX));
    cropState.offsetY = Math.max(-metrics.maxY, Math.min(metrics.maxY, cropState.offsetY));
  }

  function updateCropPreview() {
    const img = document.getElementById('carouselCropImage');
    if (!img) return;
    clampCropOffset();
    const metrics = cropMetrics();
    if (!metrics) return;
    img.style.width = metrics.displayW + 'px';
    img.style.height = metrics.displayH + 'px';
    img.style.objectFit = 'fill';
    img.style.transform = 'translate(calc(-50% + ' + cropState.offsetX + 'px), calc(-50% + ' + cropState.offsetY + 'px))';
  }

  function prepareCarouselCropForUpload() {
    setCropPreviewMode('crop');
    document.getElementById('carouselCropNote').textContent = 'Cropping, resizing, compressing, and sharpening the image before upload.';
  }

  function loadCarouselCropImage(file) {
    return new Promise((resolve, reject) => {
      if (cropState.objectUrl) URL.revokeObjectURL(cropState.objectUrl);
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        cropState.file = file;
        cropState.image = image;
        cropState.objectUrl = url;
        cropState.offsetX = 0;
        cropState.offsetY = 0;
        cropState.zoom = 1;
        document.getElementById('carouselCropEditor').hidden = false;
        document.getElementById('carouselCropImage').src = url;
        document.getElementById('carouselCropZoom').value = cropState.zoom;
        setCropPreviewMode('fit');
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Unable to load that image for cropping.'));
      };
      image.src = url;
    });
  }

  function optimizedCarouselBlob(file) {
    const imagePromise = cropState.file === file && cropState.image
      ? Promise.resolve(cropState.image)
      : loadCarouselCropImage(file);

    return imagePromise.then(image => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const metrics = cropMetrics();

      canvas.width = carouselOutputWidth;
      canvas.height = carouselOutputHeight;
      ctx.fillStyle = '#002855';
      ctx.fillRect(0, 0, carouselOutputWidth, carouselOutputHeight);
      if (metrics && metrics.frameW && metrics.frameH) {
        const outputScaleX = carouselOutputWidth / metrics.frameW;
        const outputScaleY = carouselOutputHeight / metrics.frameH;
        ctx.drawImage(
          image,
          metrics.imageX * outputScaleX,
          metrics.imageY * outputScaleY,
          metrics.displayW * outputScaleX,
          metrics.displayH * outputScaleY
        );
      } else {
        ctx.drawImage(image, 0, 0, carouselOutputWidth, carouselOutputHeight);
      }
      sharpenCanvas(ctx, carouselOutputWidth, carouselOutputHeight, carouselSharpenAmount);

      return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
          if (!blob) reject(new Error('Unable to optimize that image.'));
          else resolve(blob);
        }, 'image/jpeg', carouselOutputQuality);
      });
    });
  }

  function sharpenCanvas(ctx, width, height, amount) {
    if (!amount) return;
    const imageData = ctx.getImageData(0, 0, width, height);
    const src = imageData.data;
    const out = new Uint8ClampedArray(src);
    const center = 1 + 4 * amount;
    const side = -amount;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = (y * width + x) * 4;
        for (let c = 0; c < 3; c++) {
          out[i + c] =
            src[i + c] * center +
            src[i - 4 + c] * side +
            src[i + 4 + c] * side +
            src[i - width * 4 + c] * side +
            src[i + width * 4 + c] * side;
        }
      }
    }

    imageData.data.set(out);
    ctx.putImageData(imageData, 0, 0);
  }

  renderOpponentOptions();
  renderOpponentsPreview();
  wireOpponentPickerModal();
  document.getElementById('gameDate').addEventListener('change', updateGameSeasonHint);
  updateGameSeasonHint();

  const maxprepsLoadBtn = document.getElementById('maxprepsOpponentsLoadBtn');
  const maxprepsImportBtn = document.getElementById('maxprepsOpponentsImportBtn');
  if (maxprepsLoadBtn) maxprepsLoadBtn.addEventListener('click', loadMaxPrepsOpponents);
  if (maxprepsImportBtn) maxprepsImportBtn.addEventListener('click', importSelectedMaxPrepsOpponents);

  document.getElementById('opponentForm').addEventListener('submit', e => {
    e.preventDefault();
    const form = e.currentTarget;
    const submitBtn = form.querySelector('button[type="submit"]');
    const errorEl = document.getElementById('opponentSaveError');
    const previousOpponents = opponents.slice();
    const wasEditing = editingOpponentIdx >= 0;
    const previousOpponent = wasEditing ? previousOpponents[editingOpponentIdx] : null;
    const savedButtonText = submitBtn.textContent;
    errorEl.textContent = '';

    const opponent = {
      schoolName: document.getElementById('opponentSchoolName').value.trim(),
      shortName: previousOpponent && previousOpponent.shortName ? previousOpponent.shortName : '',
      mascot: document.getElementById('opponentMascot').value.trim(),
      address: document.getElementById('opponentAddress').value.trim(),
      logoUrl: previousOpponent && previousOpponent.logoUrl ? previousOpponent.logoUrl : '',
      logoStoragePath: previousOpponent && previousOpponent.logoStoragePath ? previousOpponent.logoStoragePath : '',
      maxprepsSchoolId: previousOpponent && previousOpponent.maxprepsSchoolId ? previousOpponent.maxprepsSchoolId : '',
      maxprepsUrl: previousOpponent && previousOpponent.maxprepsUrl ? previousOpponent.maxprepsUrl : '',
      sortOrder: wasEditing ? previousOpponent.sortOrder : opponents.length
    };
    const file = document.getElementById('opponentLogoFile').files[0];

    submitBtn.disabled = true;
    submitBtn.textContent = wasEditing ? 'Saving...' : 'Adding...';

    uploadOpponentLogoIfNeeded(opponent, file, previousOpponent).then(finalOpponent => {
      if (wasEditing) {
        const opponentKey = firebaseChildKey(opponents[editingOpponentIdx], editingOpponentIdx);
        return fbSaveChild('opponents', opponentKey, finalOpponent).then(savedOpponent => {
          opponents[editingOpponentIdx] = normalizeOpponent(savedOpponent, editingOpponentIdx);
        });
      }
      return fbAddChild('opponents', finalOpponent).then(savedOpponent => {
        opponents = previousOpponents.concat(normalizeOpponent(savedOpponent, previousOpponents.length));
      });
    }).then(() => {
      opponents = normalizeOpponentList(opponents);
      cachedOpponents = opponents.slice();
      editingOpponentIdx = -1;
      form.reset();
      submitBtn.textContent = 'Add Opponent';
      renderOpponentOptions();
      renderOpponentsPreview();
      renderGamesPreview();
      showOpponentMessage(wasEditing ? 'Opponent updated.' : 'Opponent added.');
    }).catch(err => {
      opponents = previousOpponents;
      cachedOpponents = previousOpponents.slice();
      errorEl.textContent = typeof fbFormatError === 'function'
        ? fbFormatError(err, 'opponents')
        : (err.message || 'Unable to save opponent.');
      submitBtn.textContent = savedButtonText;
    }).finally(() => {
      submitBtn.disabled = false;
    });
  });

  document.getElementById('gameForm').addEventListener('submit', e => {
    e.preventDefault();
    const form = e.currentTarget;
    const submitBtn = form.querySelector('button[type="submit"]');
    const errorEl = document.getElementById('gameSaveError');
    const previousGames = games.slice();
    const previousResults = results.slice();
    const previousAdminResults = adminResults.slice();
    const wasEditingGame = editingGameIdx >= 0;
    const wasEditingRecord = editingGameIdx >= 0 || editingResultIdx >= 0;
    const savedButtonText = submitBtn.textContent;
    errorEl.textContent = '';
    const selectedOpponent = findOpponentById(document.getElementById('gameOpponentId').value, opponents);
    if (!selectedOpponent) {
      errorEl.textContent = 'Choose an opponent or add a new school using the opponent picker.';
      openOpponentPickerModal();
      return;
    }
    const gameLocation = document.getElementById('gameLocation').value;
    const gameLocationAddress = document.getElementById('gameLocationAddress').value.trim();
    const game = {
      teamLevel: getScheduleTeamLevel(document.getElementById('gameTeamLevel').value),
      season: getBaseballSeason('', document.getElementById('gameDate').value),
      opponentId: selectedOpponent._key,
      date: document.getElementById('gameDate').value,
      opponent: getGameOpponentDisplayName(selectedOpponent),
      location: gameLocation,
      locationAddress: gameLocationAddress || (isHomeGameLocation(gameLocation) ? '' : selectedOpponent.address || ''),
      time: document.getElementById('gameTime').value
    };
    if (document.getElementById('gamePlayoff').checked) game.playoff = true;
    let scoreResult = null;
    try {
      scoreResult = getGameScoreResult(game);
    } catch (err) {
      errorEl.textContent = err.message;
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = wasEditingRecord ? 'Saving...' : 'Adding...';
    const saveScore = savedGame => {
      if (scoreResult) return saveResultForGame(originalGameForResult, scoreResult, editingResultIdx);
      return deleteResultForGame(originalGameForResult, editingResultIdx);
    };
    let originalGameForResult = wasEditingGame
      ? previousGames[editingGameIdx]
      : (editingResultIdx >= 0 ? results[editingResultIdx] : game);

    if (wasEditingGame) {
      const gameKey = firebaseChildKey(games[editingGameIdx], editingGameIdx);
      games[editingGameIdx] = game;
      fbSaveChild('games', gameKey, game).then(savedGame => {
        games[editingGameIdx] = savedGame;
        cachedGames = games.slice();
        return saveScore(savedGame);
      }).then(() => {
        editingGameIdx = -1;
        editingResultIdx = -1;
        submitBtn.textContent = 'Add Game';
        renderGamesPreview();
        form.reset();
        updateGameSeasonHint();
        updateGameOpponentPickerDisplay();
        closeGameFormModal();
      }).catch(err => {
        games = previousGames;
        results = previousResults;
        cachedGames = previousGames.slice();
        cachedResults = previousResults.slice();
        adminResults = previousAdminResults;
        errorEl.textContent = err.message || 'Unable to save game.';
        submitBtn.textContent = savedButtonText;
      }).finally(() => {
        submitBtn.disabled = false;
      });
    } else { games.push(game); }
    if (!wasEditingGame) {
      fbAddChild('games', game).then(savedGame => {
        games = previousGames.concat(savedGame);
        cachedGames = games.slice();
        return saveScore(savedGame);
      }).then(() => {
        editingGameIdx = -1;
        editingResultIdx = -1;
        submitBtn.textContent = 'Add Game';
        renderGamesPreview();
        form.reset();
        updateGameSeasonHint();
        updateGameOpponentPickerDisplay();
        closeGameFormModal();
      }).catch(err => {
        games = previousGames;
        results = previousResults;
        cachedGames = previousGames.slice();
        cachedResults = previousResults.slice();
        adminResults = previousAdminResults;
        errorEl.textContent = err.message || 'Unable to save game.';
        submitBtn.textContent = savedButtonText;
      }).finally(() => {
        submitBtn.disabled = false;
      });
    }
  });

  document.getElementById('carouselPhotoForm').addEventListener('submit', e => {
    e.preventDefault();
    const form = e.currentTarget;
    const submitBtn = form.querySelector('button[type="submit"]');
    const errorEl = document.getElementById('carouselPhotoSaveError');
    const previousPhotos = carouselPhotos.slice();
    const wasEditing = editingCarouselPhotoIdx >= 0;
    const previousPhoto = wasEditing ? previousPhotos[editingCarouselPhotoIdx] : null;
    const savedButtonText = submitBtn.textContent;
    const file = document.getElementById('carouselPhotoFile').files[0];
    const photo = {
      src: previousPhoto && previousPhoto.src ? previousPhoto.src : '',
      alt: document.getElementById('carouselPhotoAlt').value.trim() || 'Team photo',
      updatedAt: Date.now(),
      sortOrder: wasEditing && previousPhoto && previousPhoto.sortOrder != null
        ? previousPhoto.sortOrder
        : nextCarouselSortOrder(previousPhotos)
    };
    if (!file && previousPhoto) {
      photo.storagePath = previousPhoto.storagePath;
      photo.width = previousPhoto.width;
      photo.height = previousPhoto.height;
    }

    errorEl.textContent = '';
    if (!file && !wasEditing) {
      errorEl.textContent = 'Choose an image file to add a carousel photo.';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = file ? 'Optimizing...' : (wasEditing ? 'Saving...' : 'Adding...');

    const upload = file ? Promise.resolve().then(() => {
      prepareCarouselCropForUpload();
      return optimizedCarouselBlob(file);
    }).then(blob => {
      submitBtn.textContent = 'Uploading...';
      return fbUploadFile(
        carouselUploadPath(file),
        blob,
        {
          contentType: 'image/jpeg',
          customMetadata: {
            originalName: file.name,
            optimizedWidth: String(carouselOutputWidth),
            optimizedHeight: String(carouselOutputHeight)
          }
        },
        progress => {
          submitBtn.textContent = 'Uploading ' + progress + '%';
        }
      );
    }).then(uploaded => {
      photo.src = uploaded.url;
      photo.storagePath = uploaded.storagePath;
      photo.width = carouselOutputWidth;
      photo.height = carouselOutputHeight;
      return photo;
    }) : Promise.resolve(photo);

    upload.then(nextPhoto => {
      if (wasEditing) {
        const photoKey = firebaseChildKey(previousPhoto, editingCarouselPhotoIdx);
        carouselPhotos[editingCarouselPhotoIdx] = Object.assign({ _key: photoKey }, nextPhoto);
        submitBtn.textContent = 'Saving...';
        return fbSaveCarouselPhotoChild(photoKey, nextPhoto);
      } else {
        submitBtn.textContent = 'Saving...';
        return fbAddCarouselPhoto(nextPhoto);
      }
    }).then(savedPhoto => {
      if (wasEditing) {
        carouselPhotos[editingCarouselPhotoIdx] = normalizeCarouselPhoto(savedPhoto, editingCarouselPhotoIdx);
      } else {
        carouselPhotos = previousPhotos.concat(normalizeCarouselPhoto(savedPhoto, previousPhotos.length));
      }
      refreshCarouselPhotos(carouselPhotos);
      editingCarouselPhotoIdx = -1;
      submitBtn.textContent = 'Add Photo';
      renderCarouselPhotosPreview();
      form.reset();
      document.getElementById('carouselCropEditor').hidden = true;
      document.getElementById('carouselCropNote').textContent = 'Choose an image file to crop and optimize it before upload.';
      cropState.file = null;
      cropState.image = null;
      cropState.previewMode = 'fit';
      showCarouselPhotoMessage(wasEditing ? 'Carousel photo updated.' : 'Carousel photo added.');
      if (previousPhoto && previousPhoto.storagePath && (file || photo.src !== previousPhoto.src)) {
        fbDeleteFile(previousPhoto.storagePath).catch(err => console.warn('Old carousel photo file delete failed:', err));
      }
    }).catch(err => {
      carouselPhotos = previousPhotos;
      errorEl.textContent = err.message || err.code || 'Unable to save photo.';
      submitBtn.textContent = savedButtonText;
    }).finally(() => {
      submitBtn.disabled = false;
    });
  });

  document.getElementById('carouselPhotoFile').addEventListener('change', e => {
    const file = e.currentTarget.files[0];
    const errorEl = document.getElementById('carouselPhotoSaveError');
    errorEl.textContent = '';
    if (!file) {
      document.getElementById('carouselCropEditor').hidden = true;
      document.getElementById('carouselCropNote').textContent = editingCarouselPhotoIdx >= 0
        ? 'This saved photo is already optimized. Choose a new image file to replace it and crop the replacement.'
        : 'Choose an image file to crop and optimize it before upload.';
      cropState.file = null;
      cropState.image = null;
      cropState.previewMode = 'fit';
      return;
    }
    loadCarouselCropImage(file).catch(err => {
      errorEl.textContent = err.message || 'Unable to prepare that image.';
    });
    document.getElementById('carouselCropNote').textContent = 'Full preview shown. The image will be cropped to the carousel shape after you click ' + (editingCarouselPhotoIdx >= 0 ? 'Update Photo.' : 'Add Photo.');
  });

  document.getElementById('carouselCropZoom').addEventListener('input', e => {
    if (cropState.previewMode === 'fit') setCropPreviewMode('crop');
    const oldZoom = cropState.zoom;
    cropState.zoom = +e.currentTarget.value;
    if (oldZoom) {
      cropState.offsetX = cropState.offsetX * (cropState.zoom / oldZoom);
      cropState.offsetY = cropState.offsetY * (cropState.zoom / oldZoom);
    }
    updateCropPreview();
  });

  const cropPreview = document.querySelector('.crop-preview');
  let draggingCrop = null;
  cropPreview.addEventListener('pointerdown', e => {
    if (!cropState.image) return;
    if (cropState.previewMode === 'fit') setCropPreviewMode('crop');
    cropPreview.setPointerCapture(e.pointerId);
    draggingCrop = {
      startX: e.clientX,
      startY: e.clientY,
      offsetX: cropState.offsetX,
      offsetY: cropState.offsetY
    };
    cropPreview.classList.add('dragging');
  });
  cropPreview.addEventListener('pointermove', e => {
    if (!draggingCrop) return;
    cropState.offsetX = draggingCrop.offsetX + e.clientX - draggingCrop.startX;
    cropState.offsetY = draggingCrop.offsetY + e.clientY - draggingCrop.startY;
    updateCropPreview();
  });
  function stopCropDrag(e) {
    if (!draggingCrop) return;
    if (e && cropPreview.hasPointerCapture(e.pointerId)) cropPreview.releasePointerCapture(e.pointerId);
    draggingCrop = null;
    cropPreview.classList.remove('dragging');
  }
  cropPreview.addEventListener('pointerup', stopCropDrag);
  cropPreview.addEventListener('pointercancel', stopCropDrag);
  window.addEventListener('resize', updateCropPreview);

  document.getElementById('carouselPhotosPreview').addEventListener('dragstart', e => {
    const li = e.target.closest('.photo-list-item');
    if (!li) return;
    carouselDragIndex = +li.dataset.index;
    li.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', li.dataset.index);
  });
  document.getElementById('carouselPhotosPreview').addEventListener('dragover', e => {
    const li = e.target.closest('.photo-list-item');
    if (!li || carouselDragIndex == null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    li.classList.add('drag-over');
  });
  document.getElementById('carouselPhotosPreview').addEventListener('dragleave', e => {
    const li = e.target.closest('.photo-list-item');
    if (li) li.classList.remove('drag-over');
  });
  document.getElementById('carouselPhotosPreview').addEventListener('drop', e => {
    const li = e.target.closest('.photo-list-item');
    if (!li || carouselDragIndex == null) return;
    e.preventDefault();
    const dropIndex = +li.dataset.index;
    document.querySelectorAll('.photo-list-item').forEach(item => item.classList.remove('drag-over', 'dragging'));
    if (dropIndex === carouselDragIndex) return;
    const previousDragIndex = carouselDragIndex;
    carouselDragIndex = null;
    reorderCarouselPhoto(previousDragIndex, dropIndex);
  });
  document.getElementById('carouselPhotosPreview').addEventListener('dragend', () => {
    carouselDragIndex = null;
    document.querySelectorAll('.photo-list-item').forEach(item => item.classList.remove('drag-over', 'dragging'));
  });

  renderGamesPreview();
  renderCarouselPhotosPreview();
}

/* ── Roster ── */
const rosterData = [
  {num:1,name:'Jace Hunter',year:'Sr.',pos:'C, P'},
  {num:2,name:'Cooper Hawkes',year:'Sr.',pos:'INF, P'},
  {num:3,name:'Boston Cook',year:'Jr.',pos:'OF'},
  {num:4,name:'Dillon Morgan',year:'So.',pos:'OF'},
  {num:5,name:'Will Henrie',year:'So.',pos:'1B, P'},
  {num:6,name:'Ryder Smith',year:'Sr.',pos:'OF, P'},
  {num:7,name:'Kohen Lawrence',year:'Jr.',pos:'P, 3B'},
  {num:8,name:'Canyon Clegg',year:'Sr.',pos:'P, 3B'},
  {num:9,name:'Max Martin',year:'So.',pos:'OF'},
  {num:10,name:'Corbin Hardy',year:'Jr.',pos:'P, OF'},
  {num:11,name:'Brigham Louder',year:'Jr.',pos:'C, 1B'},
  {num:12,name:'Andrew Allphin',year:'Sr.',pos:'1B, P'},
  {num:13,name:'Crew Peterson',year:'Jr.',pos:'INF'},
  {num:15,name:'Bronco Blackhurst',year:'So.',pos:'P, OF'},
  {num:14,name:'Cole Riggs',year:'Sr.',pos:'P'},
  {num:16,name:'Mason Palmer',year:'Fr.',pos:'C'},
  {num:17,name:'Shane Eaquinto',year:'Jr.',pos:'OF'},
  {num:18,name:'Eli Story',year:'So.',pos:'INF'},
  {num:20,name:'McKay Newton',year:'So.',pos:'OF'},
  {num:21,name:'Payton Czech',year:'So.',pos:'C, P'},
  {num:22,name:'Graham Hawkins',year:'So.',pos:''},
  {num:23,name:'JJ Clawson',year:'Jr.',pos:'INF'},
  {num:25,name:'Landon Trimmell',year:'Jr.',pos:'INF, P'},
  {num:26,name:'Jace Spencer',year:'So.',pos:'INF, P'},
  {num:27,name:'Austin Schueller',year:'Jr.',pos:'INF'}
];

function renderRoster(app) {
  app.innerHTML = '<section><h2>2026 Team Roster</h2><div class="roster-grid" id="rosterGrid"></div></section>';
  const grid = document.getElementById('rosterGrid');
  rosterData.slice().sort((a, b) => a.num - b.num || a.name.localeCompare(b.name)).forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'roster-card';
    card.style.animationDelay = (i * 0.05) + 's';
    const yearClass = p.year.replace('.','').toLowerCase();
    card.innerHTML =
      '<div class="roster-number">' + p.num + '</div>' +
      '<div class="roster-info">' +
        '<div class="roster-name">' + p.name + '</div>' +
        '<span class="roster-year ' + yearClass + '">' + p.year + '</span>' +
        (p.pos ? '<div class="roster-pos">' + p.pos + '</div>' : '') +
      '</div>';
    grid.appendChild(card);
  });
}

/* ══════════════════════════════════
   ROUTER
   ══════════════════════════════════ */
const routes = { home: renderHome, schedule: renderSchedule, results: renderResults, roster: renderRoster, admin: renderAdmin };

function isStandaloneAdminPage() {
  return !!window.__ADMIN_STANDALONE_PAGE;
}

function navigate() {
  const hash = isStandaloneAdminPage()
    ? 'admin'
    : (location.hash.slice(1) || 'home').toLowerCase();
  const app = document.getElementById('app');
  app.className = 'container';
  app.innerHTML = '';

  document.querySelector('.carousel').style.display = hash === 'home' ? '' : 'none';
  document.getElementById('countdownSection').style.display = hash === 'home' ? '' : 'none';
  document.getElementById('heroSection').style.display = hash === 'home' ? '' : 'none';

  const render = routes[hash] || renderHome;
  render(app);

  // Update active nav link
  document.querySelectorAll('#mainNav a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === '#' + hash);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (hash === 'admin') return;

  // Scroll reveal animations
  requestAnimationFrame(() => {
    document.querySelectorAll('#app section, #app .card, #app .game-card, #app .roster-card, #app .admin-card, .stats-row > *').forEach(el => {
      if (!el.classList.contains('scroll-reveal')) el.classList.add('scroll-reveal');
    });
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('revealed');
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.scroll-reveal').forEach(el => observer.observe(el));
  });
}

window.addEventListener('hashchange', function() {
  if (isStandaloneAdminPage()) {
    if (typeof clearStandaloneAdminHash === 'function') clearStandaloneAdminHash();
    navigate();
    return;
  }
  navigate();
});
document.addEventListener('adminauthchange', () => {
  if (isStandaloneAdminPage() || (location.hash.slice(1) || 'home').toLowerCase() === 'admin') navigate();
});
function v1BootstrapFirebaseAndNavigate() {
  seedDatabase().then(function() {
    return Promise.all([
      fbGet('games'),
      fbGet('results'),
      fbGetOptional('carouselPhotos', null),
      fbGetOptional('opponents', null)
    ]);
  }).then(function(vals) {
    var games = vals[0], results = vals[1], carouselPhotos = vals[2], opponents = vals[3];
    cachedGames = fbToArray(games);
    cachedResults = fbToArray(results);
    cachedCarouselPhotos = carouselPhotos ? fbToArray(carouselPhotos) : null;
    cachedOpponents = normalizeOpponentList(fbToArray(opponents));
    navigate();
  }).catch(function(err) {
    console.error('Firebase load failed:', err);
    navigate();
  });
}

function v1InitApp() {
  if (window.__v1AppInitialized) return;
  window.__v1AppInitialized = true;

  var started = false;
  function startWhenSignedIn() {
    if (started || !firebase.auth().currentUser) return;
    started = true;
    v1BootstrapFirebaseAndNavigate();
  }

  if (firebase.auth().currentUser) {
    startWhenSignedIn();
  }
  firebase.auth().onAuthStateChanged(function() {
    startWhenSignedIn();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', v1InitApp);
} else {
  v1InitApp();
}

// Header weather widget
fetch('https://api.open-meteo.com/v1/forecast?latitude=40.2969&longitude=-111.6946&current=temperature_2m,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FDenver')
  .then(function(r) { return r.json(); })
  .then(function(data) {
    var c = data.current;
    var code = c.weather_code;
    var icon, desc;
    if (code === 0) { icon = '☀️'; desc = 'Clear'; }
    else if (code <= 3) { icon = '⛅'; desc = 'Cloudy'; }
    else if (code <= 48) { icon = '☁️'; desc = 'Overcast'; }
    else if (code <= 57) { icon = '🌧️'; desc = 'Drizzle'; }
    else if (code <= 67) { icon = '🌧️'; desc = 'Rain'; }
    else if (code <= 77) { icon = '❄️'; desc = 'Snow'; }
    else if (code <= 82) { icon = '🌧️'; desc = 'Showers'; }
    else if (code <= 86) { icon = '❄️'; desc = 'Snow'; }
    else { icon = '⛈️'; desc = 'Storms'; }
    var el = document.getElementById('headerWeather');
    if (el) el.innerHTML = '<span class="hw-icon">' + icon + '</span>' +
      '<span class="hw-temp">' + Math.round(c.temperature_2m) + '°</span>' +
      '<span class="hw-desc">' + desc + '</span>' +
      '<span class="hw-loc">Orem, UT</span>';
  }).catch(function() {});
