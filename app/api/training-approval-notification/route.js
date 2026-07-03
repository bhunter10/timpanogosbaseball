import { NextResponse } from 'next/server';

const MAX_FIELD_LENGTH = 240;
const TRAINING_TIME_ZONE = 'America/Denver';

function cleanText(value, fallback = '') {
  return String(value || fallback).replace(/\s+/g, ' ').trim().slice(0, MAX_FIELD_LENGTH);
}

function escapeHtml(value) {
  return cleanText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeIcsText(value) {
  return cleanText(value)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function isEmailAddress(value) {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
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

function formatUtcIcsDate(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function formatDisplayDate(request) {
  const parts = parseIsoDate(request.date);
  if (!parts) return cleanText(request.date);
  return new Date(parts.year, parts.month - 1, parts.day).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

function requestTimeRange(request) {
  return [request.time, request.endTime].filter(Boolean).join(' - ');
}

function approvedTimes(request) {
  const dateParts = parseIsoDate(request.date);
  const startParts = parseTimeValue(request.startTimeValue || request.timeValue || request.time);
  if (!dateParts || !startParts) return null;

  const start = zonedDateTimeToUtc(dateParts, startParts, TRAINING_TIME_ZONE);
  const endParts = parseTimeValue(request.endTimeValue || request.endTime);
  const end = endParts
    ? zonedDateTimeToUtc(dateParts, endParts, TRAINING_TIME_ZONE)
    : addMinutes(start, Number(request.durationMinutes) || 30);

  return { start, end };
}

function buildCalendarInvite(request) {
  const times = approvedTimes(request);
  if (!times) return null;

  const uid = `${cleanText(request.appointmentId || request._key || Date.now())}@timpanogosbaseball.com`;
  const summary = `Timpanogos Baseball Training with ${cleanText(request.trainerName, 'Coach')}`;
  const description = [
    `Player: ${cleanText(request.fullName)}`,
    `Coach: ${cleanText(request.trainerName)}`,
    `Phone: ${cleanText(request.trainerPhone)}`,
    `Price: ${request.price ? '$' + cleanText(request.price) : ''}`
  ].filter((line) => !line.endsWith(': ')).join('\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Timpanogos Baseball//Training//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(uid)}`,
    `DTSTAMP:${formatUtcIcsDate(new Date())}`,
    `DTSTART:${formatUtcIcsDate(times.start)}`,
    `DTEND:${formatUtcIcsDate(times.end)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `LOCATION:${escapeIcsText(request.location || 'Timpanogos Baseball')}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Training session starts in 30 minutes.',
    'TRIGGER:-PT30M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

function buildEmailHtml(request) {
  const coach = cleanText(request.trainerName, 'your coach');
  const date = formatDisplayDate(request);
  const time = requestTimeRange(request);
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f8fafc;color:#0f172a;font-family:Arial,sans-serif;">
    <div style="max-width:620px;margin:0 auto;padding:28px 20px;">
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:24px;">
        <p style="margin:0 0 8px;color:#166534;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;">Training approved</p>
        <h1 style="margin:0 0 14px;font-size:24px;line-height:1.25;">Your baseball training session is confirmed</h1>
        <p style="margin:0 0 18px;color:#334155;font-size:15px;line-height:1.55;">Your session with ${escapeHtml(coach)} has been approved. A calendar invite is attached to this email.</p>
        <table role="presentation" style="border-collapse:collapse;width:100%;font-size:15px;line-height:1.45;">
          <tr><th align="left" style="padding:8px 14px 8px 0;color:#334155;font-weight:700;vertical-align:top;">Player</th><td style="padding:8px 0;color:#0f172a;">${escapeHtml(request.fullName)}</td></tr>
          <tr><th align="left" style="padding:8px 14px 8px 0;color:#334155;font-weight:700;vertical-align:top;">Date</th><td style="padding:8px 0;color:#0f172a;">${escapeHtml(date)}</td></tr>
          <tr><th align="left" style="padding:8px 14px 8px 0;color:#334155;font-weight:700;vertical-align:top;">Time</th><td style="padding:8px 0;color:#0f172a;">${escapeHtml(time)}</td></tr>
          <tr><th align="left" style="padding:8px 14px 8px 0;color:#334155;font-weight:700;vertical-align:top;">Location</th><td style="padding:8px 0;color:#0f172a;">${escapeHtml(request.location || 'Timpanogos Baseball')}</td></tr>
          <tr><th align="left" style="padding:8px 14px 8px 0;color:#334155;font-weight:700;vertical-align:top;">Coach</th><td style="padding:8px 0;color:#0f172a;">${escapeHtml(coach)}</td></tr>
          ${request.price ? `<tr><th align="left" style="padding:8px 14px 8px 0;color:#334155;font-weight:700;vertical-align:top;">Price</th><td style="padding:8px 0;color:#0f172a;">$${escapeHtml(request.price)}</td></tr>` : ''}
        </table>
        <p style="margin:22px 0 0;color:#475569;font-size:14px;">Please text your coach if you need to change or cancel this session.</p>
      </div>
    </div>
  </body>
</html>`;
}

function buildEmailText(request) {
  return [
    'Your baseball training session is confirmed.',
    '',
    `Player: ${cleanText(request.fullName)}`,
    `Date: ${formatDisplayDate(request)}`,
    `Time: ${requestTimeRange(request)}`,
    `Location: ${cleanText(request.location || 'Timpanogos Baseball')}`,
    `Coach: ${cleanText(request.trainerName)}`,
    request.price ? `Price: $${cleanText(request.price)}` : '',
    '',
    'A calendar invite is attached to this email.',
    'Please text your coach if you need to change or cancel this session.'
  ].filter(Boolean).join('\n');
}

export async function POST(request) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;

  if (!apiKey || !from) {
    console.warn('Training approval email skipped: missing env var', {
      hasResendApiKey: Boolean(apiKey),
      hasResendFrom: Boolean(from)
    });
    return NextResponse.json({ skipped: true, reason: 'Email notification is not configured.' });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const trainingRequest = payload && payload.request ? payload.request : {};
  const to = cleanText(trainingRequest.email);
  if (!trainingRequest.fullName || !isEmailAddress(to) || !trainingRequest.date) {
    return NextResponse.json({ error: 'Missing required approval email fields.' }, { status: 400 });
  }

  const calendarInvite = buildCalendarInvite(trainingRequest);
  if (!calendarInvite) {
    return NextResponse.json({ error: 'Could not build calendar invite.' }, { status: 400 });
  }

  const coach = cleanText(trainingRequest.trainerName, 'Coach');
  const date = formatDisplayDate(trainingRequest);

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to,
      subject: `Training approved: ${coach} on ${date}`,
      html: buildEmailHtml(trainingRequest),
      text: buildEmailText(trainingRequest),
      attachments: [
        {
          filename: 'training-session.ics',
          content: Buffer.from(calendarInvite, 'utf8').toString('base64')
        }
      ]
    })
  });

  const result = await resendResponse.json().catch(() => ({}));
  if (!resendResponse.ok) {
    console.error('Training approval email failed in Resend', result);
    return NextResponse.json({ error: 'Resend could not send the approval email.', details: result }, { status: 502 });
  }

  console.info('Training approval email sent', { id: result.id || null });
  return NextResponse.json({ id: result.id || null });
}
