import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IXPConfig extends Document {
  taskCompleted: number;
  newIdeaSaved: number;
  newScriptCreated: number;
  newBrainDump: number;
  sideQuestMin: number;
  sideQuestMax: number;
  voiceStorm: number;
  updatedAt: Date;
  createdAt: Date;
}

const XPConfigSchema = new Schema<IXPConfig>(
  {
    taskCompleted: { type: Number, default: 50 },
    newIdeaSaved: { type: Number, default: 5 },
    newScriptCreated: { type: Number, default: 25 },
    newBrainDump: { type: Number, default: 15 },
    sideQuestMin: { type: Number, default: 5 },
    sideQuestMax: { type: Number, default: 25 },
    voiceStorm: { type: Number, default: 15 },
  },
  { timestamps: true }
);

const XPConfig: Model<IXPConfig> =
  mongoose.models.XPConfig || mongoose.model<IXPConfig>('XPConfig', XPConfigSchema);

export default XPConfig;

/** Default values — used as fallback and for first-time creation. */
export const XP_DEFAULTS = {
  taskCompleted: 50,
  newIdeaSaved: 5,
  newScriptCreated: 25,
  newBrainDump: 15,
  sideQuestMin: 5,
  sideQuestMax: 25,
  voiceStorm: 15,
} as const;
