#!/usr/bin/env node
/**
 * previews-worker init <host> [--force]
 *
 * Run from a client repo. Scaffolds preview/ (static files plus its wrangler.jsonc)
 * for <host>, e.g. acme.example.dev, and keeps it out of the shipped theme.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const templates = join(dirname(fileURLToPath(import.meta.url)), '..', 'templates', 'preview');
const toolingFiles = ['wrangler.jsonc', '.assetsignore', '_headers', 'robots.txt'];
const contentFiles = ['index.html', '404.html'];
const exportIgnoreRule = '/preview export-ignore';

const usage = 'usage: pnpm dlx github:JacobBlana/previews-worker init <host> [--force]';

function fail(message) {
    console.error(message);
    process.exit(1);
}

function repoRoot() {
    const result = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' });

    if (result.error || result.status !== 0) {
        fail('run this from inside a git repository');
    }

    return result.stdout.trim();
}

function writeTemplate(file, replacements, overwrite) {
    const target = join('preview', file);

    if (existsSync(target) && !overwrite) {
        console.log(`kept existing ${target}`);

        return;
    }

    let contents = readFileSync(join(templates, file), 'utf8');

    for (const [placeholder, value] of Object.entries(replacements)) {
        contents = contents.replaceAll(placeholder, value);
    }

    mkdirSync('preview', { recursive: true });
    writeFileSync(target, contents);
    console.log(`wrote ${target}`);
}

function addExportIgnoreRule() {
    const existing = existsSync('.gitattributes') ? readFileSync('.gitattributes', 'utf8') : '';

    if (existing.split('\n').includes(exportIgnoreRule)) {
        return;
    }

    const separator = existing === '' || existing.endsWith('\n') ? '' : '\n';
    appendFileSync('.gitattributes', `${separator}${exportIgnoreRule}\n`);
    console.log('updated .gitattributes');
}

const [command, host, ...flags] = process.argv.slice(2);

if (command !== 'init' || !host) {
    fail(usage);
}

if (!/^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(host) || host.split('.').length < 3) {
    fail('pass the full preview hostname, e.g. acme.example.dev');
}

const force = flags.includes('--force');
const name = `preview-${host.split('.')[0]}`;

process.chdir(repoRoot());

for (const file of toolingFiles) {
    writeTemplate(file, { __NAME__: name, __HOST__: host }, force);
}

for (const file of contentFiles) {
    writeTemplate(file, {}, false);
}

addExportIgnoreRule();

console.log(`
Commit and push:

  git add preview .gitattributes
  git commit -m "Add client preview"
  git push

Then in the Cloudflare dashboard, Workers & Pages > Create > Import a repository:

  Repository       this repo
  Worker name      ${name}
  Root directory   preview
  Build command    (empty)
  Deploy command   npx wrangler deploy

Under Settings > Build, set build watch paths to include "preview/*" and turn off
non-production branch builds. The first build publishes https://${host}`);
