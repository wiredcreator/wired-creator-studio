import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IYouTubeTranscriptCache extends Document {
  url: string;
  transcript: string;
  title: string;
  channelName: string;
  fetchedAt: Date;
  expiresAt: Date;
}

const YouTubeTranscriptCacheSchema = new Schema<IYouTubeTranscriptCache>({
  url: { type: String, required: true, unique: true },
  transcript: { type: String, required: true },
  title: { type: String, default: '' },
  channelName: { type: String, default: '' },
  fetchedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: true },
});

YouTubeTranscriptCacheSchema.index({ url: 1 });

const YouTubeTranscriptCache: Model<IYouTubeTranscriptCache> =
  mongoose.models.YouTubeTranscriptCache ||
  mongoose.model<IYouTubeTranscriptCache>('YouTubeTranscriptCache', YouTubeTranscriptCacheSchema);

export default YouTubeTranscriptCache;
