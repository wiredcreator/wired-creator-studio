import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections from growing exponentially
 * during API Route usage in serverless environments.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? {
  conn: null,
  promise: null,
};

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

// Models referenced via .populate() must be registered before queries run.
// In Vercel serverless, each route bundles independently and top-level
// side-effect imports get tree-shaken. Registering here inside the function
// that every route calls guarantees schemas exist before any populate.
function ensureModelsRegistered() {
  if (!mongoose.models.ContentIdea) require('@/models/ContentIdea');
  if (!mongoose.models.ToneOfVoiceGuide) require('@/models/ToneOfVoiceGuide');
  if (!mongoose.models.User) require('@/models/User');
}

async function dbConnect(): Promise<typeof mongoose> {
  if (!MONGODB_URI) {
    throw new Error(
      'Please define the MONGODB_URI environment variable inside .env'
    );
  }

  if (cached.conn) {
    ensureModelsRegistered();
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  ensureModelsRegistered();
  return cached.conn;
}

export default dbConnect;
