import jwt from 'jsonwebtoken';
import Errors from 'throw.js';
import { SECRET, TOKEN_EXPIRE, callbackUrl, weAppId, weSecret } from '../../config';
import OAuth from 'wechat-oauth';
import { User, Score } from '../models/index';
import debugFunc from 'debug';
const debug = debugFunc('controllers:authmiddle');
import throwjs from 'throw.js';
import fs from 'fs';

const client = new OAuth(weAppId, weSecret, function (openid, callback) {
  // 传入一个根据openid获取对应的全局token的方法
  // 在getUser时会通过该方法来获取token
  fs.readFile(openid +':access_token.txt', 'utf8', function (err, txt) {
    if (err) {return callback(err);}
    callback(null, JSON.parse(txt));
  });
}, function (openid, token, callback) {
  // 请将token存储到全局，跨进程、跨机器级别的全局，比如写到数据库、redis等
  // 这样才能在cluster模式及多机情况下使用，以下为写入到文件的示例
  // 持久化时请注意，每个openid都对应一个唯一的token!
  fs.writeFile(openid + ':access_token.txt', JSON.stringify(token), callback);
});

export function authUser(req, res, next) {
  const {code} = req.query;
  debug('authauth');
  if (!req.user || !req.user.id) {
    const ua = req.headers['user-agent'];
    if (!ua || !/micromessenger/.test(ua.toLowerCase())) {
      return res.render('pc');
    }
    if (!code) {
      const url = client.getAuthorizeURL(callbackUrl + req._parsedUrl.href, '', 'snsapi_userinfo');
      return res.redirect(url);
    }
    client.getAccessToken(code, function (err, result) {
      if (err) {
        console.log(err);
        return next(new throwjs.serviceUnavailable('获取微信信息出错'));
      }
      debug(result);
      // const accessToken = result.data.access_token;
      const openid = result.data.openid;
      client.getUser(openid, function (err, result) {
        if (err) {
          debug(err);
          return next(new throwjs.serviceUnavailable('获取微信用户信息出错'));
        }

        const userInfo = result;
        debug(userInfo);


        User.findOne({ openid }, { _id: true }).lean().exec((err, found) => {
          debug('find', found);
          if (!found) {
            const user = new User(userInfo);
            user.save(function save(a, b) {
              debug('save result', a, b);
            });
            req.user = {
              id: user._id,
            };
            const token = jwt.sign({ id: user._id }, SECRET, { expiresIn: TOKEN_EXPIRE });
            res.cookie('Bearer', token, { expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 45), httpOnly: true });
          } else {
            req.user = {
              id: found._id,
            };
            const token = jwt.sign({ id: found._id }, SECRET, { expiresIn: TOKEN_EXPIRE });
            res.cookie('Bearer', token, { expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 45), httpOnly: true });
            User.update({_id: found._id}, userInfo).exec();
          }
          return next();
        });
      });
    });
    // console.log('nothing');
    return null;
  }

  User.count({_id: req.user.id}).limit(1).exec(function(err, exist) {
    debug('exist', exist);
    if (!err && exist > 0) {
      return next();
    }
    if (!code) {
      const url = client.getAuthorizeURL(callbackUrl + req._parsedUrl.href, '', 'snsapi_userinfo');
      return res.redirect(url);
    }
    client.getAccessToken(code, function (errCode, result) {
      if (errCode) {
        console.log(errCode);
        return next(new throwjs.serviceUnavailable('获取微信信息出错'));
      }
      debug(result);
      // const accessToken = result.data.access_token;
      const openid = result.data.openid;

      client.getUser(openid, function (errUser, result) {
        if (errUser) {
          debug(errUser);
          return next(new throwjs.serviceUnavailable('获取微信用户信息出错'));
        }

        const userInfo = result;
        debug(userInfo);

        // console.log('process user');

        User.findOne({ openid }, { _id: true }).lean().exec((errFind, found) => {
          debug('find', found);
          if (!found) {
            const user = new User(userInfo);
            req.user = {
              id: user._id,
            };
            const token = jwt.sign({ id: user._id }, SECRET, { expiresIn: TOKEN_EXPIRE });
            res.cookie('Bearer', token, { expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 45), httpOnly: true });
            user.save(function save(a, b) {
              debug('save result', a, b);
            });
          } else {
            req.user = {
              id: found._id,
            };
            const token = jwt.sign({ id: found._id }, SECRET, { expiresIn: TOKEN_EXPIRE });
            res.cookie('Bearer', token, { expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 45), httpOnly: true });
            User.update({_id: found._id}, userInfo).exec();
          }
          next();
        });
      });
    });
  });
}

export default function auth(req, res, next){
  let token;
  // 判断是否是奇怪的请求
  if (req.method === 'OPTIONS' && req.headers.hasOwnProperty('access-control-request-headers')) {
    var hasAuthInAccessControl = !!~req.headers['access-control-request-headers']
      .split(',').map(function (header) {
        return header.trim();
      }).indexOf('authorization');

    if (hasAuthInAccessControl) {
      return next();
    }
  }
  if (req.method === 'GET') {
    // 从cookie获得token
    token = req.cookies.Bearer;
  }
  else {
    if (req.headers && req.headers.authorization) {
      var parts = req.headers.authorization.split(' ');
      if (parts.length === 2) {
        var scheme = parts[0];
        var credentials = parts[1];
        if (/^Bearer$/i.test(scheme)) {
          token = credentials;
        } else {
          return next(new Errors.unauthorized('请重新登录', 'NEED_RELOGIN'));
        }
      } else {
        return next(new Errors.unauthorized('请重新登录', 'NEED_RELOGIN'));
      }
    }
  }

  if (!token) {
    return next(new Errors.unauthorized('请重新登录', 'NEED_RELOGIN'));
  }

  jwt.verify(token, SECRET, function(err, decoded) {
    if (err) return next(new Errors.unauthorized('请重新登录', 'NEED_RELOGIN'));
    req.user = decoded;
    next();
  });
}

export function authOrNot(req, res, next) {
  let token;
  // 判断是否是奇怪的请求
  if (req.method === 'OPTIONS' && req.headers.hasOwnProperty('access-control-request-headers')) {
    const hasAuthInAccessControl = !!~req.headers['access-control-request-headers']
      .split(',').map(function (header) {
        return header.trim();
      }).indexOf('authorization');

    if (hasAuthInAccessControl) {
      return next();
    }
  }
  if (req.method === 'GET') {
    token = req.cookies.Bearer;
  }
  else {
    if (req.headers && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2) {
        const scheme = parts[0];
        const credentials = parts[1];
        if (/^Bearer$/i.test(scheme)) {
          token = credentials;
        } else {
          return next();
        }
      } else {
        return next();
      }
    }
  }
  if (!token) {
    return next();
  }
  jwt.verify(token, SECRET, function(err, decoded) {
    if (err) return next();
    req.user = decoded;
    next();
  });
}

export function authOrNotCookie(req, res, next) {
  let token;
  // 判断是否是奇怪的请求
  if (req.method === 'OPTIONS' && req.headers.hasOwnProperty('access-control-request-headers')) {
    const hasAuthInAccessControl = !!~req.headers['access-control-request-headers']
      .split(',').map(function (header) {
        return header.trim();
      }).indexOf('authorization');

    if (hasAuthInAccessControl) {
      return next();
    }
  }
  token = req.cookies.Bearer;
  if (!token) {
    return next();
  }
  jwt.verify(token, SECRET, function(err, decoded) {
    if (err) return next();
    req.user = decoded;
    next();
  });
}
