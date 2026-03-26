import mongoose, { Schema, Document, Model } from 'mongoose';

// --- Cached Video Sub-document ---
export interface ICachedVideo {
  videoId: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  channelName: string;
  viewCount: number;
  publishedAt: Date;
  description: string;
}

const CachedVideoSchema = new Schema<ICachedVideo>(
  {
    videoId: { type: String, required: true },
    title: { type: String, default: '' },
    url: { type: String, default: '' },
    thumbnailUrl: { type: String, default: '' },
    channelName: { type: String, default: '' },
    viewCount: { type: Number, default: 0 },
    publishedAt: { type: Date },
    description: { type: String, default: '' },
  },
  { _id: false }
);

// --- YouTube Channel Cache Document ---
export interface IYouTubeChannelCache extends Document {
  channelUrl: string;
  channelName: string;
  videos: ICachedVideo[];
  scrapedAt: Date;
  expiresAt: Date;
}

const YouTubeChannelCacheSchema = new Schema<IYouTubeChannelCache>(
  {
    channelUrl: { type: String, required: true, unique: true },
    channelName: { type: String, default: '' },
    videos: [CachedVideoSchema],
    scrapedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  }
);

// TTL index — MongoDB auto-deletes documents when expiresAt is reached
YouTubeChannelCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const YouTubeChannelCache: Model<IYouTubeChannelCache> =
  mongoose.models.YouTubeChannelCache ||
  mongoose.model<IYouTubeChannelCache>('YouTubeChannelCache', YouTubeChannelCacheSchema);

export default YouTubeChannelCache;
