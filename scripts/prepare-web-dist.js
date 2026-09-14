const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const index = path.join(dist, 'index.html');

if (!fs.existsSync(index)) {
  throw new Error('dist/index.html missing — run expo export -p web first');
}

let html = fs.readFileSync(index, 'utf8');
const fromEnv = (process.env.EXPO_BASE_URL || '').trim();
const inferred = html.includes('/Gift-decider/') ? '/Gift-decider' : '';
const base = fromEnv || inferred;

if (base && !/<base\s/i.test(html)) {
  const href = `${base.replace(/\/$/, '')}/`;
  html = html.replace(/<head>/i, `<head>\n    <base href="${href}" />`);
  fs.writeFileSync(index, html);
}

fs.copyFileSync(index, path.join(dist, '404.html'));
fs.writeFileSync(path.join(dist, '.nojekyll'), '');
console.log(`Prepared dist for SPA hosting (404.html + .nojekyll)${base ? ` base=${base}` : ''}`);
