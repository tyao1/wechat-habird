import {Score, User} from '../models/index';
import wrap from '../utils/wrap';

export const updateId = async function updateId() {
  const scores = await Score.find({}, {openid: true}).lean().exec();
  console.log(scores);
  scores.forEach(score => {
    console.log(score, score.openid, score._id);
    if (score.openid) {
      User.findOne({openid: score.openid}, {_id: true})
        .lean().exec((err, user) => {
           if (user) {
            console.log(user);
            Score.update({_id: score._id}, {$set: {from: user._id}}).exec((err) => {
              console.log(err);
            });
            console.log('update')
          } else {
            console.log('wtf');
          }
        });
    }
  });
};