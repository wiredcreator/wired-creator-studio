/**
 * One-time migration: CustomPrompt -> AIDocument
 *
 * Run with: npx tsx src/scripts/migrate-custom-prompts.ts
 *
 * Safe to run multiple times (checks for existing AIDocument by title+category+scope).
 */
import mongoose from 'mongoose';
import dbConnect from '../lib/db';

async function migrate() {
  await dbConnect();

  const CustomPrompt = (await import('../models/CustomPrompt')).default;
  const AIDocument = (await import('../models/AIDocument')).default;

  const activePrompts = await CustomPrompt.find({ isActive: true }).lean();

  console.log(`Found ${activePrompts.length} active custom prompts to migrate.`);

  let migrated = 0;
  let skipped = 0;

  for (const prompt of activePrompts) {
    const existing = await AIDocument.findOne({
      title: prompt.name,
      category: prompt.category,
      scope: 'global',
    });

    if (existing) {
      console.log(`  Skipped (already exists): "${prompt.name}" [${prompt.category}]`);
      skipped++;
      continue;
    }

    await AIDocument.create({
      category: prompt.category,
      scope: 'global',
      userId: null,
      title: prompt.name,
      content: prompt.promptText,
      sortOrder: 0,
      createdBy: prompt.createdBy,
    });

    console.log(`  Migrated: "${prompt.name}" [${prompt.category}]`);
    migrated++;
  }

  console.log(`\nDone. Migrated: ${migrated}, Skipped: ${skipped}`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
