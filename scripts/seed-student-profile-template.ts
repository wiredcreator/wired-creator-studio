/**
 * One-time script to seed the Student Profile Template as an AI Document.
 *
 * Usage:
 *   npx tsx scripts/seed-student-profile-template.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });
import mongoose from 'mongoose';

// Import the template content
import { STUDENT_PROFILE_TEMPLATE } from '../src/lib/ai/student-profile-template';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not set');
  process.exit(1);
}

// Inline the schema to avoid Next.js module issues
const AIDocumentSchema = new mongoose.Schema(
  {
    category: { type: String, required: true },
    scope: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, default: null },
    title: { type: String, required: true },
    content: { type: String, required: true },
    sortOrder: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  { timestamps: true }
);

const AIDocument =
  mongoose.models.AIDocument || mongoose.model('AIDocument', AIDocumentSchema);

// Find an admin user to set as createdBy
const UserSchema = new mongoose.Schema({ role: String });
const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function main() {
  await mongoose.connect(MONGODB_URI!);
  console.log('Connected to MongoDB');

  // Check if one already exists
  const existing = await AIDocument.findOne({
    category: 'student_profile',
    scope: 'global',
  });

  if (existing) {
    console.log('Student profile template already exists in AI Documents. Updating content...');
    existing.content = STUDENT_PROFILE_TEMPLATE;
    existing.title = 'Student Profile Template';
    await existing.save();
    console.log('Updated successfully.');
    await mongoose.disconnect();
    return;
  }

  // Find an admin user for createdBy
  const admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    console.error('No admin user found. Create an admin user first.');
    await mongoose.disconnect();
    process.exit(1);
  }

  await AIDocument.create({
    category: 'student_profile',
    scope: 'global',
    userId: null,
    title: 'Student Profile Template',
    content: STUDENT_PROFILE_TEMPLATE,
    sortOrder: 0,
    createdBy: admin._id,
  });

  console.log('Student Profile Template seeded successfully as a global AI Document.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
