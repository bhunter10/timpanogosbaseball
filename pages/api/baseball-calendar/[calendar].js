import scheduleCalendar from '../../../scripts/schedule-ics-handler.js';

export default function handler(req, res) {
  if (!/^(?:\d{4}-timp-)?(varsity|jv|sophomore)\.ics$/.test(req.query.calendar)) {
    return res.status(404).end('Calendar not found');
  }

  return scheduleCalendar(req, res);
}
