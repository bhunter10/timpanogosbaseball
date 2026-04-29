/* ── Shared Utilities ── */
var cachedGames = null;
var cachedResults = null;

function fbSave(key, data) {
  fbSet(key, data);
  if (key === 'games') cachedGames = data;
  if (key === 'results') cachedResults = data;
}

function getGames() { return cachedGames || []; }
function getResults() { return cachedResults || []; }

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
    const key = new Date(y, m - 1, d).toLocaleDateString(undefined, { month:'long' });
    (groups[key] = groups[key] || []).push(r);
  });
  Object.keys(groups).forEach(month => {
    const h3 = document.createElement('h3');
    h3.textContent = month;
    container.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'results-table';
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    groups[month].forEach(r => {
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
  return card;
}

/* ══════════════════════════════════
   PAGE RENDERERS
   ══════════════════════════════════ */

function renderHome(app) {
  const games = getGames();
  const results = getResults();

  app.innerHTML = `
    <section class="quick-info">
      <div class="card"><h3>Next Game</h3><p id="nextGame">Loading...</p></div>
      <div class="card"><h3>Recent Results</h3><div id="recentResults">Loading...</div></div>
      <div class="card"><h3>Contact</h3><p>Jace Hunter<br/>Email: jacejohnny1@icloud.com</p></div>
    </section>
    <div class="stats-row">
      <section class="scoreboard" id="scoreboard"></section>
      <section class="tracker-section">
        <h2>Spring 2026 Season Tracker</h2>
        <div class="tracker-record" id="trackerRecord"></div>
        <div class="tracker-chart" id="trackerChart"></div>
      </section>
    </div>
    <div class="weather-widget" id="weatherCard" style="display:none"></div>`;

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
    oppEl.textContent = next.playoff
      ? '\ud83c\udfc6 Playoffs vs ' + next.opponent + ' \u2014 ' + formatDate(next.date) + ' @ ' + next.time
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

  const games = getGames();
  const results2026 = spring2026Results();
  const usedResults = [];
  let hasPlayoff = false;
  games.sort((a, b) => new Date(b.date) - new Date(a.date));
  games.forEach(g => {
    const result = results2026.find((r, i) => r.date === g.date && r.opponent === g.opponent && !usedResults.includes(i));
    if (result) usedResults.push(results2026.indexOf(result));
    let target;
    if (g.playoff) { target = 'playoffGrid'; hasPlayoff = true; }
    else if (regionTeams.includes(g.opponent)) target = 'regionGrid';
    else target = 'nonRegionGrid';
    document.getElementById(target).appendChild(buildGameCard(g, result));
  });
  if (hasPlayoff) document.getElementById('playoffSection').style.display = '';
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

  // Toggle .stuck class only when heading is pinned at the top
  document.querySelectorAll('#spring2026Results h3,#fallResults h3,#summerResults h3,#springResults h3').forEach(h3 => {
    const observer = new IntersectionObserver(([e]) => {
      const rect = h3.getBoundingClientRect();
      const isAtTop = Math.abs(rect.top - headerH) < 2;
      h3.classList.toggle('stuck', e.intersectionRatio < 1 && isAtTop);
    }, { threshold:[1], rootMargin:`-${headerH + 1}px 0px 0px 0px` });
    observer.observe(h3);
  });

  // Also check on scroll to remove stuck when no longer pinned
  window.addEventListener('scroll', () => {
    document.querySelectorAll('#spring2026Results h3,#fallResults h3,#summerResults h3,#springResults h3').forEach(h3 => {
      const rect = h3.getBoundingClientRect();
      const isAtTop = Math.abs(rect.top - headerH) < 2;
      if (!isAtTop) h3.classList.remove('stuck');
    });
  }, { passive: true });
}

/* ── Admin ── */
let editingGameIdx = -1, editingResultIdx = -1;

function renderAdmin(app) {
  app.className = 'container admin-page';
  app.innerHTML = `
    <section class="admin-card">
      <h2>Add Upcoming Game</h2>
      <form id="gameForm">
        <label>Date (MM-DD-YYYY):<input type="date" id="gameDate" required /></label>
        <label>Opponent:<input type="text" id="gameOpponent" required /></label>
        <label>Location:<input type="text" id="gameLocation" required placeholder="Home/Away" /></label>
        <label>Time:<input type="text" id="gameTime" required placeholder="4:00 PM" /></label>
        <label class="checkbox-label"><input type="checkbox" id="gamePlayoff" /> Playoff Game</label>
        <div class="form-row">
          <button type="submit" class="btn">Add Game</button>
          <button type="button" id="clearGames" class="btn alt">Clear All Games</button>
        </div>
      </form>
    </section>
    <section class="admin-card">
      <h2>Record a Result</h2>
      <form id="resultForm">
        <label>Date (MM-DD-YYYY):<input type="date" id="resultDate" required /></label>
        <label>Opponent:<input id="resultOpponent" required /></label>
        <label>Our Score:<input id="ourScore" type="number" required /></label>
        <label>Their Score:<input id="theirScore" type="number" required /></label>
        <div class="form-row">
          <button type="submit" class="btn">Add Result</button>
          <button type="button" id="clearResults" class="btn alt">Clear All Results</button>
        </div>
      </form>
    </section>
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
    </section>`;

  let games = getGames().slice();
  let results = getResults().slice();

  function renderGamesPreview() {
    const ul = document.getElementById('gamesPreview');
    ul.innerHTML = '';
    games.forEach((g, i) => {
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
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete'; delBtn.className = 'btn small alt';
      delBtn.addEventListener('click', () => { games.splice(i, 1); fbSave('games', games); renderGamesPreview(); });
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
    results.forEach((r, i) => {
      const li = document.createElement('li');
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
      li.appendChild(span);
      const editBtn = document.createElement('button');
      editBtn.textContent = 'Edit'; editBtn.className = 'btn small';
      editBtn.addEventListener('click', () => {
        document.getElementById('resultDate').value = r.date;
        document.getElementById('resultOpponent').value = r.opponent;
        document.getElementById('ourScore').value = r.ourScore;
        document.getElementById('theirScore').value = r.theirScore;
        editingResultIdx = i;
        document.querySelector('#resultForm button[type="submit"]').textContent = 'Update Result';
        document.querySelectorAll('.admin-card')[1].scrollIntoView({ behavior: 'smooth' });
      });
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete'; delBtn.className = 'btn small alt';
      delBtn.addEventListener('click', () => { results.splice(i, 1); fbSave('results', results); renderResultsPreview(); });
      const btns = document.createElement('div');
      btns.className = 'list-actions';
      btns.appendChild(editBtn); btns.appendChild(delBtn);
      li.appendChild(btns);
      ul.appendChild(li);
    });
  }

  document.getElementById('gameForm').addEventListener('submit', e => {
    e.preventDefault();
    const game = {
      date: document.getElementById('gameDate').value,
      opponent: document.getElementById('gameOpponent').value,
      location: document.getElementById('gameLocation').value,
      time: document.getElementById('gameTime').value
    };
    if (document.getElementById('gamePlayoff').checked) game.playoff = true;
    if (editingGameIdx >= 0) {
      games[editingGameIdx] = game;
      editingGameIdx = -1;
      document.querySelector('#gameForm button[type="submit"]').textContent = 'Add Game';
    } else { games.push(game); }
    fbSave('games', games); renderGamesPreview();
    document.getElementById('gameForm').reset();
  });

  document.getElementById('clearGames').addEventListener('click', () => {
    if (confirm('Clear all games?')) { games = []; fbSave('games', games); renderGamesPreview(); }
  });

  document.getElementById('resultForm').addEventListener('submit', e => {
    e.preventDefault();
    const result = {
      date: document.getElementById('resultDate').value,
      opponent: document.getElementById('resultOpponent').value,
      ourScore: +document.getElementById('ourScore').value,
      theirScore: +document.getElementById('theirScore').value
    };
    if (editingResultIdx >= 0) {
      results[editingResultIdx] = result;
      editingResultIdx = -1;
      document.querySelector('#resultForm button[type="submit"]').textContent = 'Add Result';
    } else { results.push(result); }
    fbSave('results', results); renderResultsPreview();
    document.getElementById('resultForm').reset();
  });

  document.getElementById('clearResults').addEventListener('click', () => {
    if (confirm('Clear all results?')) { results = []; fbSave('results', results); renderResultsPreview(); }
  });

  renderGamesPreview();
  renderResultsPreview();
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
  {num:14,name:'Bronco Blackhurst',year:'So.',pos:'P, OF'},
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
  rosterData.forEach((p, i) => {
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

  document.querySelector('.carousel').style.display = hash === 'admin' ? 'none' : '';
  document.getElementById('countdownSection').style.display = hash === 'home' ? '' : 'none';
  document.getElementById('heroSection').style.display = hash === 'home' ? '' : 'none';

  const render = routes[hash] || renderHome;
  render(app);

  // Update active nav link
  document.querySelectorAll('#mainNav a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === '#' + hash);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });

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
document.addEventListener('DOMContentLoaded', function() {
  seedDatabase().then(function() {
    return Promise.all([fbGet('games'), fbGet('results')]);
  }).then(function(vals) {
    var games = vals[0], results = vals[1];
    cachedGames = games ? (Array.isArray(games) ? games : fbToArray(games)) : [];
    cachedResults = results ? (Array.isArray(results) ? results : fbToArray(results)) : [];
    navigate();
  }).catch(function(err) {
    console.error('Firebase load failed:', err);
    navigate();
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
