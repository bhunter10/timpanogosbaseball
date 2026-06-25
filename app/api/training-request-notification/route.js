import { NextResponse } from 'next/server';

const MAX_FIELD_LENGTH = 240;

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

function formatMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return '';
  return '$' + number.toFixed(0);
}

function emailList(value) {
  return String(value || '')
    .split(/[,\n;]+/)
    .map((email) => email.trim())
    .filter(Boolean);
}

function isEmailAddress(value) {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
}

function buildRow(label, value) {
  if (!value) return '';
  return `<tr><th align="left" style="padding:8px 14px 8px 0;color:#334155;font-weight:700;vertical-align:top;">${escapeHtml(label)}</th><td style="padding:8px 0;color:#0f172a;">${escapeHtml(value)}</td></tr>`;
}

function buildEmailHtml(request, adminUrl) {
  const time = [request.time, request.endTime].filter(Boolean).join(' - ');
  const price = formatMoney(request.price);

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f8fafc;color:#0f172a;font-family:Arial,sans-serif;">
    <div style="max-width:620px;margin:0 auto;padding:28px 20px;">
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:24px;">
        <p style="margin:0 0 8px;color:#991b1b;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;">Pending training request</p>
        <h1 style="margin:0 0 18px;font-size:24px;line-height:1.25;">New baseball training request</h1>
        <table role="presentation" style="border-collapse:collapse;width:100%;font-size:15px;line-height:1.45;">
          ${buildRow('Player', request.fullName)}
          ${buildRow('Phone', request.phone)}
          ${buildRow('Email', request.email)}
          ${buildRow('Coach', request.trainerName)}
          ${buildRow('Date', request.date)}
          ${buildRow('Time', time)}
          ${buildRow('Duration', request.durationMinutes ? request.durationMinutes + ' minutes' : '')}
          ${buildRow('Price', price)}
          ${buildRow('Location', request.location)}
          ${buildRow('Request ID', request.appointmentId)}
        </table>
        <p style="margin:22px 0 0;color:#475569;font-size:14px;">Approve or deny this request in the training admin.</p>
        <p style="margin:18px 0 0;">
          <a href="${escapeHtml(adminUrl)}" style="display:inline-block;background:#991b1b;color:#ffffff;text-decoration:none;border-radius:6px;padding:11px 16px;font-weight:700;">Open requests</a>
        </p>
      </div>
    </div>
  </body>
</html>`;
}

function buildEmailText(request, adminUrl) {
  const lines = [
    'New pending baseball training request',
    '',
    `Player: ${cleanText(request.fullName)}`,
    `Phone: ${cleanText(request.phone)}`,
    `Email: ${cleanText(request.email)}`,
    `Coach: ${cleanText(request.trainerName)}`,
    `Date: ${cleanText(request.date)}`,
    `Time: ${[request.time, request.endTime].filter(Boolean).join(' - ')}`,
    `Duration: ${request.durationMinutes ? cleanText(request.durationMinutes) + ' minutes' : ''}`,
    `Price: ${formatMoney(request.price)}`,
    `Location: ${cleanText(request.location)}`,
    `Request ID: ${cleanText(request.appointmentId)}`,
    '',
    `Open requests: ${adminUrl}`
  ];
  return lines.filter((line) => line.trim() !== ':' && !line.endsWith(': ')).join('\n');
}

export async function POST(request) {
  const apiKey = process.env.RESEND_API_KEY;
  const recipientCandidates = emailList(process.env.TRAINING_REQUEST_NOTIFY_TO);
  const to = recipientCandidates.filter(isEmailAddress);
  const from = process.env.RESEND_FROM;

  if (!apiKey || !to.length || !from) {
    console.warn('Training request email skipped: missing env var', {
      hasResendApiKey: Boolean(apiKey),
      hasTrainingRequestNotifyTo: Boolean(to.length),
      hasResendFrom: Boolean(from)
    });
    return NextResponse.json({ skipped: true, reason: 'Email notification is not configured.' });
  }

  if (recipientCandidates.length !== to.length) {
    console.warn('Training request email skipped invalid recipients', {
      recipientCount: to.length,
      invalidRecipientCount: recipientCandidates.length - to.length
    });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const trainingRequest = payload && payload.request ? payload.request : {};
  if (!trainingRequest.appointmentId || !trainingRequest.fullName || !trainingRequest.phone || !trainingRequest.email) {
    return NextResponse.json({ error: 'Missing required request fields.' }, { status: 400 });
  }

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const adminUrl = new URL(`${basePath}/admin/training/requests/`, request.url).toString();
  const subjectName = cleanText(trainingRequest.fullName, 'New player');
  const subjectDate = cleanText(trainingRequest.date);

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to,
      reply_to: trainingRequest.email ? cleanText(trainingRequest.email) : undefined,
      subject: `Pending training request: ${subjectName}${subjectDate ? ' on ' + subjectDate : ''}`,
      html: buildEmailHtml(trainingRequest, adminUrl),
      text: buildEmailText(trainingRequest, adminUrl)
    })
  });

  const result = await resendResponse.json().catch(() => ({}));
  if (!resendResponse.ok) {
    console.error('Training request email failed in Resend', result);
    return NextResponse.json({ error: 'Resend could not send the notification.', details: result }, { status: 502 });
  }

  console.info('Training request email sent', { id: result.id || null, recipientCount: to.length });
  return NextResponse.json({ id: result.id || null });
}
