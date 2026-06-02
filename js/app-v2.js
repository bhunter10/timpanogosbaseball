var v2CachedGames = null;
var v2CachedResults = null;
var v2CachedOpponents = null;
var v2CachedCarouselPhotos = null;
var v2FilmstripRaf = 0;
var v2HomeStoryRaf = 0;
var v2CountdownTimer = null;
var v2RegionTeams = ['Mountain View','Summit Academy','Uintah','Provo','Orem'];
var v2ScheduleTeamLevels = [
  { value: 'varsity', label: 'Varsity' },
  { value: 'jv', label: 'JV' },
  { value: 'sophomore', label: 'Sophomores' }
];
var v2BaseballSeasons = [
  { value: 'spring', label: 'Spring', order: 1 },
  { value: 'summer', label: 'Summer', order: 2 },
  { value: 'fall', label: 'Fall', order: 3 }
];
var v2CarouselPhotoSignature = '';
var v2CarouselPhotoListenerWired = false;
var v2CarouselRefreshStorageKey = 'timpanogosCarouselPhotosUpdatedAt';
var v2LastCarouselRefreshStamp = '';
var v2CountdownSectionEl = null;

function v2GetCountdownSection() {
  if (v2CountdownSectionEl && v2CountdownSectionEl.nodeType === 1) return v2CountdownSectionEl;
  v2CountdownSectionEl = document.getElementById('v2CountdownSection');
  return v2CountdownSectionEl;
}

function v2DefaultCarouselPhotos() {
  var basePath = window.__SITE_BASE_PATH || '';
  return ['/photos/optimized/1.jpg','/photos/optimized/2.jpg','/photos/optimized/3.jpg','/photos/optimized/4.jpg','/photos/optimized/5.jpg','/photos/optimized/6.jpg','/photos/optimized/7.jpg','/photos/optimized/8.jpg','/photos/optimized/9.jpg'].map(function(src, index) {
    src = basePath + src;
    return { src: src, alt: 'Team photo ' + (index + 1), sortOrder: index };
  });
}

