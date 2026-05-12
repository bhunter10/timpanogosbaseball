var DATABASE_URL = 'https://timpanogos-baseball-default-rtdb.firebaseio.com';
var DEFAULT_CALENDAR_NAME = 'Timpanogos Baseball Spring Schedule';
var TIME_ZONE = 'America/Denver';
var DEFAULT_DURATION_MINUTES = 150;

function sendCalendar(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(body);
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

function isSpringGame(game) {
  if (!game || !game.date) return false;
  var month = Number(String(game.date).split('-')[1]);
  return month >= 2 && month <= 6;
}

function getGameYear(game) {
  var year = Number(String((game && game.date) || '').split('-')[0]);
  return Number.isFinite(year) ? year : null;
}

function buildCalendarName(games) {
  var years = games.map(getGameYear).filter(function(year) {
    return year !== null;
  });

  if (!years.length) return DEFAULT_CALENDAR_NAME;

  return 'Timpanogos Baseball Spring ' + Math.max.apply(Math, years) + ' Schedule';
}

function parseGameTime(time) {
  var match = String(time || '').match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) return { hour: 15, minute: 30 };

  var hour = Number(match[1]);
  var minute = match[2] ? Number(match[2]) : 0;
  var meridiem = match[3] ? match[3].toUpperCase() : '';

  if (meridiem === 'PM' && hour !== 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;

  return { hour: hour, minute: minute };
}

function getTimeZoneOffsetMs(date, timeZone) {
  var parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).formatToParts(date).reduce(function(all, part) {
    if (part.type !== 'literal') all[part.type] = part.value;
    return all;
  }, {});

  var asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );

  return asUtc - date.getTime();
}

function zonedDateToUtc(year, month, day, hour, minute, timeZone) {
  var utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  var offset = getTimeZoneOffsetMs(utcGuess, timeZone);
  var utc = new Date(utcGuess.getTime() - offset);
  var correctedOffset = getTimeZoneOffsetMs(utc, timeZone);

  if (correctedOffset !== offset) {
    utc = new Date(utcGuess.getTime() - correctedOffset);
  }

  return utc;
}

function formatIcsDate(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeIcsText(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function foldIcsLine(line) {
  var limit = 74;
  var folded = '';

  while (line.length > limit) {
    folded += line.slice(0, limit) + '\r\n ';
    line = line.slice(limit);
  }

  return folded + line;
}

function normalizeUidPart(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'game';
}

function buildGameEvent(game, index, now) {
  var dateParts = String(game.date || '').split('-').map(Number);
  if (dateParts.length !== 3 || dateParts.some(function(part) { return !Number.isFinite(part); })) {
    return null;
  }

  var parsedTime = parseGameTime(game.time);
  var startsAt = zonedDateToUtc(dateParts[0], dateParts[1], dateParts[2], parsedTime.hour, parsedTime.minute, TIME_ZONE);
  var endsAt = new Date(startsAt.getTime() + DEFAULT_DURATION_MINUTES * 60000);
  var opponent = game.opponent || 'Opponent TBD';
  var location = game.locationAddress || game.address || game.location || '';
  var summary = 'Timpanogos Baseball vs ' + opponent;
  var description = ['Timpanogos Baseball spring season game.'];

  if (game.time) description.push('First pitch: ' + game.time + '.');
  if (game.playoff) description.push('State playoff game.');

  return [
    'BEGIN:VEVENT',
    'UID:' + normalizeUidPart(game.date) + '-' + normalizeUidPart(game.time) + '-' + normalizeUidPart(opponent) + '-' + index + '@timpanogosbaseball',
    'DTSTAMP:' + formatIcsDate(now),
    'DTSTART:' + formatIcsDate(startsAt),
    'DTEND:' + formatIcsDate(endsAt),
    'SUMMARY:' + escapeIcsText(summary),
    location ? 'LOCATION:' + escapeIcsText(location) : '',
    'DESCRIPTION:' + escapeIcsText(description.join(' ')),
    'END:VEVENT'
  ].filter(Boolean);
}

function buildCalendar(games) {
  var now = new Date();
  var springGames = games.filter(isSpringGame);
  var calendarName = buildCalendarName(springGames);
  var lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Timpanogos Baseball//Spring Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:' + escapeIcsText(calendarName),
    'X-WR-TIMEZONE:' + TIME_ZONE
  ];

  springGames
    .sort(function(a, b) {
      return String(a.date || '').localeCompare(String(b.date || '')) || String(a.time || '').localeCompare(String(b.time || ''));
    })
    .forEach(function(game, index) {
      var eventLines = buildGameEvent(game, index, now);
      if (eventLines) lines = lines.concat(eventLines);
    });

  lines.push('END:VCALENDAR');
  return lines.map(foldIcsLine).join('\r\n') + '\r\n';
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, OPTIONS');
    res.end('Method Not Allowed');
    return;
  }

  try {
    var response = await fetch(DATABASE_URL + '/games.json');
    if (!response.ok) throw new Error('Firebase responded with ' + response.status);
    var games = fbToArray(await response.json());
    sendCalendar(res, 200, buildCalendar(games));
  } catch (error) {
    sendCalendar(res, 500, [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Timpanogos Baseball//Spring Schedule//EN',
      'X-WR-CALNAME:' + escapeIcsText(DEFAULT_CALENDAR_NAME),
      'END:VCALENDAR'
    ].join('\r\n') + '\r\n');
  }
};
