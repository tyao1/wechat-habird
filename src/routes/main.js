import express from 'express';
import * as mainController from '../controllers/main';
import cookieParser from '../middlewares/cookie';
import {authOrNotCookie} from '../middlewares/auth';

import auth, {authUser} from '../middlewares/auth';

import {jsonParser, urlParser} from '../middlewares/parsers';

const router = express.Router();
router.get('/', cookieParser, authOrNotCookie, authUser, urlParser, mainController.load);
router.get('/high', cookieParser, authOrNotCookie, authUser, mainController.high);
router.get('/advance', cookieParser, authOrNotCookie, authUser, mainController.advance);
router.get('/list', cookieParser, authOrNotCookie, authUser, mainController.list);

router.post('/pay', cookieParser, authOrNotCookie, authUser, jsonParser, mainController.pay);

router.get('/randomVoice', mainController.getRandomVoice);

export default router;
