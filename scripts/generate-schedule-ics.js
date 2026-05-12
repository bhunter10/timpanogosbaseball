const fs = require('node:fs');
const path = require('node:path');
const handler = require('../api/schedule.ics.js');

const outputPath = path.join(process.cwd(), 'out', 'api', 'schedule.ics');

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

async function main() {
  const response = createResponse();
  await handler({ method: 'GET' }, response);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(response.statusCode === 200 ? outputPath : outputPath, response.body);
  console.log('Generated out/api/schedule.ics');
}

main().catch((error) => {
  console.warn('Unable to generate schedule.ics:', error && error.message ? error.message : error);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Timpanogos Baseball//Spring Schedule//EN',
    'X-WR-CALNAME:Timpanogos Baseball Spring Schedule',
    'END:VCALENDAR',
    ''
  ].join('\r\n'));
});