function v2NormalizeAssetUrl(src) {
  if (!src) return '';
  if (/^(https?:|data:|blob:|\/\/)/i.test(src)) return src;
  var basePath = window.__SITE_BASE_PATH || '';
  var cleanSrc = String(src).replace(/^\.?\//, '');
  if (cleanSrc.indexOf(basePath.replace(/^\//, '') + '/') === 0) return '/' + cleanSrc;
  return basePath + '/' + cleanSrc;
}

function v2NormalizeCarouselPhoto(photo, index) {
  if (typeof photo === 'string') return { src: v2NormalizeAssetUrl(photo), alt: 'Team photo', sortOrder: index };
  return {
    src: photo && photo.src ? v2NormalizeAssetUrl(photo.src) : '',
    alt: photo && photo.alt ? photo.alt : 'Team photo',
    sortOrder: photo && photo.sortOrder != null ? +photo.sortOrder : index,
    updatedAt: photo && photo.updatedAt ? photo.updatedAt : null
  };
}

function v2GetCarouselPhotos() {
  var photos = (v2CachedCarouselPhotos && v2CachedCarouselPhotos.length ? v2CachedCarouselPhotos : v2DefaultCarouselPhotos())
    .map(v2NormalizeCarouselPhoto)
    .filter(function(photo) { return photo.src; })
    .sort(function(a, b) { return (+a.sortOrder || 0) - (+b.sortOrder || 0); });
  return photos;
}

function v2GetCarouselPhotoSignature(photos) {
  return (photos || []).map(function(photo) {
    return [
      photo && photo.src ? photo.src : '',
      photo && photo.alt ? photo.alt : '',
      photo && photo.sortOrder != null ? photo.sortOrder : '',
      photo && photo.updatedAt != null ? photo.updatedAt : ''
    ].join('|');
  }).join('||');
}

function v2ImageReady(img) {
  if (!img) return Promise.resolve();
  if (img.complete && img.naturalWidth) {
    return img.decode ? img.decode().catch(function() {}) : Promise.resolve();
  }
  return new Promise(function(resolve) {
    img.addEventListener('load', resolve, { once: true });
    img.addEventListener('error', resolve, { once: true });
  }).then(function() {
    return img.decode ? img.decode().catch(function() {}) : undefined;
  });
}

function v2PreloadFilmstripPhotos(photos) {
  if (!photos || !photos.length) return;
  photos.forEach(function(photo) {
    if (!photo || !photo.src) return;
    var img = new Image();
    img.decoding = 'async';
    img.fetchPriority = 'high';
    img.src = photo.src;
    if (img.decode) img.decode().catch(function() {});
  });
}

function v2RenderFilmstripAccents(section) {
  if (!section) return;
  var existing = section.querySelector('.v2-filmstrip-accents');
  if (existing) existing.remove();
  var sticky = section.querySelector('.v2-filmstrip-sticky');

  var layer = document.createElement('div');
  layer.className = 'v2-filmstrip-accents';

  var total = window.innerWidth <= 720 ? 7 : 11;
  var minX = window.innerWidth <= 720 ? 10 : 8;
  var maxX = window.innerWidth <= 720 ? 90 : 92;
  var span = maxX - minX;
  for (var i = 0; i < total; i++) {
    var accent = document.createElement('span');
    var topSide = i % 2 === 0;
    var size = 22 + Math.round(Math.random() * 34);
    var slot = total === 1 ? 0 : i / (total - 1);
    var horizontal = minX + slot * span + (Math.random() * 6 - 3);
    var drift = (Math.random() * 24 - 12).toFixed(1);
    var rotate = (Math.random() * 28 - 14).toFixed(1);
    var delay = (Math.random() * 1.1).toFixed(2);
    var duration = (1.8 + Math.random() * 1.8).toFixed(2);

    accent.className = 'v2-filmstrip-accent' + (topSide ? ' is-top' : ' is-bottom');
    accent.style.width = size + 'px';
    accent.style.height = size + 'px';
    accent.style.left = Math.max(minX, Math.min(maxX, horizontal)).toFixed(2) + '%';
    accent.style.setProperty('--v2-accent-scale', (0.88 + Math.random() * 0.52).toFixed(2));
    accent.style.setProperty('--v2-accent-drift', drift + 'px');
    accent.style.setProperty('--v2-accent-rotate', rotate + 'deg');
    accent.style.setProperty('--v2-accent-y', (18 + Math.round(Math.random() * 46)) + 'px');
    accent.style.setProperty('--v2-accent-delay', delay + 's');
    accent.style.setProperty('--v2-accent-duration', duration + 's');
    accent.innerHTML = '<img src="' + (window.__SITE_BASE_PATH || '') + '/images/logo-twolves-basesball-diamond.png" alt="" aria-hidden="true" loading="lazy" decoding="async">';
    layer.appendChild(accent);
  }

  (sticky || section).appendChild(layer);
}

function v2WireHeroVideo() {
  var video = document.querySelector('.v2-hero-video');
  if (!video || video._v2Wired) return;
  video._v2Wired = true;

  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');

  function tryPlay() {
    var attempt = video.play && video.play();
    if (attempt && typeof attempt.catch === 'function') {
      attempt.catch(function() {});
    }
  }

  if (video.readyState >= 2) {
    tryPlay();
  } else {
    video.addEventListener('loadeddata', tryPlay, { once: true });
    video.addEventListener('canplay', tryPlay, { once: true });
  }

  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) tryPlay();
  });

  ['touchstart', 'pointerdown', 'click'].forEach(function(eventName) {
    window.addEventListener(eventName, tryPlay, { passive: true, once: true });
  });
}

function v2FormatDate(iso, opts) {
  var parts = (iso || '').split('-');
  if (parts.length !== 3) return iso;
  var date = new Date(parts[0], parts[1] - 1, parts[2]);
  if (isNaN(date)) return iso;
  return date.toLocaleDateString(undefined, opts || { month: 'short', day: 'numeric', year: 'numeric' });
}

function v2GetScheduleTeamLevel(value) {
  value = String(value || '').trim().toLowerCase();
  return v2ScheduleTeamLevels.some(function(level) { return level.value === value; }) ? value : 'varsity';
}

function v2GetScheduleTeamLabel(value) {
  var teamLevel = v2GetScheduleTeamLevel(value);
  var match = v2ScheduleTeamLevels.find(function(level) { return level.value === teamLevel; });
  return match ? match.label : 'Varsity';
}

function v2GetDateParts(iso) {
  var parts = String(iso || '').split('-').map(function(part) { return +part; });
  if (parts.length !== 3 || parts.some(function(part) { return !Number.isFinite(part); })) return null;
  return { year: parts[0], month: parts[1], day: parts[2] };
}

function v2GetBaseballSeason(value, date) {
  value = String(value || '').trim().toLowerCase();
  var parts = v2GetDateParts(date);
  if (parts) {
    if (parts.month >= 6 && parts.month <= 8) return 'summer';
    if (parts.month >= 9 && parts.month <= 11) return 'fall';
    return 'spring';
  }
  if (v2BaseballSeasons.some(function(season) { return season.value === value; })) return value;
  return 'spring';
}

function v2GetSeasonOrder(season) {
  var match = v2BaseballSeasons.find(function(item) { return item.value === season; });
  return match ? match.order : 1;
}

function v2GetSeasonLabel(season, date) {
  var parts = v2GetDateParts(date);
  var match = v2BaseballSeasons.find(function(item) { return item.value === season; });
  return (match ? match.label : 'Spring') + (parts ? ' ' + parts.year : '');
}

function v2GetSeasonGroupKey(item) {
  var season = v2GetBaseballSeason(item && item.season, item && item.date);
  var parts = v2GetDateParts(item && item.date);
  var year = parts ? parts.year : (item && Number.isFinite(+item.year) ? +item.year : null);
  return season + '-' + (year != null ? year : 'unknown');
}

function v2GetSelectedScheduleTeam() {
  var params = new URLSearchParams(window.location.search || '');
  return v2GetScheduleTeamLevel(params.get('team') || 'varsity');
}

function v2GetSelectedScheduleSeasonKey() {
  var params = new URLSearchParams(window.location.search || '');
  return (params.get('season') || '').trim();
}

function v2GetOrderedSeasonGroupsFromGames(games) {
  var groups = {};
  (games || []).forEach(function(game) {
    var season = v2GetBaseballSeason(game.season, game.date);
    var year = (v2GetDateParts(game.date) || {}).year || 0;
    var key = season + '-' + year;
    if (!groups[key]) {
      groups[key] = {
        season: season,
        year: year,
        latest: 0
      };
    }
    groups[key].latest = Math.max(groups[key].latest, v2GameDateTimeValue(game) || 0);
  });
  return Object.keys(groups).map(function(key) { return groups[key]; }).sort(function(a, b) {
    if (a.latest !== b.latest) return b.latest - a.latest;
    if (a.year !== b.year) return b.year - a.year;
    return v2GetSeasonOrder(b.season) - v2GetSeasonOrder(a.season);
  });
}

function v2ResolveSelectedSeasonKey(games) {
  var selectedKey = v2GetSelectedScheduleSeasonKey();
  var groups = v2GetOrderedSeasonGroupsFromGames(games);
  if (!groups.length) return selectedKey || '';
  if (groups.some(function(group) { return v2GetSeasonGroupKey(group) === selectedKey; })) return selectedKey;
  return v2GetSeasonGroupKey(groups[0]);
}

function v2NormalizeOpponent(opponent, index) {
  return {
    _key: opponent && opponent._key != null ? opponent._key : String(index),
    schoolName: opponent && opponent.schoolName ? opponent.schoolName : '',
    shortName: opponent && opponent.shortName ? opponent.shortName : '',
    mascot: opponent && opponent.mascot ? opponent.mascot : '',
    address: opponent && opponent.address ? opponent.address : '',
    logoUrl: opponent && opponent.logoUrl ? opponent.logoUrl : ''
  };
}

function v2FindOpponent(opponentId, opponents) {
  if (!opponentId) return null;
  return (opponents || []).find(function(opponent) {
    return opponent && opponent._key === opponentId;
  }) || null;
}

function v2EnrichGameWithOpponent(game, opponents) {
  var enriched = Object.assign({}, game);
  enriched.teamLevel = v2GetScheduleTeamLevel(enriched.teamLevel);
  enriched.season = v2GetBaseballSeason(enriched.season, enriched.date);
  var opponent = v2FindOpponent(enriched.opponentId, opponents);
  if (opponent) {
    enriched.opponent = opponent.shortName || opponent.schoolName || enriched.opponent;
    enriched.opponentMascot = opponent.mascot || '';
    enriched.opponentLogoUrl = opponent.logoUrl || '';
    enriched.locationAddress = enriched.locationAddress || opponent.address || '';
  }
  return enriched;
}

function v2EnrichGamesWithOpponents(games, opponents) {
  return (games || []).map(function(game) {
    return v2EnrichGameWithOpponent(game, opponents || []);
  });
}

function v2EnrichResultsWithOpponents(results, opponents) {
  return (results || []).map(function(result) {
    return v2EnrichGameWithOpponent(result, opponents || []);
  });
}

function v2HasContestIdentity(entry) {
  return !!(entry && entry.date && (entry.opponent || entry.opponentId));
}

var v2RosterData = [
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
  {num:14,name:'Cole Riggs',year:'Sr.',pos:'P'},
  {num:15,name:'Bronco Blackhurst',year:'So.',pos:'P, OF'},
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

function v2RenderNextGamePanel(games) {
  var titleEl = document.getElementById('nextGameTitle');
  var metaEl = document.getElementById('nextGameMeta');
  if (!titleEl || !metaEl) return;

  var futureGames = games.slice().filter(function(game) {
    return v2GameDateTimeValue(game) >= Date.now();
  }).sort(function(a, b) {
    return v2GameDateTimeValue(a) - v2GameDateTimeValue(b);
  });
  var next = futureGames[0];
  titleEl.textContent = next ? next.opponent : 'Season Complete';
  metaEl.textContent = next
    ? v2FormatDate(next.date) + ' | ' + next.location + ' | ' + next.time
    : '';
}

function v2GetGamesForSelectedTeam(games) {
  var selectedTeam = v2GetSelectedScheduleTeam();
  return (games || []).filter(function(game) {
    return v2GetScheduleTeamLevel(game.teamLevel) === selectedTeam;
  });
}

function v2RenderSummary(games, results) {
  v2RenderNextGamePanel(games);

  var recentList = document.getElementById('recentResultsList');
  if (!recentList) return;
  var recent = results.slice().sort(function(a, b) {
    return new Date(b.date) - new Date(a.date);
  }).slice(0, 3);
  recentList.innerHTML = recent.map(function(result) {
    var outcome = result.ourScore > result.theirScore ? 'W' : (result.ourScore < result.theirScore ? 'L' : 'T');
    return '<div class="v2-stack-item">' +
      '<div><strong>' + result.opponent + '</strong><div class="v2-stack-meta">' + v2FormatDate(result.date, { month: 'short', day: 'numeric' }) + '</div></div>' +
      '<div><strong>' + outcome + ' ' + result.ourScore + '-' + result.theirScore + '</strong></div>' +
    '</div>';
  }).join('');
}

function v2RenderFilmstrip(photos) {
  var section = document.getElementById('v2Filmstrip');
  var track = document.getElementById('v2FilmstripTrack');
  if (!section || !track) return;
  v2CarouselPhotoSignature = v2GetCarouselPhotoSignature(photos);
  if (!photos.length) {
    section.style.display = 'none';
    return;
  }

  section.style.display = '';
  v2PreloadFilmstripPhotos(photos);
  v2RenderFilmstripAccents(section);
  track.innerHTML = photos.map(function(photo, index) {
    return '<figure class="v2-filmstrip-frame">' +
      '<img src="' + photo.src + '" alt="' + (photo.alt || ('Team photo ' + (index + 1))) + '" width="565" height="374" loading="lazy" decoding="async">' +
      '<figcaption>' + (photo.alt || 'Team photo') + '</figcaption>' +
    '</figure>';
  }).join('');

  v2WireFilmstripScroll();
  var images = Array.prototype.slice.call(track.querySelectorAll('img'));
  Promise.all(images.slice(0, Math.min(4, images.length)).map(v2ImageReady)).then(function() {
    v2SyncFilmstrip();
  });
  images.slice(4).forEach(function(img) {
    if (img.complete) return;
    img.addEventListener('load', v2SyncFilmstrip, { once: true });
    img.addEventListener('error', v2SyncFilmstrip, { once: true });
  });
}

function v2SyncFilmstrip() {
  var section = document.getElementById('v2Filmstrip');
  var sticky = section && section.querySelector('.v2-filmstrip-sticky');
  var chrome = section && section.querySelector('.v2-filmstrip-chrome');
  var track = document.getElementById('v2FilmstripTrack');
  if (!section || !sticky || !chrome || !track) return;

  var viewportWidth = chrome.clientWidth || window.innerWidth || document.documentElement.clientWidth || sticky.clientWidth;
  var scrollDistance = Math.max(0, track.scrollWidth - viewportWidth);
  var stripHeight = chrome.clientHeight || sticky.clientHeight || 374;
  var viewportHeight = window.innerHeight || document.documentElement.clientHeight || stripHeight;
  var centerOffset = Math.max(0, Math.round((viewportHeight - stripHeight) / 2));
  var sectionTop = section.offsetTop;
  var start = sectionTop - centerOffset;
  var end = start + scrollDistance;

  if (!scrollDistance) {
    section.style.height = stripHeight + 'px';
    section.classList.remove('is-pinned', 'is-complete');
    track.style.transform = 'translate3d(0,0,0)';
    return;
  }

  section.style.height = Math.ceil(stripHeight + scrollDistance) + 'px';
  var scrollY = window.scrollY || window.pageYOffset || 0;
  var progress = Math.max(0, Math.min(scrollDistance, scrollY - start));

  if (scrollY <= start) {
    section.classList.remove('is-pinned', 'is-complete');
  } else if (scrollY >= end) {
    section.classList.remove('is-pinned');
    section.classList.add('is-complete');
  } else {
    section.classList.remove('is-complete');
    section.classList.add('is-pinned');
  }

  track.style.transform = 'translate3d(' + (-progress) + 'px,0,0)';
}

function v2QueueFilmstripSync() {
  if (v2FilmstripRaf) return;
  v2FilmstripRaf = requestAnimationFrame(function() {
    v2FilmstripRaf = 0;
    v2SyncFilmstrip();
  });
}

function v2WireFilmstripScroll() {
  var section = document.getElementById('v2Filmstrip');
  if (!section || section._filmstripWired) {
    v2QueueFilmstripSync();
    return;
  }
  section._filmstripWired = true;

  window.addEventListener('scroll', v2QueueFilmstripSync, { passive: true });
  window.addEventListener('resize', v2QueueFilmstripSync);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', v2QueueFilmstripSync);
  }
  v2QueueFilmstripSync();
}

function v2UpdateFilmstripFromSnapshot(snapshotValue) {
  v2CachedCarouselPhotos = fbToArray(snapshotValue);
  var photos = v2GetCarouselPhotos();
  var signature = v2GetCarouselPhotoSignature(photos);
  if (signature === v2CarouselPhotoSignature) return;
  v2RenderFilmstrip(photos);
}

function v2FetchLatestCarouselPhotos() {
  if (typeof fbGet !== 'function') return Promise.resolve();
  return fbGet('carouselPhotos').then(function(value) {
    v2UpdateFilmstripFromSnapshot(value);
  }).catch(function(error) {
    console.error('Carousel photo refresh failed:', error);
  });
}

function v2HandleCarouselRefreshStamp(stamp) {
  if (stamp == null) return;
  var nextStamp = String(stamp);
  if (nextStamp === v2LastCarouselRefreshStamp) return;
  v2LastCarouselRefreshStamp = nextStamp;
  v2FetchLatestCarouselPhotos();
}

var v2ScheduleDataListenerWired = false;

function v2RefreshSiteFromCache() {
  if (!window.__v2Booted) return;
  var games = v2GetScheduleGames();
  var selectedTeamGames = v2GetGamesForSelectedTeam(games);
  var results = v2NormalizeFirebaseResults(v2CachedResults || []);
  v2RenderSummary(selectedTeamGames.length ? selectedTeamGames : games, results);
  v2RenderSchedule(games, results);
  v2WireCalendarSyncLinks();
}

function v2RefreshScheduleFromCache() {
  if (!window.__v2Booted) return;
  var games = v2GetScheduleGames();
  var results = v2NormalizeFirebaseResults(v2CachedResults || []);
  v2RenderSchedule(games, results);
}

function v2WireScheduleDataListener() {
  if (v2ScheduleDataListenerWired || typeof db === 'undefined' || !db.ref) return;
  v2ScheduleDataListenerWired = true;

  db.ref('results').on('value', function(snapshot) {
    v2CachedResults = fbToArray(snapshot.val());
    v2RefreshSiteFromCache();
  }, function(error) {
    console.error('Results refresh failed:', error);
  });

  db.ref('games').on('value', function(snapshot) {
    v2CachedGames = fbToArray(snapshot.val());
    v2RefreshSiteFromCache();
  }, function(error) {
    console.error('Games refresh failed:', error);
  });

  db.ref('opponents').on('value', function(snapshot) {
    v2CachedOpponents = fbToArray(snapshot.val()).map(v2NormalizeOpponent);
    v2RefreshSiteFromCache();
  }, function(error) {
    console.error('Opponents refresh failed:', error);
  });
}

function v2WireCarouselPhotoListener() {
  if (v2CarouselPhotoListenerWired || typeof db === 'undefined' || !db.ref) return;
  v2CarouselPhotoListenerWired = true;

  db.ref('carouselPhotos').on('value', function(snapshot) {
    v2UpdateFilmstripFromSnapshot(snapshot.val());
  }, function(error) {
    console.error('Carousel photo updates failed:', error);
  });

  window.addEventListener('storage', function(event) {
    if (event.key !== v2CarouselRefreshStorageKey) return;
    v2HandleCarouselRefreshStamp(event.newValue);
  });
}

function v2FbGetOptional(path, fallback) {
  if (typeof fbGet !== 'function') return Promise.resolve(fallback);
  return fbGet(path).catch(function(err) {
    var message = err && (err.message || err.code) ? (err.message || err.code) : '';
    if (String(message).indexOf('permission_denied') === -1) {
      console.warn('Optional Firebase path failed:', path, message || err);
    }
    return fallback;
  });
}

function v2RenderCountdown(games, teamLevel) {
  var section = v2GetCountdownSection();
  var labelEl = section ? section.querySelector('.v2-countdown-label') : null;
  var tickEl = section ? section.querySelector('#v2TickClock') : null;
  if (!section || !labelEl || !tickEl) return;

  if (v2CountdownTimer) {
    clearInterval(v2CountdownTimer);
    v2CountdownTimer = null;
  }

  section.style.display = 'none';
  section.classList.remove('playoff-countdown');
  var teamLabel = v2GetScheduleTeamLabel(teamLevel || v2GetSelectedScheduleTeam());
  labelEl.textContent = 'Next ' + teamLabel + ' game in';

  var futureGames = games.slice().filter(function(game) {
    return v2GameDateTimeValue(game) >= Date.now();
  }).sort(function(a, b) {
    return v2GameDateTimeValue(a) - v2GameDateTimeValue(b);
  });
  var next = futureGames[0];

  if (!next) return;

  section.style.display = '';
  if (next.playoff) section.classList.add('playoff-countdown');

  if (!tickEl._tickInit && typeof Tick !== 'undefined') {
    tickEl._tickInit = true;
    setTimeout(function() {
      Tick.DOM.create(tickEl, {
        didInit: function(tick) {
          tickEl._v2Tick = tick;
          v2UpdateCountdownTick(tickEl, next, games);
        }
      });
    }, 0);
  }

  v2UpdateCountdownTick(tickEl, next, games);
  v2CountdownTimer = setInterval(function() {
    v2UpdateCountdownTick(tickEl, next, games);
  }, 1000);
}

function v2NormalizeResultOpponent(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function v2OpponentsExactMatch(a, b) {
  if (!a || !b) return false;
  if (a.opponentId && b.opponentId && a.opponentId === b.opponentId) return true;
  var aName = v2NormalizeResultOpponent(a.opponent);
  var bName = v2NormalizeResultOpponent(b.opponent);
  return !!(aName && bName && aName === bName);
}

function v2ResultsMatchOpponent(a, b) {
  if (!a || !b) return false;
  if (v2OpponentsExactMatch(a, b)) return true;
  var aName = v2NormalizeResultOpponent(a.opponent);
  var bName = v2NormalizeResultOpponent(b.opponent);
  if (aName && bName) {
    var shorter = aName.length <= bName.length ? aName : bName;
    var longer = aName.length > bName.length ? aName : bName;
    if (longer === shorter || longer.indexOf(shorter + ' ') === 0) return true;
  }
  return String(a.opponent || '') === String(b.opponent || '');
}

function v2ResultHasScore(result) {
  return result && result.ourScore != null && result.theirScore != null &&
    String(result.ourScore) !== '' && String(result.theirScore) !== '';
}

function v2ResultIsPreferred(candidate, current) {
  if (!current) return true;
  if (!candidate) return false;
  var candidateScored = v2ResultHasScore(candidate);
  var currentScored = v2ResultHasScore(current);
  if (candidateScored && !currentScored) return true;
  if (currentScored && !candidateScored) return false;
  if (candidate._key && !current._key) return true;
  if (current._key && !candidate._key) return false;
  return false;
}

function v2DedupeContestResults(results) {
  var deduped = [];
  (results || []).forEach(function(result) {
    if (!v2HasContestIdentity(result)) return;
    var existingIndex = deduped.findIndex(function(entry) {
      return v2ResultsSameContest(entry, result);
    });
    if (existingIndex < 0) {
      deduped.push(result);
      return;
    }
    if (v2ResultIsPreferred(result, deduped[existingIndex])) {
      deduped[existingIndex] = result;
    }
  });
  return deduped;
}

function v2GamesAreDuplicate(a, b) {
  if (!a || !b || a.date !== b.date) return false;
  if (v2GetScheduleTeamLevel(a.teamLevel) !== v2GetScheduleTeamLevel(b.teamLevel)) return false;
  if (v2GetBaseballSeason(a.season, a.date) !== v2GetBaseballSeason(b.season, b.date)) return false;
  if (!v2OpponentsExactMatch(a, b)) return false;
  return !a.time || !b.time || a.time === b.time;
}

function v2DedupeContestGames(games) {
  var deduped = [];
  (games || []).forEach(function(game) {
    if (!v2HasContestIdentity(game)) return;
    var existingIndex = deduped.findIndex(function(entry) {
      return v2GamesAreDuplicate(entry, game);
    });
    if (existingIndex < 0) {
      deduped.push(game);
      return;
    }
    if (v2ResultIsPreferred(game, deduped[existingIndex])) {
      deduped[existingIndex] = game;
    }
  });
  return deduped;
}

function v2GetScheduleGames() {
  return v2DedupeContestGames(v2EnrichGamesWithOpponents(v2CachedGames || [], v2CachedOpponents || []));
}

function v2NormalizeFirebaseResults(results) {
  return v2DedupeContestResults(v2EnrichResultsWithOpponents(results, v2CachedOpponents || []))
    .filter(v2ResultHasScore);
}

function v2ResultsSameContest(a, b) {
  if (!a || !b || a.date !== b.date) return false;
  if (v2GetScheduleTeamLevel(a.teamLevel) !== v2GetScheduleTeamLevel(b.teamLevel)) return false;
  if (v2GetBaseballSeason(a.season, a.date) !== v2GetBaseballSeason(b.season, b.date)) return false;
  if (!v2ResultsMatchOpponent(a, b)) return false;
  return !a.time || !b.time || a.time === b.time;
}

function v2FindResultForGame(game, results, usedIndexes) {
  var candidates = [];
  (results || []).forEach(function(entry, index) {
    if (usedIndexes.indexOf(index) !== -1) return;
    if (!v2ResultHasScore(entry)) return;
    if (!v2ResultsSameContest(entry, game)) return;
    var timeMatch = !entry.time || !game.time || entry.time === game.time;
    candidates.push({ entry: entry, index: index, timeMatch: timeMatch });
  });
  var best = candidates.find(function(match) { return match.timeMatch; });
  if (best) return best;
  if (candidates.length === 1) return candidates[0];
  return null;
}

function v2UpdateCountdownTick(tickEl, next, games) {
  var remaining = v2GameDateTimeValue(next) - Date.now();
  if (remaining <= 0) {
    v2RenderNextGamePanel(games);
    setTimeout(function() {
      v2RenderCountdown(games, v2GetSelectedScheduleTeam());
    }, 250);
    return;
  }

  if (!tickEl._v2Tick) return;

  var totalSeconds = Math.floor(remaining / 1000);
  var days = Math.floor(totalSeconds / 86400);
  totalSeconds -= days * 86400;
  var hours = Math.floor(totalSeconds / 3600);
  totalSeconds -= hours * 3600;
  var minutes = Math.floor(totalSeconds / 60);
  var seconds = totalSeconds - minutes * 60;
  tickEl._v2Tick.value = [days, hours, minutes, seconds];
}

function v2RenderSchedule(games, results) {
  var staticHeader = document.querySelector('#schedule > .v2-shell > .v2-results-header');
  var groupsContainer = document.querySelector('#schedule .v2-schedule-groups');
  if (!groupsContainer) return;

  var selectedTeam = v2GetSelectedScheduleTeam();
  var seasonGames = v2BuildSeasonGames(games, results);

  if (staticHeader) staticHeader.style.display = 'none';

  groupsContainer.innerHTML = v2BuildScheduleSeasonSections(seasonGames, results, selectedTeam);
  v2ApplyStagger('#schedule', '.v2-game-card', 80);
  v2RestartAnimations('#schedule');
}

function v2PlaceCountdownBelowScheduleTabs() {
  var section = v2GetCountdownSection();
  var controls = document.querySelector('#schedule .v2-schedule-controls');
  if (!section || !controls) return;
  section.classList.add('is-embedded');
  section.classList.add('v2-visible');
  controls.appendChild(section);
}

function v2BuildScheduleSeasonSections(allSeasonGames, results, selectedTeam) {
  var groups = {};
  allSeasonGames.forEach(function(game) {
    game.season = v2GetBaseballSeason(game.season, game.date);
    var key = v2GetSeasonGroupKey(game);
    if (!groups[key]) {
      groups[key] = {
        label: v2GetSeasonLabel(game.season, game.date),
        season: game.season,
        year: (v2GetDateParts(game.date) || {}).year || 0,
        latest: 0,
        games: []
      };
    }
    groups[key].games.push(game);
    groups[key].latest = Math.max(groups[key].latest, v2GameDateTimeValue(game) || 0);
  });

  var orderedGroups = Object.keys(groups).map(function(key) { return groups[key]; }).sort(function(a, b) {
    if (a.latest !== b.latest) return b.latest - a.latest;
    if (a.year !== b.year) return b.year - a.year;
    return v2GetSeasonOrder(b.season) - v2GetSeasonOrder(a.season);
  });

  if (!orderedGroups.length) {
    return '<section class="v2-schedule-block"><div class="v2-schedule-label">Schedule Coming Soon</div></section>';
  }

  var selectedSeasonKey = v2GetSelectedScheduleSeasonKey();
  var group = orderedGroups.find(function(entry) { return v2GetSeasonGroupKey(entry) === selectedSeasonKey; }) || orderedGroups[0];
  var resolvedSeasonKey = v2GetSeasonGroupKey(group);
  var counts = {};
  group.games.forEach(function(game) {
    var level = v2GetScheduleTeamLevel(game.teamLevel);
    counts[level] = (counts[level] || 0) + 1;
  });
  var seasonTeam = counts[selectedTeam]
    ? selectedTeam
    : (v2ScheduleTeamLevels.find(function(level) { return counts[level.value]; }) || {}).value || selectedTeam;
  var teamGames = group.games.filter(function(game) {
    return v2GetScheduleTeamLevel(game.teamLevel) === seasonTeam;
  });
  var groupResults = results.filter(function(result) {
    return v2GetScheduleTeamLevel(result.teamLevel) === seasonTeam &&
      v2GetBaseballSeason(result.season, result.date) === group.season &&
      ((v2GetDateParts(result.date) || {}).year || 0) === group.year;
  }).map(function(result) {
    return Object.assign({}, result, { season: v2GetBaseballSeason(result.season, result.date) });
  });
  var usedResults = [];
  var isSpringSeason = group.season === 'spring';
  var regularSeasonGames = teamGames.filter(function(game) { return !game.playoff; });
  var regularSeasonMarkup = isSpringSeason
    ? (
      v2BuildScheduleSubgroup('Region Games', regularSeasonGames.filter(function(game) { return v2RegionTeams.indexOf(game.opponent) !== -1; }), groupResults, usedResults, v2NewestGameFirst) +
      v2BuildScheduleSubgroup('Non-Region Games', regularSeasonGames.filter(function(game) { return v2RegionTeams.indexOf(game.opponent) === -1; }), groupResults, usedResults, v2NewestGameFirst)
    )
    : v2BuildScheduleSubgroup('Games', regularSeasonGames, groupResults, usedResults, v2NewestGameFirst);
  return '<section class="v2-schedule-season">' +
    v2BuildSeasonScheduleHeader(group, groupResults, group.games, seasonTeam, orderedGroups, resolvedSeasonKey) +
    v2BuildSeasonSummaryCards(teamGames, groupResults) +
    v2BuildScheduleSubgroup('State Playoff Games', teamGames.filter(function(game) { return !!game.playoff; }), groupResults, usedResults, v2NewestGameFirst) +
    regularSeasonMarkup +
  '</section>';
}

function v2BuildSeasonScheduleHeader(group, results, allGames, selectedTeam, allGroups, selectedSeasonKey) {
  var wins = v2CountWins(results);
  var losses = v2CountLosses(results);
  return '<div class="v2-results-header v2-season-results-header">' +
    '<div class="v2-section-heading">' +
      '<p class="v2-kicker">Schedule and Results</p>' +
      '<div class="v2-heading-row">' +
        '<h2>' + group.year + ' ' + v2EscapeHtml(v2GetSeasonName(group.season)) + ' Season</h2>' +
        '<div class="v2-heading-record">' +
          '<span class="v2-heading-record-label">Record</span>' +
          '<span class="v2-heading-record-value">' + wins + '-' + losses + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="v2-schedule-controls">' +
        '<div class="v2-schedule-controls-top">' +
          v2BuildSeasonSelect(allGroups, selectedSeasonKey, selectedTeam) +
          '<div class="v2-calendar-sync" aria-label="Sync schedule calendar">' +
            '<div>' +
              '<span class="v2-calendar-sync-label">Sync Calendar</span>' +
              '<p>Subscribe once and get the baseball schedule on your phone each season.</p>' +
            '</div>' +
            '<div class="v2-calendar-sync-actions">' +
              '<a class="v2-calendar-sync-link v2-calendar-sync-link-apple" href="/api/schedule.ics">Apple</a>' +
              '<a class="v2-calendar-sync-link v2-calendar-sync-link-google" href="/api/schedule.ics" target="_blank" rel="noopener">Android</a>' +
              '<a class="v2-calendar-sync-link v2-calendar-sync-link-muted" href="/api/schedule.ics" download="timpanogos-baseball-schedule.ics">ICS</a>' +
            '</div>' +
          '</div>' +
        '</div>' +
        v2BuildSeasonTeamTabs(group, allGames, selectedTeam, selectedSeasonKey) +
      '</div>' +
    '</div>' +
  '</div>';
}

function v2GetSeasonName(season) {
  var match = v2BaseballSeasons.find(function(item) { return item.value === season; });
  return match ? match.label : 'Spring';
}

function v2BuildSeasonSelect(allGroups, selectedSeasonKey, selectedTeam) {
  var groups = allGroups || [];
  if (groups.length < 2) return '';
  return '<label class="v2-season-picker-label">Season ' +
    '<select class="v2-season-picker" onchange="window.location.href=this.value">' +
      groups.map(function(group) {
        var key = v2GetSeasonGroupKey(group);
        var url = new URL(window.location.href);
        url.searchParams.set('season', key);
        if (selectedTeam === 'varsity') url.searchParams.delete('team');
        else url.searchParams.set('team', selectedTeam);
        return '<option value="' + v2EscapeHtml(url.pathname + url.search) + '"' + (key === selectedSeasonKey ? ' selected' : '') + '>' +
          v2EscapeHtml(group.year + ' ' + v2GetSeasonName(group.season)) +
        '</option>';
      }).join('') +
    '</select>' +
  '</label>';
}

function v2BuildSeasonTeamTabs(group, seasonGames, selectedTeam, selectedSeasonKey) {
  var counts = {};
  (seasonGames || []).forEach(function(game) {
    var level = v2GetScheduleTeamLevel(game.teamLevel);
    counts[level] = (counts[level] || 0) + 1;
  });
  var activeLevels = v2ScheduleTeamLevels.filter(function(level) {
    return counts[level.value];
  });
  if (!activeLevels.length) return '';
  return '<div class="v2-schedule-tabs" aria-label="Schedule team">' + activeLevels.map(function(level) {
    var url = new URL(window.location.href);
    if (selectedSeasonKey) url.searchParams.set('season', selectedSeasonKey);
    else url.searchParams.delete('season');
    if (level.value === 'varsity') url.searchParams.delete('team');
    else url.searchParams.set('team', level.value);
    return '<a href="' + v2EscapeHtml(url.pathname + url.search) + '" class="v2-schedule-tab' + (level.value === selectedTeam ? ' active' : '') + '">' +
      v2EscapeHtml(level.label) +
    '</a>';
  }).join('') + '</div>';
}

function v2BuildSeasonSummaryCards(games, results) {
  var futureGames = games.slice().filter(function(game) {
    return v2GameDateTimeValue(game) >= Date.now();
  }).sort(v2OldestGameFirst);
  var next = futureGames[0];

  var nextCard = next
    ? '<h3>' + v2EscapeHtml(next.opponent || 'Opponent TBD') + '</h3><p>' + v2EscapeHtml(v2FormatDate(next.date, { weekday: 'short', month: 'long', day: 'numeric' })) + (next.time ? ' @ ' + v2EscapeHtml(next.time) : '') + '</p><p class="v2-panel-note">' + v2EscapeHtml(next.location || '') + '</p>'
    : '<h3>Season Complete</h3>';

  return '<div class="v2-season-summary-grid">' +
    '<article class="v2-panel v2-panel-highlight"><p class="v2-panel-label">Next Game</p>' + nextCard + '</article>' +
  '</div>';
}

function v2BuildScheduleSubgroup(label, games, results, usedResults, sorter) {
  if (!games.length) return '';
  return '<section class="v2-schedule-block">' +
    '<div class="v2-schedule-label">' + v2EscapeHtml(label) + '</div>' +
    '<div class="v2-schedule-grid">' +
      games.sort(sorter || v2NewestGameFirst).map(function(game) {
        var match = v2FindResultForGame(game, results, usedResults);
        if (match) usedResults.push(match.index);
        return v2BuildGameCard(game, match ? match.entry : null);
      }).join('') +
    '</div>' +
  '</section>';
}

function v2RenderScheduleTeamTabs(games, selectedTeam) {
  var section = document.getElementById('schedule');
  if (!section) return;
  var existing = document.getElementById('v2ScheduleTeamTabs');
  if (existing) existing.remove();
  var counts = {};
  games.forEach(function(game) {
    var level = v2GetScheduleTeamLevel(game.teamLevel);
    counts[level] = (counts[level] || 0) + 1;
  });
  var activeLevels = v2ScheduleTeamLevels.filter(function(level) {
    return counts[level.value];
  });
  if (!activeLevels.length) return;
  var tabs = document.createElement('div');
  tabs.className = 'v2-schedule-tabs';
  tabs.id = 'v2ScheduleTeamTabs';
  tabs.setAttribute('aria-label', 'Schedule team');
  activeLevels.forEach(function(level) {
    var link = document.createElement('a');
    var url = new URL(window.location.href);
    if (level.value === 'varsity') url.searchParams.delete('team');
    else url.searchParams.set('team', level.value);
    link.href = url.pathname + url.search;
    link.className = 'v2-schedule-tab' + (level.value === selectedTeam ? ' active' : '');
    link.textContent = level.label;
    tabs.appendChild(link);
  });
  var heading = section.querySelector('.v2-section-heading');
  if (heading) heading.appendChild(tabs);
}

function v2BuildSeasonGames(games, results) {
  var mergedGames = v2DedupeContestGames(games.slice());
  mergedGames.forEach(function(game) {
    game.season = v2GetBaseballSeason(game.season, game.date);
  });

  (results || []).forEach(function(result) {
    if (!v2HasContestIdentity(result)) return;
    if (mergedGames.some(function(game) {
      return result.date === game.date &&
        v2GetScheduleTeamLevel(result.teamLevel) === v2GetScheduleTeamLevel(game.teamLevel) &&
        v2GetBaseballSeason(result.season, result.date) === v2GetBaseballSeason(game.season, game.date) &&
        v2ResultsMatchOpponent(result, game);
    })) return;
    mergedGames.push({
      date: result.date,
      opponent: result.opponent,
      opponentId: result.opponentId || '',
      teamLevel: v2GetScheduleTeamLevel(result.teamLevel),
      season: v2GetBaseballSeason(result.season, result.date),
      location: result.location || 'Final',
      time: result.time || '',
      playoff: !!result.playoff
    });
  });

  return mergedGames;
}

function v2GameDateTimeValue(game) {
  var dateValue = game && game.date ? game.date : '';
  var timeValue = game && game.time ? game.time : '';
  var dateParts = dateValue.split('-').map(function(part) { return +part; });
  if (dateParts.length === 3 && dateParts.every(function(part) { return Number.isFinite(part); })) {
    var timeParts = timeValue.match(/(\d+):(\d+)\s*(AM|PM)/i);
    var h = timeParts ? +timeParts[1] : 15;
    var m = timeParts ? +timeParts[2] : 30;
    if (timeParts && timeParts[3].toUpperCase() === 'PM' && h !== 12) h += 12;
    if (timeParts && timeParts[3].toUpperCase() === 'AM' && h === 12) h = 0;
    return new Date(dateParts[0], dateParts[1] - 1, dateParts[2], h, m).getTime();
  }

  var parsed = new Date((dateValue + ' ' + timeValue).trim()).getTime();
  return Number.isFinite(parsed) ? parsed : new Date(dateValue).getTime();
}

function v2NewestGameFirst(a, b) {
  return v2GameDateTimeValue(b) - v2GameDateTimeValue(a);
}

function v2OldestGameFirst(a, b) {
  return v2GameDateTimeValue(a) - v2GameDateTimeValue(b);
}

function v2BuildGameCard(game, result) {
  var card = '<article class="v2-game-card' + (game.playoff ? ' playoff' : '') + '">';
  var meta = [game.location, game.time].filter(Boolean).join(' | ');
  card += '<div class="v2-game-card-main">';
  if (game.opponentLogoUrl) {
    card += '<div class="v2-game-logo"><img src="' + v2EscapeHtml(game.opponentLogoUrl) + '" alt="" loading="lazy" decoding="async"></div>';
  }
  card += '<div class="v2-game-card-copy">';
  card += '<h3>' + v2EscapeHtml(game.opponent) + '</h3>';
  if (game.opponentMascot) card += '<p>' + v2EscapeHtml(game.opponentMascot) + '</p>';
  card += '<p>' + v2FormatDate(game.date, { weekday: 'short', month: 'long', day: 'numeric' }) + '</p>';
  if (meta) card += '<p>' + meta + '</p>';
  card += '</div>';
  if (result) {
    card += '<div class="v2-game-card-score">';
    card += '<div class="v2-result-outcome v2-result-outcome-' + v2OutcomeClass(result) + '">' + v2OutcomeLabel(result) + '</div>';
    card += '<p class="v2-game-result">' + result.ourScore + ' - ' + result.theirScore + '</p>';
    card += '</div>';
  }
  card += '</div>';
  card += '</article>';
  return card;
}

function v2OutcomeLabel(result) {
  if (!result) return '';
  if (result.ourScore > result.theirScore) return 'Win';
  if (result.ourScore < result.theirScore) return 'Loss';
  return 'Tie';
}

function v2OutcomeClass(result) {
  return v2OutcomeLabel(result).toLowerCase();
}

function v2CountWins(results) {
  return results.filter(function(result) {
    return result.ourScore > result.theirScore;
  }).length;
}

function v2CountLosses(results) {
  return results.filter(function(result) {
    return result.ourScore < result.theirScore;
  }).length;
}

function v2ApplyStagger(selector, itemSelector, stepMs) {
  var root = document.querySelector(selector);
  if (!root) return;
  Array.prototype.forEach.call(root.querySelectorAll(itemSelector), function(item, index) {
    item.style.setProperty('--v2-stagger', Math.min(index * (stepMs || 60), 720) + 'ms');
  });
}

function v2RestartAnimations(selector) {
  var root = document.querySelector(selector);
  if (!root) return;
  Array.prototype.forEach.call(root.querySelectorAll('.v2-game-card, .v2-roster-card, .v2-schedule-block'), function(item) {
    item.style.animation = 'none';
    void item.offsetHeight;
    item.style.animation = '';
  });
}

function v2EscapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function v2FormatNewsDate(pubDate) {
  if (!pubDate) return '';
  var date = new Date(pubDate);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Denver'
  });
}

