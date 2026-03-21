/* eslint-disable @typescript-eslint/no-explicit-any */
import { Schema } from 'mongoose';

export function applySoftDelete(schema: Schema) {
  schema.add({
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  });

  schema.pre(/^find/, function (this: any) {
    if (this._includeSoftDeleted) return;
    const conditions = this.getQuery();
    if (conditions.deletedAt === undefined) {
      this.where({ deletedAt: null });
    }
  });

  schema.pre(/^count/, function (this: any) {
    const conditions = this.getQuery();
    if (conditions.deletedAt === undefined) {
      this.where({ deletedAt: null });
    }
  });

  schema.methods.softDelete = function (userId?: string) {
    this.deletedAt = new Date();
    if (userId) this.deletedBy = userId;
    return this.save();
  };

  schema.methods.restore = function () {
    this.deletedAt = null;
    this.deletedBy = null;
    return this.save();
  };
}
