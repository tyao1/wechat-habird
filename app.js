import express from 'express';
import httpProxy from 'http-proxy';
import mongoose from 'mongoose';
import serveStatic from 'serve-static';
import * as config from './config.js';
import http from 'http';
import io from './src/socket';
import routes from './src/routes/index';
import debugFunc from 'debug';
const debug = debugFunc('controllers:app');

import {updateId} from './src/utils/updateScoreRecord';

import exphbs from 'express-handlebars';

mongoose.Promise = global.Promise;
mongoose.connect(config.MONGO_URL, {
  // auth: {
  //  authdb: 'heart',
  //  authMechanism: 'SCRAM-SHA-1',
  //}
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));


const app = express();
// server
const server = http.createServer(app);
io.attach(server);
app.disable('x-powered-by');
// [TODO] CONFIG IP
app.set('trust proxy', 'loopback, 10.144.49.213, ::ffff:10.144.49.213');

app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

app.use('/', routes);
app.use(serveStatic('./public'));


// 404
app.use((req, res) => {
  res.render('error', {errorCode: 404, message: '这里什么都没有啦！'});
});

// error handling
app.use((err, req, res, next) => {
  if (err) {
    console.log(err);
    res.render('error.handlebars', {errorCode: err.errorCode || 500, message: err.message});
  } else next();
});

server.listen(8888, () => {
  console.log('API Listenning on port 8888');
});

// updateId();