function v2RenderNewsCard(article) {
  var image = v2NormalizeAssetUrl(article.image || '/images/outlets/generic.svg');
  var title = v2EscapeHtml(article.title);
  var excerpt = v2EscapeHtml(article.excerpt);
  var source = v2EscapeHtml(article.source || 'News');
  var date = v2FormatNewsDate(article.pubDate);
  var link = v2EscapeHtml(article.link);

  return '<a class="v2-news-card" href="' + link + '" target="_blank" rel="noopener noreferrer">' +
    '<div class="v2-news-media"><img src="' + image + '" alt="" loading="lazy" decoding="async"></div>' +
    '<div class="v2-news-body">' +
      '<div class="v2-news-meta">' +
        '<span class="v2-news-source">' + source + '</span>' +
        (date ? '<time class="v2-news-date" datetime="' + v2EscapeHtml(article.pubDate) + '">' + v2EscapeHtml(date) + '</time>' : '') +
      '</div>' +
      '<h3>' + title + '</h3>' +
      (excerpt ? '<p>' + excerpt + '</p>' : '') +
    '</div>' +
  '</a>';
}

function v2RenderNewsFromArticles(articles) {
  var grid = document.getElementById('newsGrid');
  if (!grid) return;

  if (!articles || !articles.length) {
    grid.innerHTML = '<p class="v2-news-empty">No coverage found right now. Check back after the next site update.</p>';
    return;
  }

  var sorted = articles.slice().sort(function(a, b) {
    var aTime = Date.parse(a.pubDate || 0) || 0;
    var bTime = Date.parse(b.pubDate || 0) || 0;
    return bTime - aTime;
  });

  grid.innerHTML = sorted.map(v2RenderNewsCard).join('');
  v2ApplyStagger('#news', '.v2-news-card', 70);
}

