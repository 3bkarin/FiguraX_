import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname, extname } from 'node:path';
import assert from 'node:assert/strict';
import { calculateOrderTotals, calculateNetProfit, calculateProfitPerMember } from '../src/utils/money.js';
import { sanitizeHtml, sanitizeForSheets, sanitizeUrl } from '../src/utils/sanitize.js';

const root = resolve(new URL('../../', import.meta.url).pathname);
const frontendJs = join(root, 'frontend', 'assets', 'js');
const backendSrc = join(root, 'backend', 'src');

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.name.endsWith('.js')) out.push(p);
  }
  return out;
}

for (const file of [...walk(backendSrc), ...walk(frontendJs), join(root, 'backend', 'server.js')]) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
}

const files = walk(frontendJs);
const exportsByFile = new Map();
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  exportsByFile.set(resolve(file), new Set([
    ...source.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g),
    ...source.matchAll(/export\s+(?:const|let|var)\s+(\w+)/g),
  ].map(m => m[1])));
}
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"](\.\/[^'"]+)['"]/g)) {
    const target = resolve(dirname(file), match[2].endsWith('.js') ? match[2] : `${match[2]}.js`);
    assert.ok(existsSync(target), `${file}: missing import target ${target}`);
    const exported = exportsByFile.get(target) ?? new Set();
    for (const name of match[1].split(',').map(x => x.trim()).filter(Boolean).map(x => x.split(/\s+as\s+/)[0])) {
      assert.ok(exported.has(name), `${file}: ${name} is not exported by ${target}`);
    }
  }
}

const totals = await calculateOrderTotals([{ quantity: 2, unitPrice: 100, manufacturingCost: 40 }], 25);
assert.deepEqual(totals, { subtotal: 200, shipping: 25, total: 225, manufacturingCost: 80 });
assert.equal(calculateNetProfit(200, 80, 25, 10), 85);
assert.equal(calculateProfitPerMember(85, 5), 17);
assert.equal(sanitizeHtml('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
assert.equal(sanitizeForSheets([' a\n b '])[0], 'a  b');
assert.equal(sanitizeUrl('javascript:alert(1)'), '');
assert.equal(sanitizeUrl('https://example.com/x'), 'https://example.com/x');

const forbidden = [
  join(root, 'backend', '.env'),
  join(root, '.env'),
  join(root, 'backend', 'node_modules'),
  join(root, 'frontend', 'node_modules'),
];
for (const p of forbidden) assert.equal(existsSync(p), false, `Forbidden artifact present: ${p}`);

const authRoutes = readFileSync(join(root, 'backend', 'src', 'routes', 'auth.routes.js'), 'utf8');
const orderService = readFileSync(join(root, 'backend', 'src', 'services', 'order.service.js'), 'utf8');
const adminRoutes = readFileSync(join(root, 'backend', 'src', 'routes', 'admin.routes.js'), 'utf8');
const driveService = readFileSync(join(root, 'backend', 'src', 'services', 'drive.service.js'), 'utf8');
const fundService = readFileSync(join(root, 'backend', 'src', 'services', 'fund.service.js'), 'utf8');
const serverSource = readFileSync(join(root, 'backend', 'server.js'), 'utf8');
assert.match(authRoutes, /httpOnly:\s*true/);
assert.match(authRoutes, /sameSite:\s*process\.env\.NODE_ENV === 'production' \? 'none' : 'lax'/);
assert.doesNotMatch(authRoutes, /user:\s*result\.user,\s*sessionId/);
assert.match(serverSource, /enforceTrustedOrigin/);
assert.match(orderService, /getProductById\(item\.productId\)/);
assert.doesNotMatch(orderService, /updates\.totalPrice/);
assert.match(adminRoutes, /uploadRateLimit/);
assert.match(adminRoutes, /requirePermission\('private_file_access'\)/);
assert.match(driveService, /private_file_access/);
assert.match(fundService, /isFinanceAdmin\(adminUser\)/);

const gitignore = readFileSync(join(root, '.gitignore'), 'utf8');
assert.match(gitignore, /node_modules\//);
assert.match(gitignore, /\.env/);
assert.doesNotMatch(gitignore, /(^|\n)\*\.json(\n|$)/);
assert.doesNotMatch(gitignore, /\*\.test\.js/);

console.log('LOCAL_GATE_PASS');
console.log(`Syntax checked: ${walk(backendSrc).length + files.length + 1} JS files`);
console.log('Frontend import graph: PASS');
console.log('Money/sanitization assertions: PASS (7)');
console.log('Security invariant checks: PASS');
console.log('Secret/artifact hygiene: PASS');
