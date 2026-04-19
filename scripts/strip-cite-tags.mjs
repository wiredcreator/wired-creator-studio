/**
 * One-time script to strip <cite> tags from existing idea resources in MongoDB.
 *
 * Usage: node scripts/strip-cite-tags.mjs
 *
 * Requires MONGODB_URI in .env (reads from wired-creator-studio/.env)
 */

import { MongoClient } from 'mongodb';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI not found in .env');
  process.exit(1);
}

const client = new MongoClient(uri);

async function run() {
  await client.connect();
  const db = client.db();
  const ideas = db.collection('contentideas');

  // Find all ideas that have resources with cite tags
  const cursor = ideas.find({
    'resources.content': { $regex: '<cite|</cite>' }
  });

  let updated = 0;
  let totalCleaned = 0;

  for await (const idea of cursor) {
    let changed = false;
    const cleanedResources = idea.resources.map((r) => {
      if (r.content && (r.content.includes('<cite') || r.content.includes('</cite>'))) {
        const cleaned = r.content
          .replace(/<cite[^>]*>/g, '')
          .replace(/<\/cite>/g, '');
        if (cleaned !== r.content) {
          changed = true;
          totalCleaned++;
          return { ...r, content: cleaned };
        }
      }
      return r;
    });

    if (changed) {
      await ideas.updateOne(
        { _id: idea._id },
        { $set: { resources: cleanedResources } }
      );
      updated++;
      console.log(`Cleaned: "${idea.title}" (${totalCleaned} resources fixed)`);
    }
  }

  console.log(`\nDone. ${updated} ideas updated, ${totalCleaned} resources cleaned.`);
  await client.close();
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