function v2NormalizeNewsKey(value) {
  try {
    var parsed = new URL(String(value || ''));
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'oc'].forEach(function(key) {
      parsed.searchParams.delete(key);
    });
    return parsed.toString().toLowerCase();
  } catch (error) {
    return String(value || '').trim().toLowerCase();
  }
}

function v2MergeNewsArticles(primaryArticles, backupArticles) {
  var seen = {};
  var merged = [];

  function add(article) {
    if (!article || !article.title || !article.link) return;
    var key = v2NormalizeNewsKey(article.link) || String(article.title).toLowerCase();
    if (seen[key]) return;
    seen[key] = true;
    merged.push(article);
  }

  (primaryArticles || []).forEach(add);
  (backupArticles || []).forEach(add);
  return merged;
}

function v2FetchNewsJson() {
  var dataPath = (window.__SITE_BASE_PATH || '') + '/data/news.json';
  return fetch(dataPath)
    .then(function(response) {
      if (!response.ok) throw new Error('news fetch failed');
      return response.json();
    })
    .then(function(payload) {
      return payload && payload.articles ? payload.articles : [];
    });
}

function v2RenderNews() {
  var grid = document.getElementById('newsGrid');
  if (!grid) return;

  function finish(articles) {
    v2RenderNewsFromArticles(articles);
  }

  if (typeof fbGet === 'function') {
    Promise.all([
      fbGet('news').catch(function() { return null; }),
      v2FetchNewsJson().catch(function() { return []; })
    ]).then(function(values) {
      var payload = values[0];
      var backupArticles = values[1];
      var articles = payload && payload.articles
        ? (Array.isArray(payload.articles) ? payload.articles : (typeof fbToArray === 'function' ? fbToArray(payload.articles) : []))
        : [];
      finish(v2MergeNewsArticles(articles, backupArticles));
    }).catch(function() {
      return v2FetchNewsJson().then(finish).catch(function() {
        finish([]);
      });
    });
    return;
  }

  v2FetchNewsJson().then(finish).catch(function() {
    finish([]);
  });
}

