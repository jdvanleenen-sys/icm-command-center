// phone.mjs — the phone copy. snapshotHtml() writes the live dashboard as one fragment with
// the board inlined, for publishing as a private claude.ai page. applyPhoneAnswers() takes the
// page's "answers" documents (read by Claude with ArtifactData) and applies each new one here,
// exactly as a dashboard reply would. GMSD never reaches the phone page itself.
import fs from 'node:fs';
import path from 'node:path';
import { answerItem } from './actions.mjs';
import { buildBoard } from './board.mjs';

function between(html, tag) {
  const m = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  if (!m) throw new Error(`live-dashboard.html has no <${tag}> block`);
  return m[1];
}

export function snapshotHtml(home) {
  const page = fs.readFileSync(path.join(home, 'live-dashboard.html'), 'utf8');
  const json = JSON.stringify(buildBoard(home)).replace(/</g, '\\u003c');
  return [
    '<title>GMSD Board</title>',
    `<style>${between(page, 'style')}</style>`,
    `<main>${between(page, 'main')}</main>`,
    `<script>window.BOARD_SNAPSHOT = ${json};</script>`,
    `<script>${between(page, 'script')}</script>`,
  ].join('\n');
}

// docs: [{ docId, id, choice, text, status }]. Returns one result per new doc, for Claude to
// write back as status "applied" or "refused" with the reason.
export function applyPhoneAnswers(home, docs) {
  return docs
    .filter((d) => d.status === 'new')
    .map((d) => {
      const out = answerItem(home, String(d.id || ''), String(d.choice || ''), String(d.text || ''));
      return out.ok
        ? { docId: d.docId, status: 'applied', followUp: out.followUp || null }
        : { docId: d.docId, status: 'refused', reason: out.error };
    });
}
