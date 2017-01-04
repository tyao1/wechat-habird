import wrap from '../utils/wrap';
import debugFunc from 'debug';
import { User, Score, Record } from '../models/index';
import throwjs from 'throw.js';
// import OAuth from 'wechat-oauth';
import jwt from 'jsonwebtoken';
import {SECRET, TOKEN_EXPIRE, callbackUrl, weAppId, weSecret, wePayConfig} from '../../config';
import moment from 'moment';
moment.locale('zh-cn');
import {api} from '../wechat';
// const client = new OAuth(weAppId, weSecret);
import urllib from 'urllib';
import qiniu from '../qiniu';
const debug = debugFunc('controllers:main');
const Payment = require('wechat-pay').Payment;

// render and set cookie
function render(res, userData, url) {
  const token = jwt.sign({id: userData._id}, SECRET, {expiresIn: TOKEN_EXPIRE});
  // res.cookie('Bearer', token, { expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 45), httpOnly: true });
  Score.aggregate(
    {
      $group : {
        _id: null,
        totalPlus: { $sum: "$plus"}, // for your case use local.user_totaldocs
        totalMinus: { $sum: "$minus" }, // for your case use local.user_totalthings
        count: { $sum: 1 } // for no. of documents count
      }
    }
  ).exec((err, data) => {
    debug('data', data);

    // 读取js ticket
    const param = {
      debug: false,
      jsApiList: ['getNetworkType', 'onMenuShareTimeline', 'onMenuShareAppMessage', 'onMenuShareQQ', 'onMenuShareWeibo', 'onMenuShareQZone'],
      url: callbackUrl + url,
    };
    api.getJsConfig(param, (errJS, jsData) => {
      if (errJS) {
        console.log('jsapierr', errJS);
        res.render('home', {userData, token, scores: data[0]});
      } else {
        debug('js data', jsData);
        res.render('home', {userData, token, scores: data[0], jsData: JSON.stringify(jsData)});
      }
    });
  });
}

export const load =  wrap(async function load(req, res, next) {
  const userId = req.user.id;
  const userInfo = await User.findOne({_id: userId}).lean();
  return render(res, userInfo, req._parsedUrl.href);
});

export const high = wrap(async function high(req, res, next) {
  const now = Date.now();
  const scores = await Promise.all([
    await Score.find({playDate: {$gt: new Date(now - 1000 * 60 * 60 * 24 * 7)}}, {from: true, plus: true}).populate('from', {nickname: true, headimgurl: true}).sort({plus: -1}).limit(20).lean().exec(),
    await Score.find({playDate: {$gt: new Date(now - 1000 * 60 * 60 * 24 * 31)}}, {from: true, plus: true}).populate('from', {nickname: true, headimgurl: true}).sort({plus: -1}).limit(20).lean().exec(),
    await Score.find({playDate: {$gt: new Date(now - 1000 * 60 * 60 * 24)}}, {from: true, plus: true}).populate('from', {nickname: true, headimgurl: true}).sort({plus: -1}).limit(20).lean().exec(),
  ]);
  // const users = await User.find({highestScore: {$gt: 0}}).limit(40).sort({highestScore: -1}).lean().exec();
  debug(scores);
    // 读取js ticket
  const param = {
    debug: false,
    jsApiList: ['onMenuShareTimeline', 'onMenuShareAppMessage', 'onMenuShareQQ', 'onMenuShareWeibo', 'onMenuShareQZone'],
    url: callbackUrl + req._parsedUrl.href,
  };
  api.getJsConfig(param, (errJS, jsData) => {
    if (errJS) {
      console.log('jsapierr', errJS);
      res.render('high', {scores});
    } else {
      debug('js data', jsData);
      res.render('high', {scores, jsData: JSON.stringify(jsData)});
    }
  });
});