function v2RenderRoster() {
  var rosterGrid = document.getElementById('rosterGrid');
  if (!rosterGrid) return;

  rosterGrid.innerHTML = v2RosterData.slice().sort(function(a, b) {
    return a.num - b.num || a.name.localeCompare(b.name);
  }).map(function(player) {
    return '<article class="v2-roster-card">' +
      '<div class="v2-roster-num">' + player.num + '</div>' +
      '<div><div class="v2-roster-name">' + player.name + '</div><div class="v2-roster-meta">' + player.year + (player.pos ? ' | ' + player.pos : '') + '</div></div>' +
    '</article>';
  }).join('');
  v2ApplyStagger('#roster', '.v2-roster-card', 75);
  v2RestartAnimations('#roster');
}

function v2WireModal() {
  var modal = document.getElementById('blanketModal');
  var openButton = document.getElementById('blanketModalOpen');
  if (!modal || !openButton) return;

  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove('v2-modal-open');
  }

  openButton.addEventListener('click', function() {
    modal.hidden = false;
    document.body.classList.add('v2-modal-open');
  });

  modal.querySelectorAll('button').forEach(function(button) {
    button.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && !modal.hidden) closeModal();
  });
}

function v2SyncDiamondStory() {
  var sections = document.querySelectorAll('.v2-diamond-story');
  if (!sections.length) return;

  Array.prototype.forEach.call(sections, function(section) {
    var sticky = section.querySelector('.v2-diamond-story-sticky');
    if (!sticky) return;

    var sectionTop = section.getBoundingClientRect().top + window.scrollY;
    var stickyHeight = sticky.offsetHeight || window.innerHeight || 1;
    var maxScroll = Math.max(1, section.offsetHeight - stickyHeight);
    var rawProgress = ((window.scrollY || window.pageYOffset || 0) - sectionTop) / maxScroll;
    var progress = Math.max(0, Math.min(1, rawProgress));
    var introProgress = Math.max(0, Math.min(1, progress / 0.18));
    var diamondProgress = Math.max(0, Math.min(1, (progress - 0.18) / 0.70));
    var streakFinish = 0.94;
    var streakProgress = Math.min(introProgress / streakFinish, 0.9);
    var streakOpacity = introProgress > 0 && introProgress < streakFinish ? 1 : 0;
    var ballProgress = introProgress <= streakFinish ? 0 : Math.min(1, (introProgress - streakFinish) / 0.06);

    section.style.setProperty('--diamond-streak', streakProgress.toFixed(3));
    section.style.setProperty('--diamond-streak-opacity', streakOpacity.toFixed(3));
    section.style.setProperty('--diamond-ball-opacity', ballProgress.toFixed(3));
    section.style.setProperty('--diamond-ball-scale', ballProgress.toFixed(3));
    section.style.setProperty('--draw-1', Math.max(0, Math.min(1, diamondProgress * 4)));
    section.style.setProperty('--draw-2', Math.max(0, Math.min(1, diamondProgress * 4 - 1)));
    section.style.setProperty('--draw-3', Math.max(0, Math.min(1, diamondProgress * 4 - 2)));
    section.style.setProperty('--draw-4', Math.max(0, Math.min(1, diamondProgress * 4 - 3)));

    var stage = 0;
    if (diamondProgress >= .99) stage = 4;
    else if (diamondProgress >= 0.75) stage = 3;
    else if (diamondProgress >= 0.50) stage = 2;
    else if (diamondProgress >= 0.25) stage = 1;

    section.setAttribute('data-base', String(stage));
    if (stage === 4) {
      if (!section.classList.contains('is-fireworks') && !section._fireworksTimer) {
        section._fireworksTimer = setTimeout(function() {
          section._fireworksTimer = null;
          if (section.getAttribute('data-base') === '4') {
            section.classList.add('is-fireworks');
          }
        }, 50);
      }
    } else {
      if (section._fireworksTimer) {
        clearTimeout(section._fireworksTimer);
        section._fireworksTimer = null;
      }
      section.classList.remove('is-fireworks');
    }

    Array.prototype.forEach.call(section.querySelectorAll('.v2-diamond-panel'), function(panel) {
      panel.classList.toggle('is-active', Number(panel.getAttribute('data-stage')) === stage);
    });
  });
}

