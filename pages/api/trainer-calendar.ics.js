const DATABASE_URL = 'https://timpanogos-baseball-default-rtdb.firebaseio.com';
const TIME_ZONE = 'America/Denver';

function cleanText(value, fallback = '') {
  return String(value || fallback).replace(/\s+/g, ' ').trim();
}

function escapeIcsText(value) {
  return cleanText(value)
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

function parseIsoDate(value) {
  const parts = String(value || '').split('-').map((part) => Number(part));
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;
  return { year: parts[0], month: parts[1], day: parts[2] };
}

function parseTimeValue(value) {
  const text = String(value || '').trim();
  let match = text.match(/^(\d{1,2}):(\d{2})$/);
  if (match) return { hour: Number(match[1]), minute: Number(match[2]) };

  match = text.match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]m)$/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const suffix = match[3].toLowerCase();
  if (suffix === 'pm' && hour < 12) hour += 12;
  if (suffix === 'am' && hour === 12) hour = 0;
  return { hour, minute };
}

function timeZoneParts(date, timeZone) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date).reduce((map, part) => {
    map[part.type] = Number(part.value);
    return map;
  }, {});
}

function zonedDateTimeToUtc(dateParts, timeParts, timeZone) {
  const guess = new Date(Date.UTC(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    timeParts.hour,
    timeParts.minute,
    0
  ));
  const parts = timeZoneParts(guess, timeZone);
  const desiredUtc = Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day, timeParts.hour, timeParts.minute, 0);
  const formattedUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second || 0);
  return new Date(guess.getTime() + desiredUtc - formattedUtc);
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function formatIcsDate(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function normalizeUidPart(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'training';
}

function claimsToArray(claimsByDate) {
  const items = [];
  Object.keys(claimsByDate || {}).forEach((date) => {
    const claimsForDate = claimsByDate[date] || {};
    Object.keys(claimsForDate).forEach((key) => {
      const claim = claimsForDate[key];
      if (!claim || claim.status !== 'approved') return;
      items.push(Object.assign({ _key: key, date }, claim));
    });
  });
  return items;
}

function claimTimes(claim) {
  const dateParts = parseIsoDate(claim.date);
  const startParts = parseTimeValue(claim.startTimeValue || claim.timeValue || claim.time);
  if (!dateParts || !startParts) return null;

  const start = zonedDateTimeToUtc(dateParts, startParts, TIME_ZONE);
  const endParts = parseTimeValue(claim.endTimeValue || claim.endTime);
  const end = endParts
    ? zonedDateTimeToUtc(dateParts, endParts, TIME_ZONE)
    : addMinutes(start, Number(claim.durationMinutes) || 30);

  return { start, end };
}

function buildEvent(claim, trainer, index, now) {
  const times = claimTimes(claim);
  if (!times) return null;

  const requesterName = cleanText(claim.fullName);
  const summary = requesterName ? `${requesterName} - Training Session` : 'Training Session';
  const description = [
    'Timpanogos Baseball approved training appointment.',
    claim.price ? `Price: $${cleanText(claim.price)}` : '',
    claim.appointmentId ? `Appointment ID: ${cleanText(claim.appointmentId)}` : ''
  ].filter(Boolean).join('\n');

  return [
    'BEGIN:VEVENT',
    `UID:${normalizeUidPart(claim.appointmentId || claim._key)}-${index}@timpanogosbaseball-training`,
    `DTSTAMP:${formatIcsDate(now)}`,
    `DTSTART:${formatIcsDate(times.start)}`,
    `DTEND:${formatIcsDate(times.end)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `LOCATION:${escapeIcsText(claim.location || 'Timpanogos Baseball')}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Training session starts in 30 minutes.',
    'TRIGGER:-PT30M',
    'END:VALARM',
    'END:VEVENT'
  ];
}

function buildCalendar(trainer, claims) {
  const now = new Date();
  const trainerName = cleanText(trainer.name, 'Coach');
  let lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Timpanogos Baseball//Trainer Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(trainerName + ' Training Sessions')}`,
    `X-WR-CALDESC:${escapeIcsText('Approved Timpanogos Baseball training appointments.')}`,
    `X-WR-TIMEZONE:${TIME_ZONE}`
  ];

  claims
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || String(a.timeValue || a.time || '').localeCompare(String(b.timeValue || b.time || '')))
    .forEach((claim, index) => {
      const event = buildEvent(claim, trainer, index, now);
      if (event) lines = lines.concat(event);
    });

  lines.push('END:VCALENDAR');
  return lines.map(foldIcsLine).join('\r\n') + '\r\n';
}

async function readJson(path) {
  const response = await fetch(`${DATABASE_URL}/${path}.json`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Firebase responded with ${response.status}`);
  return response.json();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).end('Method Not Allowed');
    return;
  }

  const trainerId = cleanText(req.query.trainerId);
  const token = cleanText(req.query.token);
  if (!trainerId || !token) {
    res.status(404).end('Not found');
    return;
  }

  try {
    const trainer = await readJson(`trainers/${encodeURIComponent(trainerId)}`);
    if (!trainer || !trainer.calendarToken || trainer.calendarToken !== token) {
      res.status(404).end('Not found');
      return;
    }

    const claimsByDate = await readJson(`appointmentClaims/${encodeURIComponent(trainerId)}`);
    const body = buildCalendar(trainer, claimsToArray(claimsByDate));

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).end(body);
  } catch (error) {
    res.status(500).end('Could not load trainer calendar');
  }
}
