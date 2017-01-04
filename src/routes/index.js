import express from 'express';
import main from './main';
import * as config from '../../config.js';
import wrap from '../utils/wrap';

const router = express.Router();
import {api} from '../wechat';
import qiniu from '../qiniu';
import debugFunc from 'debug';
import {jsonParser, urlParser} from '../middlewares/parsers';
import {Record} from '../models';
const debug = debugFunc('controllers:routesindex');

const middleware = require('wechat-pay').middleware;

router.use('/', main);

debug(config.wePayConfig);
router.use('/wepay', middleware(config.wePayConfig).getNotify().done(function(message, req, res, next) {
  debug('wtfff');
  debug(message);

  const { openid, order_id, attach } = message;
  debug(openid, order_id, attach)
  if (attach) {
  	Record.update({_id: attach}, {$set: {paid: true}}).exec();
  } else res.reply(new Error('wtf'));

}));

router.use('/qiniu', jsonParser, wrap(async function qiniuNotify(req, res, next) {
  const {id, items} = req.body;
  if (!items[0]) {
    return  res.status(200).end();
  }
  const {code, key} = items[0];
  debug(req.body);
  Record.update({persistentId: id}, {$set: {state: code, audioKey: key}}).exec((err, res) => {
    debug(err, res);
  });
  if (code === 0) {
    // 上传成功删除老的
    const record = await Record.findOne({persistentId: id}, {key: true}).lean().exec();
    debug(qiniu.prototype);
    const client = new qiniu.rs.Client();

    //你要测试的空间， 并且这个key在你空间中存在
    const bucket = 'moha';
    const key = record.key;

    //删除资源
    client.remove(bucket, key, function(err, ret) {
      if (!err) {
        debug('remove success');
      } else {
        debug('remove errr');
      }
    });


  }
  debug(req.body);
  res.status(200).end();
}));

export default router;