function v2WireDiamondStory() {
  var section = document.querySelector('.v2-diamond-story');
  if (!section) return;
  if (section._diamondWired) {
    v2SyncDiamondStory();
    return;
  }
  section._diamondWired = true;
  var rafId = 0;

  function queueSync() {
    if (rafId) return;
    rafId = requestAnimationFrame(function() {
      rafId = 0;
      v2SyncDiamondStory();
    });
  }

  window.addEventListener('scroll', queueSync, { passive: true });
  window.addEventListener('resize', queueSync);
  queueSync();
}

function v2WireRevealAnimations() {
  var sections = document.querySelectorAll('.v2-reveal');
  if (!sections.length) return;
  if (!('IntersectionObserver' in window)) {
    sections.forEach(function(section) {
      section.classList.add('v2-visible');
    });
    return;
  }

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('v2-visible');
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0.05,
    rootMargin: '0px 0px -4% 0px'
  });

  sections.forEach(function(section) {
    observer.observe(section);
  });

  v2RevealRestoredSections();
  document.body.classList.add('v2-reveals-ready');
  window.addEventListener('pageshow', v2RevealRestoredSections);
  window.addEventListener('pagehide', v2RevealAllSections);
  window.addEventListener('popstate', v2RevealRestoredSections);
  window.addEventListener('hashchange', v2RevealRestoredSections);
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') v2RevealAllSections();
  });
  document.addEventListener('click', function(event) {
    var link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if (!link) return;
    var href = link.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#') return;
    v2RevealAllSections();
  }, true);
}

