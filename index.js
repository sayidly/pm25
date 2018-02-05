const axios = require('axios'),
 time = require("time"),
 querystring = require('querystring'),
 schedule = require('node-schedule'),
 config = require('./config.json');

time.tzset("Asia/Shanghai");
const now = new time.Date()

// 计划执行设置
let rule = new schedule.RecurrenceRule();
rule.dayOfWeek = config.scheduleTime.days;
rule.hour = config.scheduleTime.hours;
rule.minute = config.scheduleTime.minutes;

axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';

const app = {
  init() {
    this.checkAQI() // 立刻运行一次
    this.watcher()
  },

  checkAQI() {

    // 从美国大使馆抓取数据
    let city = config.cityCode;
    axios.get(`http://api.waqi.info/feed/${city}/`, {
      params: {
        "token": config.InKey
      }
    })

    .then((response) => {
      let obj = response.data;
      let level = 0;
      let airPollutionLevel = ['一级（优）', '二级（良）', '三级（轻度污染）', '四级（中度污染）', '五级（重度污染）', '六级（严重污染）'];

      if ( obj.data.aqi > 0) {
        level = 0;
      } 
      if ( obj.data.aqi > 50 ) {
        level = 1;
      }
      if ( obj.data.aqi > 100 ) {
        level = 2;
      }
      if ( obj.data.aqi > 150 ) {
        level = 3;
      }
      if ( obj.data.aqi > 200 ) {
        level = 4;
      }
      if ( obj.data.aqi > 300 ) {
        level = 5;
      }

      const title = `空气质量为 ${airPollutionLevel[level]}  AQI为 ${obj.data.aqi}`;
      const body = `监测点为 ${obj.data.city.name}，数据来自美国大使馆
          ${now.toLocaleString('zh-CN')};
        `
      console.log('Title: ', title);
      console.log('Body: ', body);

      // 当条件满足的时候，发送消息至微信
      if (obj.data.aqi > config.conditions.aqi || obj.data.iaqi.o3 > config.conditions.o3 || obj.data.iaqi.pm25 > config.conditions.pm25) {
        console.log("OK");
        this.severChan(title, body)
      }
    })

    .catch((error) => {
      console.log(error);
    });
  },
  
  severChan(text, desp) {
    return axios.post(`https://pushbear.ftqq.com/sub`, 
      querystring.stringify({
        sendkey: config.serverChanKey,
        text: text,
        desp: desp
    }))
      .then((response) => {
        if (response.status === 200) return console.log('serverChan: send success')
        console.warn(response.status)
      })
      .catch((error) => {
        console.error(error);
      });
  },
  watcher() {
    return schedule.scheduleJob(rule, () => {
      this.checkAQI()
    })
  }
}

app.init()