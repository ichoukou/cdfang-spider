import schedule from 'node-schedule';
import request from 'superagent';
import cheerio from 'cheerio';
import * as util from '../utils';
import houseModel from '../models/houseModel';
import config from '../config';

function grabPage(pageNo) {
  return new Promise((resolve) => {
    request
      .post(`${config.spiderDomain}/lottery/accept/projectList?pageNo=${pageNo}`)
      .end((err, result) => {
        const $ = cheerio.load(result.res.text);
        const trList = [];
        $('#_projectInfo>tr').each((i, tr) => {
          const tdList = [];
          $(tr)
            .find('td')
            .each((j, td) => {
              tdList.push($(td).text());
            });
          trList.push(tdList);
        });
        resolve(util.transformArray(trList));
      });
  });
}

// 定时器middleware,每隔15分钟爬一次
const runEvery15Minute = async () => {
  schedule.scheduleJob('*/15 * * * *', async () => {
    const pageList = await Promise.all([grabPage(1), grabPage(2), grabPage(3)]);
    const page = [...pageList[0], ...pageList[1], ...pageList[2]];
    const newNumber = await new Promise((resolve) => {
      let newDataNumber = 0;
      let i = 0;
      page.forEach((item) => {
        houseModel.add(item).then((isSuccess) => {
          i += 1;
          if (isSuccess) {
            newDataNumber += 1;
          }
          if (i === page.length - 1) {
            resolve(newDataNumber);
          }
        });
      });
    });
    /* eslint-disable no-console */
    console.log(`抓取数据${page.length}条，新数据${newNumber}条。`);
  });
};

// 每15分钟自动抓取前三页数据(房协网一个时间点不可能同时发布30套房源)
runEvery15Minute();
