const fs = require('node:fs');
const path = require('node:path');
const handler = require('./schedule-ics-handler.js');

const DATABASE_URL = 'https://timpanogos-baseball-default-rtdb.firebaseio.com';
const OUTPUT_DIR = path.join(process.cwd(), 'out', 'api');
const TEAMS = ['varsity', 'jv', 'sophomore'];
const SEASON_ORDER = { spring: 1, summer: 2, fall: 3 };

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    end(body) {
      this.body = body || '';
    }
  };
}

function fbToArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return Object.keys(value).sort(function(a, b) {
    var numA = Number(a);
    var numB = Number(b);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  }).map(function(key) {
    return value[key];
  }).filter(Boolean);
}

function getSeasonFromDate(date) {
  var parts = String(date || '').split('-').map(Number);
  if (parts.length !== 3 || parts.some(function(part) { return !Number.isFinite(part); })) return 'spring';
  if (parts[1] >= 6 && parts[1] <= 8) return 'summer';
  if (parts[1] >= 9 && parts[1] <= 11) return 'fall';
  return 'spring';
}

function getSeasonGroupKey(game) {
  var season = getSeasonFromDate(game && game.date);
  var year = Number(String((game && game.date) || '').split('-')[0]);
  return season + '-' + (Number.isFinite(year) ? year : 'unknown');
}

function normalizeTeam(value) {
  var team = String(value || '').trim().toLowerCase();
  return TEAMS.indexOf(team) >= 0 ? team : 'varsity';
}

function discoverCalendarCombos(games) {
  var combos = new Map();
  (games || []).forEach(function(game) {
    if (!game || !game.date) return;
    var team = normalizeTeam(game.teamLevel);
    var seasonKey = getSeasonGroupKey(game);
    var id = team + '|' + seasonKey;
    if (!combos.has(id)) {
      combos.set(id, { team: team, season: seasonKey });
    }
  });
  return Array.from(combos.values());
}

function pickDefaultCombo(combos) {
  if (!combos.length) return null;
  var ranked = combos.slice().sort(function(a, b) {
    var aParts = a.season.split('-');
    var bParts = b.season.split('-');
    var aYear = Number(aParts[1]) || 0;
    var bYear = Number(bParts[1]) || 0;
    if (aYear !== bYear) return bYear - aYear;
    return (SEASON_ORDER[bParts[0]] || 0) - (SEASON_ORDER[aParts[0]] || 0);
  });
  return ranked.find(function(combo) { return combo.team === 'varsity'; }) || ranked[0];
}

function calendarFileName(team, seasonKey) {
  return 'schedule-' + team + '-' + seasonKey + '.ics';
}

async function generateCalendarFile(team, seasonKey, outputPath) {
  var response = createResponse();
  var query = new URLSearchParams({ team: team, season: seasonKey });
  await handler({
    method: 'GET',
    url: 'https://timpanogosbaseball.local/api/schedule.ics?' + query.toString()
  }, response);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, response.body);
  return response.statusCode === 200;
}

function writeFallbackCalendar(outputPath, calendarName) {
  var name = calendarName || 'Timpanogos Baseball Schedule';
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Timpanogos Baseball//Schedule//EN',
    'NAME:' + name,
    'X-WR-CALNAME:' + name,
    'END:VCALENDAR',
    ''
  ].join('\r\n'));
}

async function fetchGames() {
  var response = await fetch(DATABASE_URL + '/games.json');
  if (!response.ok) throw new Error('Firebase responded with ' + response.status);
  return fbToArray(await response.json());
}

async function main() {
  var games = await fetchGames();
  var combos = discoverCalendarCombos(games);
  var defaultCombo = pickDefaultCombo(combos);
  var generated = 0;

  for (var i = 0; i < combos.length; i++) {
    var combo = combos[i];
    var fileName = calendarFileName(combo.team, combo.season);
    var outputPath = path.join(OUTPUT_DIR, fileName);
    var ok = await generateCalendarFile(combo.team, combo.season, outputPath);
    if (ok) {
      generated += 1;
      console.log('Generated out/api/' + fileName);
    }
  }

  if (defaultCombo) {
    var defaultPath = path.join(OUTPUT_DIR, 'schedule.ics');
    await generateCalendarFile(defaultCombo.team, defaultCombo.season, defaultPath);
    console.log('Generated out/api/schedule.ics');
  } else {
    writeFallbackCalendar(path.join(OUTPUT_DIR, 'schedule.ics'));
    console.log('Generated fallback out/api/schedule.ics');
  }

  if (!generated && !defaultCombo) {
    writeFallbackCalendar(path.join(OUTPUT_DIR, 'schedule.ics'));
  }
}

main().catch(function(error) {
  console.warn('Unable to generate schedule calendars:', error && error.message ? error.message : error);
  writeFallbackCalendar(path.join(OUTPUT_DIR, 'schedule.ics'));
  console.log('Generated fallback out/api/schedule.ics');
});
