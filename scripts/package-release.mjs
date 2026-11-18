import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, '.deployment', 'release');
await fs.mkdir(out, { recursive: true });
await fs.cp(path.join(root, 'build'), path.join(out, 'build'), { recursive: true });
await fs.copyFile(path.join(root, 'app.cjs'), path.join(out, 'app.cjs'));
const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
await fs.writeFile(path.join(out, 'package.json'), JSON.stringify({ name: pkg.name, version: pkg.version, private: true, type: 'module', scripts: { start: 'node app.cjs' }, dependencies: pkg.dependencies, engines: { node: '>=22.18' } }, null, 2) + '\n');

