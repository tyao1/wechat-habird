import socketIo from 'socket.io';
import debugFunc from 'debug';
import jwt from 'jsonwebtoken';
import {SECRET} from './../config';
const debug = debugFunc('socket-middleware:message');

import {Score, User} from './models';
const io = socketIo({path: '/ws'});
io.on('connection', (socket) => {
  debug('[socket]on connection');
  // websocket用户登录
  socket.auth = false;
  setTimeout(() => {
    if (!socket.auth) {
      debug('长时间没有登陆，断线 %s', socket.id);
      socket.disconnect('unauthorized');
    }
  }, 1000 * 24);

  socket.on('bearer', (data) => {
    // if (socket.auth) return;
    debug('[socket]on bearer');
    jwt.verify(data, SECRET, (err, decoded) => {
      if (err) {
        socket.emit('bearer', {message: '验证出错', data: err, errorCode: -1}, () => {
          debug('unauthorized');
          socket.disconnected('unauthorized');
        });
      } else {
        debug('decoded', decoded);
        const {id: userId} = decoded;
        if (!userId) {
          socket.emit('bearer', {message: '没有id', errorCode: -1}, () => {
            socket.disconnected('unauthorized');
          });
        }
        socket.user = decoded;
        socket.score = 0;
        socket.auth = true;
        socket.emit('bearer', {data: true});
      }
    });
  });


  socket.on('score', () => {
    socket.score++;
    debug('score', socket.score);
  });

  socket.on('gameover', (data) => {
    if (!socket.user || !socket.user.id || !data || data.plus === undefined || !data.minus) {
      return;
    } 
    if (Math.abs(data.plus - socket.score) > 30) {
      return;
    }
    socket.score = 0;
    // 开始保存分数，处理总分数
    debug('gameover', data);
    const userId = socket.user.id;
    debug('userId', userId);
    User.findOne({ _id: userId }).exec((err, user) => {
      if (err) {
        debug(err);
        return;
      }
      const { plus, minus } = data;
      debug('user', user);
      if (!user) return;
      user.totalPlus += plus;
      user.totalMinus += minus;
      if (user.highestScore < plus) {
        user.highestScore = plus;
      }
      user.save();
      const score = new Score({
        from: user,
        plus,
        minus,
      });
      score.save((err) => {
        debug('saveerr', err);
      });
      if (plus > 10) {
        io.emit('newScore', {
          nickname: user.nickname,
          headimgurl: user.headimgurl,
          plus,
        });
      }
      
    });
  });

  socket.on('disconnect', () => {
    debug('[socket]disconnect');
  });

  socket.on('error', (err) => {
    debug('error', err);
  })
});

export default io;
