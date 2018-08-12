const config  = require('./config.json');
const Env = require('./environment');

const request = require('request');
var CronJob = require('cron').CronJob;
const Discord = require("discord.js");
const client = new Discord.Client();

const USER_LANG = "ja-jp";

const isDebug = false; //true: ツイートOFF，1分間隔で更新，同じ試合でもカウント
const isDiscording = true;
var isChecking = false;

var environment;
var postToChannel = null;

const iksmSession = config.iksm_session;
var latestGameId = 0;

function httpRequest(options) {
  return new Promise(function (resolve, reject) {
    request(options, function (error, res, body) {
      if (!error && (res.statusCode == 200)) {
        body['res'] = res;
        resolve(res);
      } else if(res.statusCode == 204){
        resolve();
      } else {
        console.log('not 200 code : ',res.statusCode);
        reject(error);
      }
    });
  });
}

function jsonRequest(options) {
  return new Promise(function (resolve, reject) {
    request(options, function (error, res, body) {
      if (!error && (res.statusCode == 200)) {
        resolve(body);
      } else {
        console.log('not 200 code : ',res.statusCode);
        reject(res);
      }
    });
  });
}

function postDiscord(mes){
  return postToChannel.send(mes);
}

function getPlayersResult(gameId){
  if(!iksmSession)
    return 0;

  return jsonRequest({
    url: "https://app.splatoon2.nintendo.net/api/results/"+gameId,
    method: 'GET',
    gzip: true,
    json: true,
    headers: {
      'Host': 'app.splatoon2.nintendo.net',
      'x-unique-id': '6463509894502868281',
      'x-requested-with': 'XMLHttpRequest',
      'x-timezone-offset': '0',
      'User-Agent': 'Mozilla/5.0 (Linux; Android 7.1.2; Pixel Build/NJH47D; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/59.0.3071.125 Mobile Safari/537.36',
      "Accept": "application/json",
      "referer": "https://app.splatoon2.nintendo.net/results/"+gameId,
      'Accept-Encoding': 'gzip, deflate',
      'Accept-Language': USER_LANG,
      'Cookie': 'iksm_session='+iksmSession,
    },
  }).then(function(resData){
    // ルールとステージを取り出す
    let rule = resData.rule.name;
    let stage = resData.stage.name;

    //console.log(resData);
    if(resData.my_team_result.name == 'WIN!'){
      var winner = resData.my_team_members;
      if(resData.player_result)
        winner.push(resData.player_result);
      var loser = resData.other_team_members;
    }else{
      var winner = resData.other_team_members;
      var loser = resData.my_team_members;
      if(resData.player_result)
        loser.push(resData.player_result);
    }
    //console.log(winner);
    var winPlayer = winner.map(x => x.player);
    var losePlayer = loser.map(x => x.player);
    return {
      rule: rule,
      stage: stage,
      winPlayer:winPlayer,
      losePlayer:losePlayer
    };
  });
}

function main(){
  if(!iksmSession)
    return 0;

  jsonRequest({
    url: "https://app.splatoon2.nintendo.net/api/results",
    method: 'GET',
    gzip: true,
    json: true,
    headers: {
      'Host': 'app.splatoon2.nintendo.net',
      'x-unique-id': '6463509894502868281',
      'x-requested-with': 'XMLHttpRequest',
      'x-timezone-offset': '0',
      'User-Agent': 'Mozilla/5.0 (Linux; Android 7.1.2; Pixel Build/NJH47D; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/59.0.3071.125 Mobile Safari/537.36',
      'Accept': '*/*',
      'Referer': 'https://app.splatoon2.nintendo.net/results',
      'Accept-Encoding': 'gzip, deflate',
      'Accept-Language': USER_LANG,
      'Cookie': 'iksm_session='+iksmSession,
    },
  }).then(function (resData){
    if(latestGameId != resData.results[0].battle_number || isDebug){
      latestGameId = resData.results[0].battle_number;
      getPlayersResult(latestGameId)
        .then(function(battleResult){
          //ウデマエアルゴリズム
          environment.updatePower(battleResult.winPlayer, battleResult.losePlayer);

          let tweet_body = environment.makeTweet();
          let tweet_pre = "**【"+environment.gameCount+"試合目】**\n"
                          + battleResult.rule + " " + battleResult.stage
                          + "\n\n";
          let tweet = tweet_pre + tweet_body;

          if(isDiscording){
            postDiscord(tweet);
          }
        });
    }
  }).catch(function (e){
    console.log("データの取得に失敗しました。")
    console.log(e.statusCode + e.statusMessage);
    postDiscord("データの取得に失敗したので、botを終了します。")
      .then(() => process.exit(1));
  });
}

client.login(config.discord_token);

client.on('message', message => {
  var botTrigger = function(msg, keyword) {
    return msg.mentions.users.has(config.discord_bot_id)
            && new RegExp(keyword).test(msg.content);
  };

  if (botTrigger(message, "start") && isChecking == false) {
    isChecking = true;
    var today = new Date();
    postToChannel = message.channel;
    message.channel.send("監視開始\n"+today);
    message.channel.send("<#"+postToChannel.id+"> に試合結果を投稿します。");

    // 環境の初期化
    environment = new Env();
    main();
  }else if (botTrigger(message, "end") && isChecking == true) {
    isChecking = false;
    latestGameId = 0;
    message.channel.send("終わり〜\nみんなおつかれさま");
  }else if(botTrigger(message, "status")){
    var statMes = "";
    if(isChecking){
      statMes = "起動中";
    }else{
      statMes = "停止中";
    }
    message.channel.send("今は"+statMes+"だよ！");
  }
});


if(!isDebug){
  new CronJob('*/30 * * * * *', function() {
    if(isChecking){
      main();
    }
  }, null, true, 'Asia/Tokyo');
}


if(isDebug){
  new CronJob('00 */1 * * * *', function() {
    console.log('tick');
    environment.reset();

    if(isChecking){
      main();

    }
  }, null, true, 'Asia/Tokyo');
}
