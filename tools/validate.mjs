#!/usr/bin/env node
// Validates every team against the JSON Schema plus the rules a schema cannot
// express, and checks that index.json matches the teams.
//
//   node tools/validate.mjs          check everything
//   node tools/validate.mjs --write  also rewrite index.json from the teams

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const write = process.argv.includes('--write');
const MAX_SOUL_BYTES = 16 * 1024;
const PLACEHOLDER = /\{\{\s*([^}]*?)\s*\}\}/g;

const errors = [];
const fail = (where, msg) => errors.push(`${where}: ${msg}`);
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

const ajv = new Ajv({ allErrors: true, strict: false });
const teamSchema = readJson(join(root, 'schema/team.schema.json'));
ajv.addSchema(teamSchema, 'team.schema.json');
const indexSchema = readJson(join(root, 'schema/index.schema.json'));
const validateTeam = ajv.getSchema('team.schema.json');
const validateIndex = ajv.compile(indexSchema);

function schemaErrors(where, validate) {
  for (const e of validate.errors ?? []) {
    fail(where, `${e.instancePath || '/'} ${e.message}${e.params?.allowedValues ? ` ${JSON.stringify(e.params.allowedValues)}` : ''}`);
  }
}

// Cron fields in order, with their numeric bounds and the names they accept.
const CRON_FIELDS = [
  { name: 'minute', min: 0, max: 59 },
  { name: 'hour', min: 0, max: 23 },
  { name: 'day of month', min: 1, max: 31 },
  { name: 'month', min: 1, max: 12, names: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] },
  { name: 'day of week', min: 0, max: 7, names: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] },
];

// One list item: `*`, a value, or a range, optionally with a `/step`.
function cronItemOk(item, spec) {
  const m = /^(\*|[^-/]+(?:-[^-/]+)?)(?:\/(\d+))?$/.exec(item);
  if (!m) return false;
  if (m[2] !== undefined && Number(m[2]) < 1) return false;
  if (m[1] === '*') return true;
  // A name counts from the field's minimum: JAN is 1, SUN is 0.
  const value = (v) => {
    if (/^\d+$/.test(v)) return Number(v);
    const i = spec.names?.indexOf(v.toUpperCase()) ?? -1;
    return i < 0 ? NaN : spec.min + i;
  };
  const bounds = m[1].split('-').map(value);
  if (bounds.some((v) => !(v >= spec.min && v <= spec.max))) return false;
  return bounds.length === 1 || bounds[0] <= bounds[1];
}

function checkSchedule(where, schedule) {
  if (/^every \d+[mhd]$/.test(schedule)) {
    if (/^every 0+[mhd]$/.test(schedule)) fail(where, 'interval must be greater than zero');
    return;
  }
  const fields = schedule.trim().split(/\s+/);
  if (fields.length !== 5) return fail(where, `"${schedule}" is not a five-field cron expression`);
  fields.forEach((f, i) => {
    const spec = CRON_FIELDS[i];
    if (!f.split(',').every((item) => cronItemOk(item, spec))) {
      fail(where, `cron ${spec.name} "${f}" is not valid (${spec.min}-${spec.max})`);
    }
  });
}

const COVER_MAX_BYTES = 300 * 1024;
const COVER_MIN_WIDTH = 1200;

// Width and height of a WebP file (lossy VP8, lossless VP8L or extended
// VP8X), or null when the bytes are not a WebP.
function webpSize(buf) {
  if (buf.length < 30 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') {
    return null;
  }
  const chunk = buf.toString('ascii', 12, 16);
  if (chunk === 'VP8X') {
    return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
  }
  if (chunk === 'VP8 ') {
    return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === 'VP8L') {
    const bits = buf.readUInt32LE(21);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
  }
  return null;
}

function checkCover(where, dir, rel) {
  const path = join(root, 'teams', dir, rel);
  const coverWhere = relative(root, path);
  if (!path.startsWith(join(root, 'teams', dir) + '/')) return fail(where, 'cover points outside the team folder');
  if (!existsSync(path)) return fail(where, `cover ${coverWhere} does not exist`);
  const buf = readFileSync(path);
  if (buf.length > COVER_MAX_BYTES) fail(coverWhere, `is ${buf.length} bytes, the limit is ${COVER_MAX_BYTES}`);
  const size = webpSize(buf);
  if (!size) return fail(coverWhere, 'is not a WebP image');
  if (size.width < COVER_MIN_WIDTH) fail(coverWhere, `is ${size.width} px wide, at least ${COVER_MIN_WIDTH} px is needed`);
  if (Math.abs(size.width / size.height - 16 / 9) > 0.02) {
    fail(coverWhere, `is ${size.width}x${size.height}; covers are 16:9`);
  }
}

function checkPlaceholders(where, text, keys) {
  for (const [, inner] of text.matchAll(PLACEHOLDER)) {
    const key = inner.startsWith('@') ? inner.slice(1) : null;
    if (key === null) fail(where, `unknown placeholder {{${inner}}}; only {{@member-key}} is supported`);
    else if (!keys.has(key)) fail(where, `{{@${key}}} names no member of this team`);
  }
}

const placeholderKeys = (text) => new Set([...text.matchAll(PLACEHOLDER)].map(([, inner]) => inner));

