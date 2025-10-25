import mongoose, { Schema } from 'mongoose'
/**
 * Model Queue Schedule
 */
const manageQueueSchema = new Schema({
  data: {
    type: Schema.Types.Mixed
  },
  name: {
    type: String
  },
  worker: {
    type: String
  },
  uniqueCode: String,
  hit: { type: Number, default: 0 },
  bizId: { type: Schema.ObjectId },
  schedule: { type: Date, default: Date.now() },
  progress: {
    type: String, enum: ['WAITING', 'PROGRESS', 'SUCCESS', 'ERROR'], default: 'WAITING'
  },
  note: {
    type: String
  },
  priority: { // Ưu tiên
    type: Number, default: 10
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (obj, ret) => { delete ret._id }
  }
})

manageQueueSchema.index({ progress: 1, priority: 1, schedule: -1, createdAt: 1 })

manageQueueSchema.index({ uniqueCode: 1 }, { unique: true, sparse: true })

manageQueueSchema.methods = {
  view(full) {
    const view = {
      // simple view
      id: this.id,
      data: this.data,
      hit: this.hit,
      bizId: this.bizId,
      uniqueCode: this.uniqueCode,
      schedule: this.schedule,
      progress: this.progress,
      name: this.name,
      worker: this.worker,
      note: this.note,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }

    return full ? {
      ...view
      // add properties for a full view
    } : view
  }
}

const model = mongoose.model('ManageQueue', manageQueueSchema)

export const schema = model.schema

export const manageQueueModel = {
  progress: model.schema.tree.progress,
}

export default model
