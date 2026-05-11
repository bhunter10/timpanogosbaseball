const DATABASE_URL = 'https://timpanogos-baseball-default-rtdb.firebaseio.com';
const DEFAULT_CALENDAR_NAME = 'Timpanogos Baseball Spring Schedule';
const TIME_ZONE = 'America/Denver';
const DEFAULT_DURATION_MINUTES = 150;

function calendarResponse(body, status = 200, extraHeaders = {}) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*',
      ...extraHeaders
    }
  });
}

function fbToArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return Object.keys(value).sort(function(a, b) {
    const numA = Number(a);
    const numB = Number(b);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  }).map(function(key) {
    return value[key];
  }).filter(Boolean);
}

function isSpringGame(game) {
  if (!game || !game.date) return false;
  const month = Number(String(game.date).split('-')[1]);
  return month >= 2 && month <= 6;
}

function getGameYear(game) {
  const year = Number(String((game && game.date) || '').split('-')[0]);
  return Number.isFinite(year) ? year : null;
}

function buildCalendarName(games) {
  const years = games.map(getGameYear).filter(function(year) {
    return year !== null;
  });

  if (!years.length) return DEFAULT_CALENDAR_NAME;

  return 'Timpanogos Baseball Spring ' + Math.max.apply(Math, years) + ' Schedule';
}

function parseGameTime(time) {
  const match = String(time || '').match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) return { hour: 15, minute: 30 };

  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3] ? match[3].toUpperCase() : '';

  if (meridiem === 'PM' && hour !== 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;

  return { hour, minute };
}

function getTimeZoneOffsetMs(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
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

  const asUtc = Date.UTC(
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
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offset = getTimeZoneOffsetMs(utcGuess, timeZone);
  let utc = new Date(utcGuess.getTime() - offset);
  const correctedOffset = getTimeZoneOffsetMs(utc, timeZone);

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
  const limit = 74;
  let folded = '';

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
  const dateParts = String(game.date || '').split('-').map(Number);
  if (dateParts.length !== 3 || dateParts.some(function(part) { return !Number.isFinite(part); })) {
    return null;
  }

  const parsedTime = parseGameTime(game.time);
  const startsAt = zonedDateToUtc(dateParts[0], dateParts[1], dateParts[2], parsedTime.hour, parsedTime.minute, TIME_ZONE);
  const endsAt = new Date(startsAt.getTime() + DEFAULT_DURATION_MINUTES * 60000);
  const opponent = game.opponent || 'Opponent TBD';
  const location = game.locationAddress || game.address || game.location || '';
  const summary = 'Timpanogos Baseball vs ' + opponent;
  const description = ['Timpanogos Baseball spring season game.'];

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
  const now = new Date();
  const springGames = games.filter(isSpringGame);
  const calendarName = buildCalendarName(springGames);
  let lines = [
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
      const eventLines = buildGameEvent(game, index, now);
      if (eventLines) lines = lines.concat(eventLines);
    });

  lines.push('END:VCALENDAR');
  return lines.map(foldIcsLine).join('\r\n') + '\r\n';
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS'
    }
  });
}

export async function GET() {
  try {
    const response = await fetch(DATABASE_URL + '/games.json', {
      next: { revalidate: 300 }
    });
    if (!response.ok) throw new Error('Firebase responded with ' + response.status);
    const games = fbToArray(await response.json());
    return calendarResponse(buildCalendar(games));
  } catch (error) {
    return calendarResponse([
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Timpanogos Baseball//Spring Schedule//EN',
      'X-WR-CALNAME:' + escapeIcsText(DEFAULT_CALENDAR_NAME),
      'END:VCALENDAR'
    ].join('\r\n') + '\r\n', 500);
  }
}
