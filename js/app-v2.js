var v2CachedGames = null;
var v2CachedResults = null;
var v2CachedCarouselPhotos = null;
var v2RegionTeams = ['Mountain View','Summit Academy','Uintah','Provo','Orem'];

function v2DefaultCarouselPhotos() {
  return ['photos/optimized/1.jpg','photos/optimized/2.jpg','photos/optimized/3.jpg','photos/optimized/4.jpg','photos/optimized/5.jpg','photos/optimized/6.jpg','photos/optimized/7.jpg','photos/optimized/8.jpg','photos/optimized/9.jpg'].map(function(src, index) {
    return { src: src, alt: 'Team photo ' + (index + 1), sortOrder: index };
  });
}

function v2NormalizeCarouselPhoto(photo, index) {
  if (typeof photo === 'string') return { src: photo, alt: 'Team photo', sortOrder: index };
  return {
    src: photo && photo.src ? photo.src : '',
    alt: photo && photo.alt ? photo.alt : 'Team photo',
    sortOrder: photo && photo.sortOrder != null ? +photo.sortOrder : index
  };
}

function v2GetCarouselPhotos() {
  var photos = (v2CachedCarouselPhotos && v2CachedCarouselPhotos.length ? v2CachedCarouselPhotos : v2DefaultCarouselPhotos())
    .map(v2NormalizeCarouselPhoto)
    .filter(function(photo) { return photo.src; })
    .sort(function(a, b) { return (+a.sortOrder || 0) - (+b.sortOrder || 0); });
  return photos;
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
    accent.innerHTML = '<img src="images/logo-twolves-basesball-diamond.png" alt="" aria-hidden="true">';
    layer.appendChild(accent);
  }

  section.appendChild(layer);
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

function v2SampleGames() {
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
    { date:'2026-05-04', opponent:'TBD', location:'Home', time:'3:30 PM', playoff:true }
  ];
}

function v2Spring2026Results() {
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
    { date:'2026-04-24', opponent:'Orem', ourScore:6, theirScore:2 }
  ];
}

