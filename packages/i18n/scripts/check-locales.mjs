import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.resolve(__dirname, '../locales');
const files = readdirSync(localesDir).filter(f => f.endsWith('.json')).sort();

if (files.length === 0) {
  console.error('No locale files found.');
  process.exit(1);
}

function flatten(obj, prefix = '', res = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flatten(value, fullKey, res);
    } else {
      res[fullKey] = true;
    }
  }
  return res;
}

const [baseFile, ...restFiles] = files;
const base = JSON.parse(readFileSync(path.join(localesDir, baseFile), 'utf8'));
const baseKeys = Object.keys(flatten(base));

let hasError = false;

for (const file of restFiles) {
  const data = JSON.parse(readFileSync(path.join(localesDir, file), 'utf8'));
  const keys = Object.keys(flatten(data));
  const missing = baseKeys.filter(k => !keys.includes(k));
  const extra = keys.filter(k => !baseKeys.includes(k));

  if (missing.length || extra.length) {
    hasError = true;
    if (missing.length) {
      console.error(`Missing keys in ${file}:`, missing.join(', '));
    }
    if (extra.length) {
      console.error(`Extra keys in ${file}:`, extra.join(', '));
    }
  }
}

if (hasError) {
  process.exit(1);
} else {
  console.log('All locale files have matching keys.');
}
