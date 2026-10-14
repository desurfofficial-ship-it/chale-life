/**
 * E-009 analysis config — extends the repo's vite.config.ts with a plugin
 * that prints per-module rendered (minified) sizes from generateBundle.
 * Run: npx vite build --config scripts/e009.vite.config.mjs
 * Nothing is written to dist that the normal build doesn't produce.
 */
import base from '../vite.config.ts';

const moduleSizes = {
  name: 'e009-module-sizes',
  generateBundle(_opts, bundle) {
    const rows = [];
    for (const [name, chunk] of Object.entries(bundle)) {
      if (chunk.type !== 'chunk') continue;
      const mods = chunk.modules || {};
      for (const [id, info] of Object.entries(mods)) {
        rows.push({
          chunk: name,
          size: info.renderedLength ?? 0,
          id: id.replace(/^.*chale-life\//, ''),
        });
      }
    }
    rows.sort((a, b) => b.size - a.size);
    const total = rows.reduce((s, r) => s + r.size, 0);
    console.log(`== rendered sizes: ${rows.length} modules, ${(total / 1024).toFixed(0)} kB total ==`);
    for (const r of rows.slice(0, 30)) {
      console.log(`${(r.size / 1024).toFixed(1).padStart(8)} kB  [${r.chunk}] ${r.id}`);
    }
    // group by package
    const pkg = new Map();
    const pkgRe = /node_modules\/(@[^/]+\/[^/]+|[^/]+)\//;
    for (const r of rows) {
      const m = pkgRe.exec(r.id);
      const key = m ? `npm:${m[1]}` : r.id.includes('colliders.json') ? 'DATA:colliders.json' : 'APP:src';
      pkg.set(key, (pkg.get(key) || 0) + r.size);
    }
    console.log('-- by package --');
    for (const [k, v] of [...pkg.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`${(v / 1024).toFixed(1).padStart(8)} kB  ${k}`);
    }
  },
};

export default {
  ...base,
  plugins: [...(base.plugins || []), moduleSizes],
  logLevel: 'warn',
};
