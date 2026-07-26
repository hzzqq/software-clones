import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const ASSIGN = /(api[_-]?key|apikey|secret|access[_-]?token|auth[_-]?token|private[_-]?key|client[_-]?secret|password|passwd|pwd)\s*[:=]\s*(['"])(?!\$\{)([^'"]{12,})\2/gi;
const PLACEHOLDER = /^(your[-_]?|changeme|change-me|placeholder|example|sample|dummy|test|xxxx|fake|demo|<|process\.env|import\.meta|https?:)/i;
const apps = ['apiclient', 'excalidraw', 'glance', 'it-tools', 'kanban', 'kener', 'lofi', 'markdown', 'memos', 'nonio', 'photopea', 'tvtime'];
let hits = 0;
for (const a of apps) {
  for (const side of ['client/src', 'server/src']) {
    const dir = join(a, side);
    if (!existsSync(dir)) continue;
    const walk = (d) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const f = join(d, e.name);
        if (e.isDirectory()) {
          if (e.name === 'node_modules' || e.name === 'dist' || e.name.startsWith('.')) continue;
          walk(f);
        } else if (/\.tsx?$/.test(e.name) && !/\.(test|spec)\.tsx?$/.test(e.name)) {
          const txt = readFileSync(f, 'utf8');
          txt.split('\n').forEach((line, i) => {
            let m;
            ASSIGN.lastIndex = 0;
            while ((m = ASSIGN.exec(line))) {
              const val = m[3];
              if (val.includes('/') || PLACEHOLDER.test(val)) continue;
              console.log(`${a}/${side} ${e.name}:${i + 1}: ${line.trim().slice(0, 100)}`);
              hits++;
            }
          });
        }
      }
    };
    walk(dir);
  }
}
console.log('TOTAL_HITS', hits);