function v2Fall2025Results() {
  return [
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

function v2RenderSummary(games, results) {
  var futureGames = games.slice().filter(function(game) {
    return new Date(game.date + 'T23:59:59').getTime() >= Date.now();
  }).sort(function(a, b) {
    return new Date(a.date) - new Date(b.date);
  });
  var next = futureGames[0];
  document.getElementById('nextGameTitle').textContent = next ? next.opponent : 'Season Complete';
  document.getElementById('nextGameMeta').textContent = next
    ? v2FormatDate(next.date) + ' | ' + next.location + ' | ' + next.time
    : 'No future games scheduled right now.';

  var recentList = document.getElementById('recentResultsList');
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
  if (!photos.length) {
    section.style.display = 'none';
    return;
  }

  section.style.display = '';
  v2PreloadFilmstripPhotos(photos);
  v2RenderFilmstripAccents(section);
  track.innerHTML = photos.map(function(photo, index) {
    return '<figure class="v2-filmstrip-frame">' +
      '<img src="' + photo.src + '" alt="' + (photo.alt || ('Team photo ' + (index + 1))) + '" width="565" height="374" loading="eager" decoding="async"' + (index < 4 ? ' fetchpriority="high"' : '') + '>' +
      '<figcaption>' + (photo.alt || 'Team photo') + '</figcaption>' +
    '</figure>';
  }).join('');

  var images = Array.prototype.slice.call(track.querySelectorAll('img'));
  Promise.all(images.slice(0, Math.min(4, images.length)).map(v2ImageReady)).then(function() {
    v2SyncFilmstrip();
    v2WireFilmstripScroll();
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

  var viewportWidth = window.innerWidth || document.documentElement.clientWidth || sticky.clientWidth;
  var scrollDistance = Math.max(0, track.scrollWidth - viewportWidth);
  var stripHeight = chrome.clientHeight || sticky.clientHeight || 374;
  var centerOffset = Math.max(0, Math.round(((window.innerHeight || stripHeight) - stripHeight) / 2));
  var sectionTop = section.getBoundingClientRect().top + window.scrollY;
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

function v2WireFilmstripScroll() {
  var section = document.getElementById('v2Filmstrip');
  if (!section || section._filmstripWired) {
    v2SyncFilmstrip();
    return;
  }
  section._filmstripWired = true;

  window.addEventListener('scroll', v2SyncFilmstrip, { passive: true });
  window.addEventListener('resize', v2SyncFilmstrip);
  requestAnimationFrame(v2SyncFilmstrip);
}

function v2RenderCountdown(games) {
  var section = document.getElementById('v2CountdownSection');
  var oppEl = document.getElementById('v2CountdownOpponent');
  var tickEl = document.getElementById('v2TickClock');
  if (!section || !oppEl || !tickEl) return;

  section.style.display = 'none';
  section.classList.remove('playoff-countdown');

  var futureGames = games.slice().filter(function(game) {
    return new Date(game.date + 'T23:59:59').getTime() >= Date.now();
  }).sort(function(a, b) {
    return new Date(a.date) - new Date(b.date);
  });
  var next = futureGames[0];

  if (!next) return;

  section.style.display = '';
  oppEl.innerHTML = next.playoff
    ? 'Playoffs vs ' + next.opponent + '<br>' + v2FormatDate(next.date) + ' @ ' + next.time
    : 'vs ' + next.opponent + ' - ' + v2FormatDate(next.date) + ' @ ' + next.time;
  if (next.playoff) section.classList.add('playoff-countdown');

  if (tickEl._tickInit || typeof Tick === 'undefined') return;
  tickEl._tickInit = true;

  var timeParts = (next.time || '').match(/(\d+):(\d+)\s*(AM|PM)/i);
  var h = timeParts ? +timeParts[1] : 15;
  var m = timeParts ? +timeParts[2] : 30;
  if (timeParts && timeParts[3].toUpperCase() === 'PM' && h !== 12) h += 12;
  if (timeParts && timeParts[3].toUpperCase() === 'AM' && h === 12) h = 0;

  var dateParts = (next.date || '').split('-');
  var gameDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], h, m);

  setTimeout(function() {
    Tick.DOM.create(tickEl, {
      didInit: function(tick) {
        Tick.count.down(gameDate, { format: ['d', 'h', 'm', 's'] }).onupdate = function(val) {
          tick.value = val;
        };
      }
    });
  }, 0);
}

function v2RenderSchedule(games, results2026) {
  var seasonGames = v2BuildSeasonGames(games, results2026);
  var usedResults = [];
  var playoffGames = [];
  var regionGames = [];
  var nonRegionGames = [];
  var wins = v2CountWins(results2026);
  var losses = v2CountLosses(results2026);

  document.getElementById('recordBand').innerHTML =
    '<span class="v2-heading-record-label">Spring 2026 Record</span>' +
    '<span class="v2-heading-record-value">' + wins + '-' + losses + '</span>';

  seasonGames.forEach(function(game) {
    if (game.playoff) playoffGames.push(game);
    else if (v2RegionTeams.indexOf(game.opponent) !== -1) regionGames.push(game);
    else nonRegionGames.push(game);
  });

  [
    { id: 'v2PlayoffGrid', games: playoffGames.sort(v2OldestGameFirst) },
    { id: 'v2RegionGrid', games: regionGames.sort(v2NewestGameFirst) },
    { id: 'v2NonRegionGrid', games: nonRegionGames.sort(v2NewestGameFirst) }
  ].forEach(function(group) {
    var grid = document.getElementById(group.id);
    grid.innerHTML = group.games.map(function(game) {
      var result = results2026.find(function(entry, index) {
        return entry.date === game.date && entry.opponent === game.opponent && usedResults.indexOf(index) === -1;
      });
      if (result) usedResults.push(results2026.indexOf(result));
      return v2BuildGameCard(game, result);
    }).join('');
  });

  document.getElementById('v2PlayoffSection').style.display = playoffGames.length ? '' : 'none';
  v2ApplyStagger('#schedule', '.v2-game-card', 80);
  v2RestartAnimations('#schedule');
}

function v2BuildSeasonGames(games, results) {
  var mergedGames = games.slice();
  var gameKeys = {};

  mergedGames.forEach(function(game) {
    gameKeys[(game.date || '') + '|' + (game.opponent || '')] = true;
  });

  results.forEach(function(result) {
    var key = (result.date || '') + '|' + (result.opponent || '');
    if (gameKeys[key]) return;
    mergedGames.push({
      date: result.date,
      opponent: result.opponent,
      location: 'Final',
      time: '',
      playoff: false
    });
    gameKeys[key] = true;
  });

  return mergedGames;
}

function v2GameDateTimeValue(game) {
  var dateValue = game && game.date ? game.date : '';
  var timeValue = game && game.time ? game.time : '';
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
  card += '<div class="v2-game-card-copy">';
  card += '<h3>' + game.opponent + '</h3>';
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

function v2RenderRoster() {
  document.getElementById('rosterGrid').innerHTML = v2RosterData.slice().sort(function(a, b) {
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

function v2Boot() {
  var games = v2CachedGames || v2SampleGames();
  var liveResults = v2CachedResults && v2CachedResults.length ? v2CachedResults : v2Fall2025Results();
  var seasonResults = v2Spring2026Results();
  v2WireHeroVideo();
  v2RenderSummary(games, seasonResults.concat(liveResults));
  v2RenderFilmstrip(v2GetCarouselPhotos());
  v2RenderCountdown(games);
  v2RenderSchedule(games, seasonResults);
  v2RenderRoster();
  v2WireModal();
  v2WireDiamondStory();
  v2WireMobileNav();
  v2WireHeaderScrollState();
  v2WireRevealAnimations();
}

document.addEventListener('DOMContentLoaded', function() {
  if (typeof fbGet !== 'function') {
    v2Boot();
    return;
  }

  Promise.all([
    fbGet('games'),
    fbGet('results'),
    fbGet('carouselPhotos')
  ]).then(function(values) {
    v2CachedGames = fbToArray(values[0]);
    v2CachedResults = fbToArray(values[1]);
    v2CachedCarouselPhotos = fbToArray(values[2]);
    v2Boot();
  }).catch(function() {
    v2Boot();
  });
});
