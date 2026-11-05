import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const root = new URL('.', import.meta.url);
const out = new URL('./dist/', root);
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const file of ['index.html', 'style.css', 'app.js', 'game-core.mjs', 'manifest.webmanifest', 'sw.js', 'favicon.svg']) {
  await cp(new URL(`./${file}`, root), new URL(`./dist/${file}`, root));
}
// Keep the source modular for tests and maintenance, while shipping a single
// classic script that also works when a player opens index.html via file://.
const [coreSource, appSource] = await Promise.all([
  readFile(new URL('./game-core.mjs', root), 'utf8'),
  readFile(new URL('./app.js', root), 'utf8')
]);
const exports = [...coreSource.matchAll(/^export\s+(?:const|function|async function)\s+(\w+)/gm)].map(match => match[1]);
if (!exports.length) throw new Error('No game-core exports found for the browser bundle.');
const coreBundle = `window.FamousCore=(()=>{\n${coreSource.replace(/^export\s+/gm, '')}\nreturn {${exports.join(',')}};\n})();\n`;
const appBundle = appSource.replace(/^import\s+\{([^}]+)\}\s+from\s+['"]\.\/game-core\.mjs['"];\s*/m, 'const {$1}=window.FamousCore;\n');
if (appBundle === appSource) throw new Error('Could not replace the game-core import in app.js.');
const bundle = `${coreBundle}\n${appBundle}`;
await Promise.all([
  writeFile(new URL('./app.bundle.js', root), bundle),
  writeFile(new URL('./dist/app.bundle.js', root), bundle)
]);
console.log('Built FAMOUS into dist/');
