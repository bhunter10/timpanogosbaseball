/* ── Shared Utilities ── */
var cachedGames = null;
var cachedResults = null;
var cachedCarouselPhotos = null;

function fbSave(key, data) {
  if (Array.isArray(data)) {
    data = data.filter(Boolean).map(cleanFirebaseRecord);
  }

  return fbSet(key, data).then(function() {
    if (key === 'games') cachedGames = data;
    if (key === 'results') cachedResults = data;
    if (key === 'carouselPhotos') cachedCarouselPhotos = data;
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

function getGames() { return cachedGames || []; }
function getResults() { return cachedResults || []; }
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
function refreshCarouselPhotos(photos) {
  cachedCarouselPhotos = photos.slice();
  if (window.timpanogosCarousel) window.timpanogosCarousel.setPhotos(cachedCarouselPhotos, true);
}
function fbSaveCarouselPhotos(photos) {
  const cleaned = photos.map(cleanFirebaseRecord).filter(photo => photo && photo.src);
  const data = cleaned.length ? cleaned : { __empty: true };
  return fbSet('carouselPhotos', data).then(function() {
    return cleaned;
  });
}
function fbSaveCarouselPhotoChild(childKey, photo) {
  var cleaned = cleanFirebaseRecord(photo);
  return fbSet('carouselPhotos/' + childKey, cleaned).then(function() {
    return Object.assign({ _key: childKey }, cleaned);
  });
}
function fbAddCarouselPhoto(photo) {
  var cleaned = cleanFirebaseRecord(photo);
  return fbPush('carouselPhotos', cleaned).then(function(ref) {
    return Object.assign({ _key: ref.key }, cleaned);
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
function sampleGames() {
  const s = [
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
    { date:'2026-05-04', opponent:'TBD', location:'Home', time:'3:30 PM', playoff:true },
  ];
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
    { date:'2026-04-24', opponent:'Orem', ourScore:6, theirScore:2 }
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
      <button type="button" class="admin-nav-link" data-admin-panel="carousel">Carousel photos</button>
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
        <div class="admin-main-grid">
          <section class="admin-card" id="gameAdminCard">
            <h2>Add Upcoming Game</h2>
            <form id="gameForm">
              <label>Date (MM-DD-YYYY):<input type="date" id="gameDate" required /></label>
              <label>Opponent:<input type="text" id="gameOpponent" required /></label>
              <label>Location:<input type="text" id="gameLocation" required placeholder="Home/Away" /></label>
              <label>Time:<input type="text" id="gameTime" required placeholder="4:00 PM" /></label>
              <label class="checkbox-label"><input type="checkbox" id="gamePlayoff" /> Playoff Game</label>
              <div class="form-row">
                <button type="submit" class="btn">Add Game</button>
              </div>
              <p class="auth-error" id="gameSaveError"></p>
            </form>
          </section>
          <section class="admin-card" id="resultAdminCard">
            <h2>Record a Result</h2>
            <form id="resultForm">
              <label>Date (MM-DD-YYYY):<input type="date" id="resultDate" required /></label>
              <label>Opponent:<input id="resultOpponent" required /></label>
              <label>Our Score:<input id="ourScore" type="number" required /></label>
              <label>Their Score:<input id="theirScore" type="number" required /></label>
              <div class="form-row">
                <button type="submit" class="btn">Add Result</button>
              </div>
              <p class="auth-error" id="resultSaveError"></p>
            </form>
          </section>
        </div>
        <section class="admin-card">
          <h2>Data Preview</h2>
          <div class="admin-preview-grid">
            <div>
              <p><strong>Saved games:</strong></p>
              <ul id="gamesPreview" class="list"></ul>
            </div>
            <div>
              <p><strong>Saved results:</strong></p>
              <ul id="resultsPreview" class="list"></ul>
            </div>
          </div>
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
          <ul id="carouselPhotosPreview" class="list photo-list"></ul>
        </section>
      </div>
    </div>`;

  document.getElementById('adminSignOut').addEventListener('click', () => {
    fbSignOut().then(() => navigate());
  });

  function showAdminPanel(panelName) {
    document.querySelectorAll('.admin-nav-link').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.adminPanel === panelName);
    });
    document.querySelectorAll('.admin-panel').forEach(panel => {
      panel.classList.toggle('active', panel.dataset.adminPanelView === panelName);
    });
  }

  document.querySelectorAll('.admin-nav-link').forEach(btn => {
    btn.addEventListener('click', () => showAdminPanel(btn.dataset.adminPanel));
  });

  let games = getGames().slice();
  let results = getResults().slice();
  let carouselPhotos = getCarouselPhotos();
  spring2026Results().concat(historical2025Results()).forEach(r => {
    const exists = results.some(saved =>
      saved.date === r.date &&
      saved.opponent === r.opponent &&
      +saved.ourScore === +r.ourScore &&
      +saved.theirScore === +r.theirScore
    );
    if (!exists) results.push(r);
  });

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

  function renderGamesPreview() {
    const ul = document.getElementById('gamesPreview');
    ul.innerHTML = '';
    games.map((game, index) => ({ game, index }))
      .sort((a, b) => new Date(b.game.date) - new Date(a.game.date))
      .forEach(({ game: g, index: i }) => {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.textContent = `${formatDate(g.date, { year:'numeric', month:'long', day:'numeric' })} - ${g.opponent} (${g.location}) at ${g.time}`;
      li.appendChild(span);
      const editBtn = document.createElement('button');
      editBtn.textContent = 'Edit'; editBtn.className = 'btn small';
      editBtn.addEventListener('click', () => {
        document.getElementById('gameDate').value = g.date;
        document.getElementById('gameOpponent').value = g.opponent;
        document.getElementById('gameLocation').value = g.location;
        document.getElementById('gameTime').value = g.time;
        document.getElementById('gamePlayoff').checked = !!g.playoff;
        editingGameIdx = i;
        document.querySelector('#gameForm button[type="submit"]').textContent = 'Update Game';
        showAdminPanel('dashboard');
        document.getElementById('gameAdminCard').scrollIntoView({ behavior: 'smooth' });
      });
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete'; delBtn.className = 'btn small alt';
      delBtn.addEventListener('click', () => {
        const previousGames = games.slice();
        const gameKey = firebaseChildKey(games[i], i);
        games.splice(i, 1);
        fbDeleteChild('games', gameKey).then(() => {
          cachedGames = games.slice();
          renderGamesPreview();
        }).catch(err => {
          games = previousGames;
          document.getElementById('gameSaveError').textContent = err.message || 'Unable to delete game.';
        });
      });
      const btns = document.createElement('div');
      btns.className = 'list-actions';
      btns.appendChild(editBtn); btns.appendChild(delBtn);
      li.appendChild(btns);
      ul.appendChild(li);
    });
  }

  function renderResultsPreview() {
    const ul = document.getElementById('resultsPreview');
    ul.innerHTML = '';
    results.map((result, index) => ({ result, index }))
      .sort((a, b) => new Date(b.result.date) - new Date(a.result.date))
      .forEach(({ result: r, index: i }) => {
      const li = document.createElement('li');
      li.appendChild(buildResultSummary(r));
      const editBtn = document.createElement('button');
      editBtn.textContent = 'Edit'; editBtn.className = 'btn small';
      editBtn.addEventListener('click', () => {
        document.getElementById('resultDate').value = r.date;
        document.getElementById('resultOpponent').value = r.opponent;
        document.getElementById('ourScore').value = r.ourScore;
        document.getElementById('theirScore').value = r.theirScore;
        editingResultIdx = i;
        document.querySelector('#resultForm button[type="submit"]').textContent = 'Update Result';
        showAdminPanel('dashboard');
        document.getElementById('resultAdminCard').scrollIntoView({ behavior: 'smooth' });
      });
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete'; delBtn.className = 'btn small alt';
      delBtn.addEventListener('click', () => {
        const previousResults = results.slice();
        const resultKey = firebaseChildKey(results[i], i);
        results.splice(i, 1);
        fbDeleteChild('results', resultKey).then(() => {
          cachedResults = results.slice();
          renderResultsPreview();
        }).catch(err => {
          results = previousResults;
          document.getElementById('resultSaveError').textContent = err.message || 'Unable to delete result.';
        });
      });
      const btns = document.createElement('div');
      btns.className = 'list-actions';
      btns.appendChild(editBtn); btns.appendChild(delBtn);
      li.appendChild(btns);
      ul.appendChild(li);
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

  function saveCarouselPhotoOrder() {
    const reorderedPhotos = carouselPhotos.map((photo, index) => {
      const cleaned = cleanFirebaseRecord(photo);
      cleaned.sortOrder = index;
      return cleaned;
    });
    fbSaveCarouselPhotos(reorderedPhotos).then(savedPhotos => {
      carouselPhotos = savedPhotos.map(normalizeCarouselPhoto);
      refreshCarouselPhotos(carouselPhotos);
      renderCarouselPhotosPreview();
      showCarouselPhotoMessage('Carousel photo order updated.');
    }).catch(err => {
      document.getElementById('carouselPhotoSaveError').textContent = err.message || 'Unable to save photo order.';
      renderCarouselPhotosPreview();
    });
  }

  function showCarouselPhotoMessage(message) {
    const successEl = document.getElementById('carouselPhotoSaveSuccess');
    successEl.textContent = message;
    clearTimeout(showCarouselPhotoMessage.timer);
    showCarouselPhotoMessage.timer = setTimeout(() => {
      successEl.textContent = '';
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

  document.getElementById('gameForm').addEventListener('submit', e => {
    e.preventDefault();
    const form = e.currentTarget;
    const submitBtn = form.querySelector('button[type="submit"]');
    const errorEl = document.getElementById('gameSaveError');
    const previousGames = games.slice();
    const wasEditing = editingGameIdx >= 0;
    const savedButtonText = submitBtn.textContent;
    errorEl.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = wasEditing ? 'Saving...' : 'Adding...';
    const game = {
      date: document.getElementById('gameDate').value,
      opponent: document.getElementById('gameOpponent').value,
      location: document.getElementById('gameLocation').value,
      time: document.getElementById('gameTime').value
    };
    if (document.getElementById('gamePlayoff').checked) game.playoff = true;
    if (wasEditing) {
      const gameKey = firebaseChildKey(games[editingGameIdx], editingGameIdx);
      games[editingGameIdx] = game;
      fbSaveChild('games', gameKey, game).then(savedGame => {
        games[editingGameIdx] = savedGame;
        cachedGames = games.slice();
        editingGameIdx = -1;
        submitBtn.textContent = 'Add Game';
        renderGamesPreview();
        form.reset();
      }).catch(err => {
        games = previousGames;
        errorEl.textContent = err.message || 'Unable to save game.';
        submitBtn.textContent = savedButtonText;
      }).finally(() => {
        submitBtn.disabled = false;
      });
    } else { games.push(game); }
    if (!wasEditing) {
      fbAddChild('games', game).then(savedGame => {
        games = previousGames.concat(savedGame);
        cachedGames = games.slice();
        editingGameIdx = -1;
        submitBtn.textContent = 'Add Game';
        renderGamesPreview();
        form.reset();
      }).catch(err => {
        games = previousGames;
        errorEl.textContent = err.message || 'Unable to save game.';
        submitBtn.textContent = savedButtonText;
      }).finally(() => {
        submitBtn.disabled = false;
      });
    }
  });

  document.getElementById('resultForm').addEventListener('submit', e => {
    e.preventDefault();
    const form = e.currentTarget;
    const submitBtn = form.querySelector('button[type="submit"]');
    const errorEl = document.getElementById('resultSaveError');
    const previousResults = results.slice();
    const wasEditing = editingResultIdx >= 0;
    const savedButtonText = submitBtn.textContent;
    errorEl.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = wasEditing ? 'Saving...' : 'Adding...';
    const result = {
      date: document.getElementById('resultDate').value,
      opponent: document.getElementById('resultOpponent').value,
      ourScore: +document.getElementById('ourScore').value,
      theirScore: +document.getElementById('theirScore').value
    };
    if (wasEditing) {
      const resultKey = firebaseChildKey(results[editingResultIdx], editingResultIdx);
      results[editingResultIdx] = result;
      fbSaveChild('results', resultKey, result).then(savedResult => {
        results[editingResultIdx] = savedResult;
        cachedResults = results.slice();
        editingResultIdx = -1;
        submitBtn.textContent = 'Add Result';
        renderResultsPreview();
        form.reset();
      }).catch(err => {
        results = previousResults;
        errorEl.textContent = err.message || 'Unable to save result.';
        submitBtn.textContent = savedButtonText;
      }).finally(() => {
        submitBtn.disabled = false;
      });
    } else { results.push(result); }
    if (!wasEditing) {
      fbAddChild('results', result).then(savedResult => {
        results = previousResults.concat(savedResult);
        cachedResults = results.slice();
        editingResultIdx = -1;
        submitBtn.textContent = 'Add Result';
        renderResultsPreview();
        form.reset();
      }).catch(err => {
        results = previousResults;
        errorEl.textContent = err.message || 'Unable to save result.';
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
    const moved = carouselPhotos.splice(carouselDragIndex, 1)[0];
    carouselPhotos.splice(dropIndex, 0, moved);
    carouselDragIndex = null;
    renderCarouselPhotosPreview();
    refreshCarouselPhotos(carouselPhotos);
    saveCarouselPhotoOrder();
  });
  document.getElementById('carouselPhotosPreview').addEventListener('dragend', () => {
    carouselDragIndex = null;
    document.querySelectorAll('.photo-list-item').forEach(item => item.classList.remove('drag-over', 'dragging'));
  });

  renderGamesPreview();
  renderResultsPreview();
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

function navigate() {
  const hash = (location.hash.slice(1) || 'home').toLowerCase();
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

window.addEventListener('hashchange', navigate);
document.addEventListener('adminauthchange', () => {
  if ((location.hash.slice(1) || 'home').toLowerCase() === 'admin') navigate();
});
function v1BootstrapFirebaseAndNavigate() {
  seedDatabase().then(function() {
    return Promise.all([fbGet('games'), fbGet('results'), fbGet('carouselPhotos')]);
  }).then(function(vals) {
    var games = vals[0], results = vals[1], carouselPhotos = vals[2];
    cachedGames = fbToArray(games);
    cachedResults = fbToArray(results);
    cachedCarouselPhotos = carouselPhotos ? fbToArray(carouselPhotos) : null;
    navigate();
  }).catch(function(err) {
    console.error('Firebase load failed:', err);
    navigate();
  });
}

document.addEventListener('DOMContentLoaded', function() {
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
});

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
