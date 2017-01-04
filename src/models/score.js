import mongoose from 'mongoose';
const {Schema} = mongoose;

const scoreSchema = new Schema({
  from: {
    type: Schema.Types.ObjectId,
    ref: 'MohaUser',
  },
  /*
  openid: {
    type: String,
    unique: false,
    index: true,
  },
  */
  plus: {
    type: Number,
    index: true,
  },
  minus: {
    type: Number,
  },
  playDate: {
    type: Date,
    index: true,
    default: Date.now,
  }
});

const scoreModel = mongoose.model('MohaScore', scoreSchema);

export default scoreModel;