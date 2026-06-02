var DATABASE_URL = 'https://timpanogos-baseball-default-rtdb.firebaseio.com';
var DEFAULT_CALENDAR_NAME = 'Timpanogos Baseball Spring Schedule';
var TIME_ZONE = 'America/Denver';
var DEFAULT_DURATION_MINUTES = 150;
var TEAM_LABELS = {
  varsity: 'Varsity',
  jv: 'JV',
  sophomore: 'Sophomores'
};
var SEASON_ORDER = { spring: 1, summer: 2, fall: 3 };

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

function getDateParts(value) {
  var parts = String(value || '').split('-').map(Number);
  if (parts.length !== 3 || parts.some(function(part) { return !Number.isFinite(part); })) return null;
  return { year: parts[0], month: parts[1], day: parts[2] };
}

function getSeasonFromDate(game) {
  var parts = getDateParts(game && game.date);
  if (!parts) return 'spring';
  if (parts.month >= 6 && parts.month <= 8) return 'summer';
  if (parts.month >= 9 && parts.month <= 11) return 'fall';
  return 'spring';
}

function getGameYear(game) {
  var parts = getDateParts(game && game.date);
  return parts ? parts.year : null;
}

function normalizeTeam(value) {
  var team = String(value || '').trim().toLowerCase();
  return TEAM_LABELS[team] ? team : 'varsity';
}

function normalizeSeason(value) {
  var season = String(value || '').trim().toLowerCase();
  return SEASON_ORDER[season] ? season : '';
}

function getLatestSeasonKey(games) {
  var latest = '';
  var best = null;
  (games || []).forEach(function(game) {
    var year = getGameYear(game);
    if (!year) return;
    var season = getSeasonFromDate(game);
    var rank = { year: year, seasonOrder: SEASON_ORDER[season] || 0 };
    if (!best || rank.year > best.year || (rank.year === best.year && rank.seasonOrder > best.seasonOrder)) {
      best = rank;
      latest = season + '-' + year;
    }
  });
  return latest;
}

function parseSeasonYear(seasonKey, games) {
  var match = String(seasonKey || '').match(/^(spring|summer|fall)-(\d{4})$/);
  if (match) {
    return { season: match[1], year: Number(match[2]) };
  }
  var seasonOnly = normalizeSeason(seasonKey);
  if (seasonOnly) {
    return { season: seasonOnly, year: null };
  }
  var fallback = getLatestSeasonKey(games);
  var fallbackMatch = fallback.match(/^(spring|summer|fall)-(\d{4})$/);
  if (fallbackMatch) {
    return { season: fallbackMatch[1], year: Number(fallbackMatch[2]) };
  }
  return { season: 'spring', year: null };
}

function parseQueryFromRequestUrl(url) {
  var parsedUrl = new URL(url || '/api/schedule.ics', 'https://timpanogosbaseball.local');
  var query = {
    team: parsedUrl.searchParams.get('team') || '',
    season: parsedUrl.searchParams.get('season') || ''
  };
  var fileMatch = parsedUrl.pathname.match(/\/schedule-([a-z]+)-(spring|summer|fall)-(\d{4})\.ics$/i);
  if (fileMatch) {
    if (!query.team) query.team = fileMatch[1];
    if (!query.season) query.season = fileMatch[2].toLowerCase() + '-' + fileMatch[3];
  }
  return query;
}

function filterGames(games, query) {
  var team = normalizeTeam(query.team);
  var seasonYear = parseSeasonYear(query.season, games);
  return (games || []).filter(function(game) {
    var gameTeam = normalizeTeam(game && game.teamLevel);
    if (gameTeam !== team) return false;
    if (!seasonYear.year) return getSeasonFromDate(game) === seasonYear.season;
    return getSeasonFromDate(game) === seasonYear.season && getGameYear(game) === seasonYear.year;
  });
}

function buildCalendarName(games, query) {
  var team = normalizeTeam(query && query.team);
  var seasonYear = parseSeasonYear(query && query.season, games);
  var seasonLabel = seasonYear.season.charAt(0).toUpperCase() + seasonYear.season.slice(1);
  var yearLabel = seasonYear.year ? ' ' + seasonYear.year : '';
  return 'Timpanogos Baseball ' + TEAM_LABELS[team] + ' ' + seasonLabel + yearLabel + ' Schedule';
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
  var season = getSeasonFromDate(game);
  var seasonLabel = season.charAt(0).toUpperCase() + season.slice(1);
  var description = ['Timpanogos Baseball ' + seasonLabel + ' ' + dateParts[0] + ' season game.'];

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

function buildCalendar(games, query) {
  var now = new Date();
  var filteredGames = filterGames(games, query);
  var calendarName = buildCalendarName(games, query);
  var calendarDescription = 'Subscribe to ' + calendarName + '.';
  var lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Timpanogos Baseball//Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'NAME:' + escapeIcsText(calendarName),
    'X-WR-CALNAME:' + escapeIcsText(calendarName),
    'X-WR-CALDESC:' + escapeIcsText(calendarDescription),
    'X-WR-TIMEZONE:' + TIME_ZONE
  ];

  filteredGames
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
    var query = parseQueryFromRequestUrl(req.url);
    var response = await fetch(DATABASE_URL + '/games.json');
    if (!response.ok) throw new Error('Firebase responded with ' + response.status);
    var games = fbToArray(await response.json());
    sendCalendar(res, 200, buildCalendar(games, query));
  } catch (error) {
    var query = parseQueryFromRequestUrl(req.url);
    var calendarName = buildCalendarName([], query);
    sendCalendar(res, 500, [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Timpanogos Baseball//Schedule//EN',
      'NAME:' + escapeIcsText(calendarName),
      'X-WR-CALNAME:' + escapeIcsText(calendarName),
      'END:VCALENDAR'
    ].join('\r\n') + '\r\n');
  }
};

module.exports.buildCalendarName = buildCalendarName;
