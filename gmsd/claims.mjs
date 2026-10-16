// claims.mjs — who started what. Written only by `gmsd start`; read by the board and checker.
// A claim on a unit that is now done is history, not an open claim.
import fs from 'node:fs';
import path from 'node:path';

const claimsDir = (home) => path.join(home, 'state', 'claims');

export function chatName(slug, unitId) {
  return `${slug} / ${unitId}`;
}

export function readClaims(home) {
  const dir = claimsDir(home);
  if (!fs.existsSync(dir)) return [];
  const claims = [];
  for (const slug of fs.readdirSync(dir)) {
    const sub = path.join(dir, slug);
    if (!fs.statSync(sub).isDirectory()) continue;
    for (const f of fs.readdirSync(sub).filter((x) => x.endsWith('.json'))) {
      claims.push(JSON.parse(fs.readFileSync(path.join(sub, f), 'utf8')));
    }
  }
  return claims;
}

export function writeClaim(home, claim) {
  const dir = path.join(claimsDir(home), claim.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${claim.unit}.json`), `${JSON.stringify(claim, null, 2)}\n`, 'utf8');
}
