const fs = require('node:fs');
const path = require('node:path');
const handler = require('./schedule-ics-handler.js');

const DATABASE_URL = 'https://timpanogos-baseball-default-rtdb.firebaseio.com';
const OUTPUT_DIRS = [
  path.join(process.cwd(), 'out', 'api'),
  path.join(process.cwd(), 'public', 'api')
];
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

async function generateCalendarBody(team, seasonKey) {
  var response = createResponse();
  var fileName = calendarFileName(team, seasonKey);
  await handler({
    method: 'GET',
    url: 'https://timpanogosbaseball.local/api/' + fileName
  }, response);
  return response.statusCode === 200 ? response.body : '';
}

function writeCalendarToDirs(fileName, body) {
  OUTPUT_DIRS.forEach(function(outputDir) {
    var outputPath = path.join(outputDir, fileName);
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputPath, body);
  });
}

async function generateCalendarFile(team, seasonKey) {
  var body = await generateCalendarBody(team, seasonKey);
  if (!body) return false;
  writeCalendarToDirs(calendarFileName(team, seasonKey), body);
  return true;
}

function writeFallbackCalendar(calendarName) {
  var name = calendarName || 'Timpanogos Baseball Schedule';
  var body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Timpanogos Baseball//Schedule//EN',
    'X-WR-CALNAME:' + name,
    'END:VCALENDAR',
    ''
  ].join('\r\n');
  writeCalendarToDirs('schedule.ics', body);
}

async function fetchGames() {
  var response = await fetch(DATABASE_URL + '/games.json');
  if (!response.ok) throw new Error('Firebase responded with ' + response.status);
  return handler.fbToArray(await response.json());
}

async function main() {
  var games = await fetchGames();
  if (process.env.GITHUB_ACTIONS === 'true' && process.env.VERCEL !== '1') {
    var feedDir = path.join(process.cwd(), 'out', 'api', 'baseball-calendar');
    fs.mkdirSync(feedDir, { recursive: true });
    var years = new Set([2027]);
    games.forEach(function(game) {
      var match = /^(\d{4})-/.exec(game.date || '');
      if (match) years.add(Number(match[1]));
    });
    TEAMS.forEach(function(team) {
      years.forEach(function(year) {
        var filename = year + '-timp-' + team + '.ics';
        fs.writeFileSync(path.join(feedDir, filename), handler.buildCalendar(games, { team: team, allSeasons: true, year: year }));
      });
      fs.writeFileSync(path.join(feedDir, team + '.ics'), handler.buildCalendar(games, { team: team, allSeasons: true }));
    });
  }

  var combos = discoverCalendarCombos(games);
  var defaultCombo = pickDefaultCombo(combos);
  var generated = 0;

  for (var i = 0; i < combos.length; i++) {
    var combo = combos[i];
    var fileName = calendarFileName(combo.team, combo.season);
    var ok = await generateCalendarFile(combo.team, combo.season);
    if (ok) {
      generated += 1;
      console.log('Generated api/' + fileName);
    }
  }

  if (defaultCombo) {
    var defaultBody = await generateCalendarBody(defaultCombo.team, defaultCombo.season);
    if (defaultBody) writeCalendarToDirs('schedule.ics', defaultBody);
    console.log('Generated api/schedule.ics');
  } else {
    writeFallbackCalendar();
    console.log('Generated fallback api/schedule.ics');
  }

  if (!generated && !defaultCombo) {
    writeFallbackCalendar();
  }
}

main().catch(function(error) {
  console.warn('Unable to generate schedule calendars:', error && error.message ? error.message : error);
  if (process.env.GITHUB_ACTIONS === 'true' && process.env.VERCEL !== '1') {
    process.exitCode = 1;
    return;
  }
  writeFallbackCalendar();
  console.log('Generated fallback api/schedule.ics');
});