// Every language of a text must name the same teammates, or a Hob behaves
// differently depending on the language it was imported in.
function checkSameTeammates(where, texts) {
  const [[firstLang, first], ...rest] = Object.entries(texts).map(([lang, text]) => [lang, placeholderKeys(text)]);
  for (const [lang, keys] of rest) {
    for (const k of first) if (!keys.has(k)) fail(where, `{{${k}}} is in "${firstLang}" but not in "${lang}"`);
    for (const k of keys) if (!first.has(k)) fail(where, `{{${k}}} is in "${lang}" but not in "${firstLang}"`);
  }
}

function checkTeam(dir) {
  const where = `teams/${dir}/team.json`;
  const path = join(root, where);
  if (!existsSync(path)) return fail(`teams/${dir}`, 'missing team.json');
  let team;
  try {
    team = readJson(path);
  } catch (e) {
    return fail(where, `invalid JSON: ${e.message}`);
  }
  if (!validateTeam(team)) return schemaErrors(where, validateTeam);

  if (team.id !== dir) fail(where, `id "${team.id}" must match its folder "${dir}"`);
  checkCover(where, dir, team.cover);

  const languages = Object.keys(team.name);
  const covers = (field, text) => {
    for (const lang of languages) {
      if (!(lang in text)) fail(where, `${field} has no "${lang}" text (the team name has one)`);
    }
    for (const lang of Object.keys(text)) {
      if (!languages.includes(lang)) fail(where, `${field} has "${lang}" but the team name does not`);
    }
  };
  for (const field of ['summary', 'description', 'folder']) {
    if (team[field]) covers(field, team[field]);
  }
  if (team.group?.name) covers('group.name', team.group.name);

  const keys = new Set();
  const handles = new Set();
  for (const [i, m] of team.members.entries()) {
    const at = `members[${i}] (${m.key})`;
    if (keys.has(m.key)) fail(where, `${at}: duplicate key`);
    if (handles.has(m.handle)) fail(where, `${at}: duplicate handle "${m.handle}"`);
    keys.add(m.key);
    handles.add(m.handle);
  }

  for (const [i, m] of team.members.entries()) {
    const at = `members[${i}] (${m.key})`;
    covers(`${at}.title`, m.title);
    covers(`${at}.description`, m.description);
    covers(`${at}.soul`, m.soul);
    const souls = {};
    for (const [lang, rel] of Object.entries(m.soul)) {
      const soulPath = join(root, 'teams', dir, rel);
      const soulWhere = relative(root, soulPath);
      if (!soulPath.startsWith(join(root, 'teams', dir) + '/')) {
        fail(where, `${at}.soul.${lang} points outside the team folder`);
        continue;
      }
      if (!existsSync(soulPath)) {
        fail(where, `${at}.soul.${lang}: ${soulWhere} does not exist`);
        continue;
      }
      const size = statSync(soulPath).size;
      if (size === 0) fail(soulWhere, 'is empty');
      if (size > MAX_SOUL_BYTES) fail(soulWhere, `is ${size} bytes, the limit is ${MAX_SOUL_BYTES}`);
      souls[lang] = readFileSync(soulPath, 'utf8');
      checkPlaceholders(soulWhere, souls[lang], keys);
    }
    if (Object.keys(souls).length > 1) checkSameTeammates(`${where} ${at}.soul`, souls);
    for (const [j, job] of (m.jobs ?? []).entries()) {
      const jobAt = `${at}.jobs[${j}]`;
      covers(`${jobAt}.name`, job.name);
      covers(`${jobAt}.prompt`, job.prompt);
      checkSchedule(`${where} ${jobAt}`, job.schedule);
      for (const [lang, text] of Object.entries(job.prompt)) {
        checkPlaceholders(`${where} ${jobAt}.prompt.${lang}`, text, keys);
      }
      checkSameTeammates(`${where} ${jobAt}.prompt`, job.prompt);
    }
  }

  return {
    id: team.id,
    version: team.version,
    path: `teams/${dir}/team.json`,
    cover: `teams/${dir}/${team.cover.replace(/^\.\//, '')}`,
    name: team.name,
    summary: team.summary,
    members: team.members.length,
    faces: team.members.map((m) => ({ ...(m.face ?? {}) })),
    ...(team.tags?.length ? { tags: team.tags } : {}),
  };
}

const teamsDir = join(root, 'teams');
const entries = readdirSync(teamsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort()
  .map(checkTeam)
  .filter(Boolean);

const expected = { $schema: './schema/index.schema.json', schema: 1, teams: entries };
const expectedText = JSON.stringify(expected, null, 2) + '\n';
const indexPath = join(root, 'index.json');

if (write && errors.length === 0) {
  writeFileSync(indexPath, expectedText);
  console.log(`index.json written with ${entries.length} team(s)`);
} else if (!existsSync(indexPath)) {
  fail('index.json', 'missing; run node tools/validate.mjs --write');
} else {
  const index = readJson(indexPath);
  if (!validateIndex(index)) schemaErrors('index.json', validateIndex);
  // A team that failed its checks is missing from `expected`; comparing
  // would only blame the index for it.
  if (errors.length === 0 && readFileSync(indexPath, 'utf8') !== expectedText) {
    fail('index.json', 'out of date with the teams; run node tools/validate.mjs --write');
  }
}

if (errors.length) {
  console.error(`${errors.length} problem(s):`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}
console.log(`OK: ${entries.length} team(s), ${entries.reduce((n, t) => n + t.members, 0)} member(s)`);
