# 微信膜蛤跳

开源才是追吼的，[线上游戏地址，需要在微信中打开](http://moha.taskbee.cn)

## 功能说明

在膜蛤跳基础上，增加了微信登陆，排行榜，微信录音，七牛解析存储，socket.io实时成绩功能。

## 使用到的第三方服务

微信，七牛

## 需要手动补充的文件 too simple 的办法
根目录下config.js, 配置了jwt以及微信部分
```
export const SECRET = 'xxxxxxxx';
export const MONGO_URL = process.env.MONGO_URL;
export const PORT = process.env.PORT || 7070;
export const TOKEN_EXPIRE = 60 * 60 * 24 * 30 * 2; // x秒jwt到期

export const callbackUrl = process.env.NODE_ENV === 'production' ? 'http://moha.taskbee.cn' : 'http://moha.taskbee.cn/testmo';
export const weAppId = 'xxxxxx';
export const weSecret = 'xxxxxxx;

import fs from 'fs';
const jiongjubu = 'xxxxxxxx';
export const wePayConfig = {
  partnerKey: xxxx,
  appId: xxxx,
  mchId: xxxxx,
  pfx: fs.readFileSync('xxxx'),
  notifyUrl: callbackUrl + '/wepay',
};
```

src/qiniu.js, 设置七牛的key
```
import qiniu from 'qiniu';

qiniu.conf.ACCESS_KEY = 'xxxxxxxx';
qiniu.conf.SECRET_KEY = 'xxxx';

export default qiniu;
```

## 游戏来源
[原版游戏在此](https://github.com/tusenpo/FlappyFrog)

## License
[Creative Commons Attribution-NonCommercial 4.0 International License](https://creativecommons.org/licenses/by-nc/4.0/)