function v2RevealRestoredSections() {
  function revealCurrentViewport() {
    var viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
    document.querySelectorAll('.v2-reveal').forEach(function(section) {
      var rect = section.getBoundingClientRect();
      if (rect.top < viewportHeight * .98 && rect.bottom > -120) {
        section.classList.add('v2-visible');
      }
    });
  }

  revealCurrentViewport();
  requestAnimationFrame(revealCurrentViewport);
  window.setTimeout(revealCurrentViewport, 120);
}

function v2RevealAllSections() {
  document.body.classList.remove('v2-reveals-ready');
  document.querySelectorAll('.v2-reveal').forEach(function(section) {
    section.classList.add('v2-visible');
  });
}

function v2SetHomeStrengthActive(activeIndex) {
  var cards = Array.prototype.slice.call(document.querySelectorAll('[data-home-scroll-card]'));
  var photos = Array.prototype.slice.call(document.querySelectorAll('.v2-strengths-photo-stage [data-home-scroll-photo]'));
  if (!cards.length || !photos.length) return;

  cards.forEach(function(card, index) {
    card.classList.toggle('is-active', index === activeIndex);
  });
  photos.forEach(function(photo, index) {
    photo.classList.toggle('is-active', index === activeIndex);
  });
}

function v2SyncHomeStorySections() {
  var viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
  var cards = Array.prototype.slice.call(document.querySelectorAll('[data-home-scroll-card]'));

  if (cards.length) {
    var targetY = viewportHeight * .5;
    var activeIndex = 0;

    cards.forEach(function(card, index) {
      var rect = card.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > viewportHeight) return;
      var center = rect.top + rect.height / 2;
      if (center <= targetY) {
        activeIndex = index;
      }
    });

    v2SetHomeStrengthActive(activeIndex);
  }

  document.querySelectorAll('[data-home-stack-photo]').forEach(function(photo, index) {
    var rect = photo.getBoundingClientRect();
    var threshold = viewportHeight * .5;
    photo.classList.toggle('is-inview', rect.top < threshold && rect.bottom > 0);
  });
}

