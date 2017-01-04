import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import debugFunc from 'debug';
const debug = debugFunc('models:user');
const {Schema} = mongoose;

const userSchema = new Schema({
  // 手机号码
  openid: {
    type: String,
    unique: true,
    index: true,
  },
  nickname: String,
  city: String,
  province: String,
  country: String,
  language: String,
  sex: Number,
  headimgurl: String,
  highestScore: {
    type: Number,
    default: 0,
    index: true,
  },
  totalMinus: {
    type: Number,
    default: 0,
  },
  totalPlus: {
    type: Number,
    default: 0,
  },
  balance: {
    type: Number,
    default: 0,
  }
});

const userModel = mongoose.model('MohaUser', userSchema);

export default userModel;