export const advance = wrap(async function advance(req, res, next) {
  // const records = await Record.find({from: req.user.id}).lean();
  const param = {
    debug: false,
    jsApiList: [
      'onMenuShareTimeline',
      'onMenuShareAppMessage',
      'onMenuShareQQ',
      'onMenuShareWeibo',
      'onMenuShareQZone',
      'startRecord',
      'stopRecord',
      'onVoiceRecordEnd',
      'playVoice',
      'pauseVoice',
      'stopVoice',
      'onVoicePlayEnd',
      'uploadVoice',
      'downloadVoice',
      'chooseWXPay',
    ],
    url: callbackUrl + req._parsedUrl.href,
  };
  api.getJsConfig(param, (errJS, jsData) => {
    if (errJS) {
      console.log('jsapierr', errJS);
      res.render('advance', {});
    } else {
      debug('js data', jsData);
      res.render('advance', {jsData: JSON.stringify(jsData)});
    }
  });
});
const stateMap = {
  0: '正在膜',
  3: '处理失败',
  2: '正在处理',
  1: '等待处理',
  4: '米的错误',
};
export const list = wrap(async function list(req, res, next) {
  const records = await Record.find({from: req.user.id, paid: true}).sort({_id: -1}).lean();
  const now = Date.now();
  records.forEach(record => {
    record.state = stateMap[record.state];
    record.audio = 'http://mohastatic.taskbee.cn/' + record.audioKey;
    const time = moment(record.createdAt).add(1, 'w');
    if (time.valueOf() < now) {
      record.left = '已经续完';
    } else record.left = time.fromNow() + '到期';
  })
  res.render('list', {records});
});

  export const pay = wrap(async function pay(req, res, next) {
    const {serverId} = req.body;
    if (!serverId) {
      return res.json({err: '请先完成录音'});
    }
    api.getMedia(serverId, (err, result, mediaRes) => {
      if (err) {
        console.log(err);
        return res.json({err: '上传错误，请尝试重新录音'});
      }
      
      const fileBuffer = result;
      debug('file', fileBuffer);
      let fops = 'avthumb/mp3';
      const pipeline = 'mohaaudio';
      const record = new Record({from: req.user.id});
      const putPolicy = new qiniu.rs.PutPolicy('moha');
      const saveas = qiniu.util.urlsafeBase64Encode('moha:' + record._id + '.mp3'); 
      fops = fops+'|saveas/' + saveas;
      putPolicy.persistentOps = fops;
      putPolicy.persistentPipeline = pipeline;
      putPolicy.persistentNotifyUrl = callbackUrl + '/qiniu';
      const extra = new qiniu.io.PutExtra();
      qiniu.io.put(putPolicy.token(), null, fileBuffer, extra, function(err, ret) {
        if(!err) {
          // 上传成功， 处理返回值
          record.persistentId = ret.persistentId;
          record.key = ret.key;
          record.save()
          debug(ret.hash, ret.key, ret.persistentId);
          // res.status(200).end('ok');
          const user = User.findById(req.user.id, {openid: true}).lean().exec((errfound, user) => {
            if (!user) return res.json({err: '找不到用户！！？？'});
            let {ip} = req;
            debug(ip);
            if(ip.indexOf('::f') > -1) {
              ip = ip.substring(7);
            }
            const payment = new Payment(wePayConfig);
              const order = {
                body: '高级膜蛤',
                attach: record._id,
                out_trade_no: Date.now().toString(),
                total_fee: process.env.NODE_ENV === 'production' ? 50 : 1,
                spbill_create_ip: ip,
                openid: user.openid,
                trade_type: 'JSAPI',
              };
              payment.getBrandWCPayRequestParams(order, function(err, payargs){
                if (err) {
                  console.log(err);
                  res.json({err: '发起支付错误，请联系公众号fftaskbee'});
                } else {
                  res.json(payargs);
                }
              });
          });
          
        } else {
          // 上传失败， 处理返回代码
          console.log('uploaderr', err);
          return res.json({err: '上传错误，请重试'});
        }
      });
    });

    /*
    api.preRequest(function() {
      const accessToken = this.token.accessToken;
      
      debug(accessToken, serverId);

      if (!accessToken) {
        return res.json({err: '上传出错'});
      }
      urllib.request(`http://file.api.weixin.qq.com/cgi-bin/media/get?access_token=${accessToken}&media_id=${serverId}`, function (err, data, res) {
        if (err) {
          throw err; // you need to handle error 
        }
        console.log(res.statusCode);
        console.log(res.headers);
        // data is Buffer instance 
        console.log(data.toString());
      });
    }, []);
    */

  });

export const getRandomVoice = wrap(async function getRandomVoice(req, res, next) {
    // debug('randomrandom');
    const randomRecord = await Record.aggregate({$match: {createdAt: {$gt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30)}, paid: true}}).sample(1).exec();
    if (randomRecord.length) {
      const user = await User.findById(randomRecord[0].from, {headimgurl: true, nickname: true}).lean().exec();
      res.json({src: 'http://mohastatic.taskbee.cn/' + randomRecord[0].audioKey, user}); 
    } else {res.status(404).end()}
});