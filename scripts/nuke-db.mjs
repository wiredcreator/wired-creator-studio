#!/usr/bin/env node

/**
 * Drops the entire MongoDB database. Local dev use only.
 * Usage: npm run nuke
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse MONGODB_URI from .env (simple parser, no dotenv dep needed)
function loadEnv() {
  try {
    const envPath = resolve(__dirname, '..', '.env');
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env not found — rely on existing env vars
  }
}

loadEnv();

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI not found in .env or environment');
  process.exit(1);
}

// Safety: refuse to nuke production
if (uri.includes('production') || uri.includes('prod.')) {
  console.error('Refusing to nuke a production database.');
  process.exit(1);
}

const dbName = new URL(uri).pathname.slice(1) || 'unknown';

console.log(`\n  Dropping database: ${dbName}`);
console.log(`  URI: ${uri.replace(/\/\/.*@/, '//***@')}\n`);

const conn = await mongoose.connect(uri);
await conn.connection.db.dropDatabase();
console.log('  Done. Database nuked.\n');
await mongoose.disconnect();
process.exit(0);
