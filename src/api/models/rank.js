import mongoose, { Schema } from 'mongoose'

const rankSchema = new Schema(
  {
    bizId: { type: String, required: true },
    name: { type: String, trim: true, required: true },
    phone: String,
    email: String,
    desc: { type: String, trim: true },
    picture: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (obj, ret) => { delete ret._id }
    }
  })

rankSchema.index({ bizId: 1, createdAt: -1 })

rankSchema.methods = {
  view(full) {
    let view = {
      // simple view
      id: this.id,
      name: this.name,
      desc: this.desc,
      picture: this.picture,
    }

    return full ? {
      ...view
      // add properties for a full view
    } : view
  }
}


const model = mongoose.model('Rank', rankSchema)

export const schema = model.schema

export const rankModel = {
  name: model.schema.tree.name,
  desc: model.schema.tree.desc,
  picture: model.schema.tree.picture,
  rank: model.schema.tree.rank,
  alias: model.schema.tree.alias,
};

export default model
