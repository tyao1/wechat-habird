(function() {


  var container = document.getElementById('container');
  var confirm = document.getElementById('confirm');

  var bar = new ProgressBar.Circle(container, {
    color: '#333',
    // This has to be the same size as the maximum width to
    // prevent clipping
    strokeWidth: 5,
    trailWidth: 1,
    // easing: 'easeInOut',
    duration: 1000,
    fill: '#ecf0f1',
    text: {
      value: '开始录音',
      autoStyleContainer: false
    },
    from: { color: '#aaa', width: 2 },
    to: { color: '#d35400', width: 3 },
    // Set default step function for all animate calls
    step: function(state, circle) {
      circle.path.setAttribute('stroke', state.color);
      circle.path.setAttribute('stroke-width', state.width);
    },
  });
  bar.text.style.fontSize = '16px';
  bar.text.innerText = '开始录音';

  var recordInterval;
  var countdown;
  function recordStop(res) {
    localId = res.localId;
    recording = false;
    clearInterval(recordInterval);

    bar.set(0);
    bar.text.innerText = '开始录音';

    notie.alert(1, '正播放录音..', countdown);
    wx.playVoice({
      localId: localId
    });
  }

  var localId;
  wx.ready(function() {
    var shareAtBegining = {
      title: '和我一起，加入膜蛤的队伍！' , // 分享标题
      desc: '用你内心深处的话语膜蛤🎶！', // 分享描述
      link: 'http://moha.taskbee.cn/advance', // 分享链接
      imgUrl: 'http://moha.taskbee.cn/images/frog.png', // 分享图标
    };
    wx.onMenuShareTimeline(shareAtBegining);
    wx.onMenuShareAppMessage(shareAtBegining);
    wx.onMenuShareQQ(shareAtBegining);
    wx.onMenuShareWeibo(shareAtBegining);
    wx.onMenuShareQZone(shareAtBegining);
    // record
    wx.onVoiceRecordEnd({
      // 录音时间超过一分钟没有停止的时候会执行 complete 回调
      complete: recordStop
    });
  });

  var recording = false;
  container.addEventListener('click', function () {
    if (recording) {
      wx.stopRecord({
        success: recordStop,
      });
    } else {
      wx.stopRecord();
      wx.startRecord({
        success: function () {
          recording = true;
          notie.alert(1, '已开始录音！再次点击录音按钮停止录音。', 2.5);
          countdown = 0;
          recordInterval = setInterval(function() {
            countdown++;
            console.log(countdown);
            bar.animate(countdown / 60);
            bar.setText(countdown + 's');
            if (countdown >= 60) {
              wx.stopRecord({
                success: recordStop,
              });
            }
          }, 1000);
        },
        fail: function() {
          alert('请允许录音哦！');
        },
      });
    }
  });

  confirm.addEventListener('click', function() {
    if (!localId) return notie.alert(2, '请先录音', 2.5);
    wx.uploadVoice({
      localId: localId, // 需要上传的音频的本地ID，由stopRecord接口获得
      isShowProgressTips: 1, // 默认为1，显示进度提示
        success: function (res) {
          if (res.errMsg === 'uploadVoice:ok') {
            notie.alert(1, '开始上传！', 1.5);
            var serverId = res.serverId; // 返回音频的服务器端ID
            superagent.post('./pay')
              .send({serverId: serverId})
              .end(function(err, res) {
                if (err || !res.ok) {
                  notie.alert(3, '高级膜蛤失败，请重试', 2.5);
                } else if (res.body.err) {
                  console.log(res.body);
                  notie.alert(3, '出现错误：' + res.body.err, 5);
                } else {
                  res.body.success = function (res) {
                    notie.alert(1, '成功膜！', 3);
                    console.log(res);
                    window.open('./list');
                  };
                  wx.chooseWXPay(res.body);
                }
              });
          } else {
            notie.alert(2, '上传失败，请重试！', 2.5);
          }
        }
    });
    /*

    */
    // if (!localId) return alert('请先膜一发');
  });
})();