function v2QueueHomeStorySync() {
  if (v2HomeStoryRaf) return;
  v2HomeStoryRaf = requestAnimationFrame(function() {
    v2HomeStoryRaf = 0;
    v2SyncHomeStorySections();
  });
}

function v2WireHomeStorySections() {
  var homeStory = document.querySelector('.v2-home-story');
  if (!homeStory || homeStory._homeStoryWired) return;
  homeStory._homeStoryWired = true;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealTargets = document.querySelectorAll('[data-home-scroll-photo], [data-home-scroll-card], [data-home-stack-photo]');

  if (!('IntersectionObserver' in window) || reduceMotion) {
    revealTargets.forEach(function(target) {
      target.classList.add('is-inview');
    });
    v2SetHomeStrengthActive(0);
    return;
  }

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      entry.target.classList.toggle('is-inview', entry.isIntersecting);
    });
  }, {
    threshold: 0,
    rootMargin: '0px 0px -50% 0px'
  });

  revealTargets.forEach(function(target) {
    observer.observe(target);
  });

  window.addEventListener('scroll', v2QueueHomeStorySync, { passive: true });
  window.addEventListener('resize', v2QueueHomeStorySync);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', v2QueueHomeStorySync);
  }
  v2QueueHomeStorySync();
}

function v2WireMobileNav() {
  var header = document.querySelector('.v2-header');
  var toggle = document.getElementById('v2NavToggle');
  var nav = document.getElementById('v2Nav');
  if (!header || !toggle || !nav || toggle._wired) return;
  toggle._wired = true;

  function closeNav() {
    header.classList.remove('nav-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation menu');
  }

  function openNav() {
    header.classList.add('nav-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close navigation menu');
  }

  toggle.addEventListener('click', function() {
    if (header.classList.contains('nav-open')) closeNav();
    else openNav();
  });

  nav.querySelectorAll('a').forEach(function(link) {
    link.addEventListener('click', function(event) {
      var href = link.getAttribute('href') || '';
      if (!href || href.charAt(0) !== '#') {
        closeNav();
        return;
      }

      var target = document.querySelector(href);
      if (!target) {
        closeNav();
        return;
      }

      event.preventDefault();
      if (target.classList.contains('v2-reveal')) target.classList.add('v2-visible');
      closeNav();
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          var headerHeight = header.getBoundingClientRect().height;
          var top = target.getBoundingClientRect().top + window.scrollY - headerHeight - 12;
          window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
        });
      });
    });
  });

  document.addEventListener('click', function(event) {
    if (!header.classList.contains('nav-open')) return;
    if (header.contains(event.target)) return;
    closeNav();
  });

  window.addEventListener('resize', function() {
    if (window.innerWidth > 980) closeNav();
  });
}

function v2WireHeaderScrollState() {
  var header = document.querySelector('.v2-header');
  if (!header || header._scrollStateWired) return;
  header._scrollStateWired = true;

  function syncHeaderState() {
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  }

  window.addEventListener('scroll', syncHeaderState, { passive: true });
  syncHeaderState();
}

function v2GoogleCalendarSubscribeUrl(calendarUrl) {
  try {
    return 'https://calendar.google.com/calendar/render?cid=' +
      encodeURIComponent(window.btoa(calendarUrl));
  } catch (error) {
    return 'https://calendar.google.com/calendar/render?cid=' + encodeURIComponent(calendarUrl);
  }
}

function v2WireCalendarSyncLinks() {
  var syncEl = document.querySelector('#schedule .v2-season-results-header .v2-calendar-sync');
  if (!syncEl) return;
  var appleLink = syncEl.querySelector('.v2-calendar-sync-link-apple');
  var googleLink = syncEl.querySelector('.v2-calendar-sync-link-google');
  var icsLink = syncEl.querySelector('.v2-calendar-sync-link-muted');
  var labelEl = syncEl.querySelector('.v2-calendar-sync-label');
  var descriptionEl = syncEl.querySelector('p');
  if (!appleLink && !googleLink && !icsLink) return;

  var games = v2GetScheduleGames();
  var selectedTeam = v2GetSelectedScheduleTeam();
  var selectedSeasonKey = v2ResolveSelectedSeasonKey(games);
  var selectedSeason = selectedSeasonKey.split('-')[0] || 'spring';
  var selectedYear = selectedSeasonKey.split('-')[1] || '';
  var seasonLabel = v2GetSeasonName(selectedSeason) + (selectedYear ? ' ' + selectedYear : '');
  var teamLabel = v2GetScheduleTeamLabel(selectedTeam);
  var calendarFile = selectedSeasonKey
    ? 'schedule-' + selectedTeam + '-' + selectedSeasonKey + '.ics'
    : 'schedule.ics';
  var calendarPath = (window.__SITE_BASE_PATH || '') + '/api/' + calendarFile;
  var calendarUrl = window.location.origin + calendarPath;

  if (labelEl) labelEl.textContent = 'Sync ' + teamLabel + ' ' + seasonLabel;
  if (descriptionEl) descriptionEl.textContent = 'Subscribe to the ' + teamLabel + ' ' + seasonLabel + ' schedule.';

  if (appleLink) {
    appleLink.href = calendarUrl.replace(/^https?:\/\//, 'webcal://');
    appleLink.textContent = 'Apple (' + teamLabel + ')';
  }

  if (googleLink) {
    googleLink.href = v2GoogleCalendarSubscribeUrl(calendarUrl);
    googleLink.textContent = 'Android (' + teamLabel + ')';
  }

  if (icsLink) {
    icsLink.href = calendarPath;
    icsLink.download = 'timpanogos-baseball-' + selectedTeam + '-' + selectedSeasonKey + '.ics';
    icsLink.textContent = 'ICS (' + teamLabel + ')';
  }
}

function v2Boot() {
  if (window.__v2Booted) return;
  window.__v2Booted = true;

  var games = v2GetScheduleGames();
  var selectedTeamGames = v2GetGamesForSelectedTeam(games);
  var results = v2NormalizeFirebaseResults(v2CachedResults || []);
  v2WireHeroVideo();
  v2RenderSummary(selectedTeamGames.length ? selectedTeamGames : games, results);
  v2RenderFilmstrip(v2GetCarouselPhotos());
  v2RenderSchedule(games, results);
  v2RenderRoster();
  v2RenderNews();
  v2WireModal();
  v2WireDiamondStory();
  v2WireHomeStorySections();
  v2WireMobileNav();
  v2WireHeaderScrollState();
  v2WireCalendarSyncLinks();
  v2WireCarouselPhotoListener();
  v2WireScheduleDataListener();
  v2WireRevealAnimations();
}

function v2Init() {
  if (typeof fbGet !== 'function') {
    v2Boot();
    return;
  }

  Promise.all([
    fbGet('games'),
    fbGet('results'),
    v2FbGetOptional('carouselPhotos', null),
    v2FbGetOptional('opponents', null)
  ]).then(function(values) {
    v2CachedGames = fbToArray(values[0]);
    v2CachedResults = fbToArray(values[1]);
    v2CachedCarouselPhotos = values[2] ? fbToArray(values[2]) : null;
    v2CachedOpponents = values[3] ? fbToArray(values[3]).map(v2NormalizeOpponent) : [];
    if (window.__v2Booted) {
      v2RefreshSiteFromCache();
    } else {
      v2Boot();
    }
  }).catch(function() {
    if (!window.__v2Booted) v2Boot();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', v2Init);
} else {
  v2Init();
}
