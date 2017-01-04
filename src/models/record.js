import mongoose from 'mongoose';
const {Schema} = mongoose;

const recordSchema = new Schema({
  from: {
    type: Schema.Types.ObjectId,
    ref: 'MohaUser',
    index: true,
  },
  state: {
    type: Number,
    default: 1,
  },
  persistentId: {
    type: String,
    index: true,
  },
  audioKey: {
    type: String,
  },
  key: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  paid: {
    type: Boolean,
    default: false,
  }
});

const recordModel = mongoose.model('MohaRecord', recordSchema);

export default recordModel;
