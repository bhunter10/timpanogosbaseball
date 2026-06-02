/**
 * Build public/data/opponents-maxpreps.json from MaxPreps varsity schedules.
 * Run: npm run fetch-opponents
 * Optional: MAXPREPS_SEASONS=5 npm run fetch-opponents  (limit seasons for a quick refresh)
 */
const fs = require('node:fs');
const path = require('node:path');
const { fetchAllVarsityOpponents } = require('./maxpreps-opponents');

const outputPath = path.join(process.cwd(), 'public', 'data', 'opponents-maxpreps.json');
const maxSeasons = process.env.MAXPREPS_SEASONS ? Number(process.env.MAXPREPS_SEASONS) : null;

async function main() {
  console.log('Fetching MaxPreps varsity opponents...');
  const payload = await fetchAllVarsityOpponents({
    maxSeasons: Number.isFinite(maxSeasons) && maxSeasons > 0 ? maxSeasons : null
  });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2) + '\n');

  const errors = payload.seasons.filter(function(row) { return row.error; });
  console.log('Wrote ' + payload.opponentCount + ' opponents to ' + outputPath);
  console.log('Seasons scanned: ' + payload.seasonCount + (errors.length ? ' (' + errors.length + ' failed)' : ''));
  if (errors.length) {
    errors.forEach(function(row) {
      console.warn('  ' + row.year + ': ' + row.error);
    });
  }
}

main().catch(function(err) {
  console.error(err);
  process.exit(1);
});
