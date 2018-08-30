const config  = require('./config.json');
const Env = require('./environment');
const Player = require('./player');
Player.setConfig(config);

const request = require('request');
var CronJob = require('cron').CronJob;
const Discord = require("discord.js");
const client = new Discord.Client();

const USER_LANG = "ja-jp";

const isDebug = false; //true: ツイートOFF，1分間隔で更新，同じ試合でもカウント
var isChecking = false;

var postToChannel = null;

const iksmSession = config.iksm_session;
var latestGameId = 0;

var environment = function initEnvironment(reset){
  if (process.argv.length <= 2 || reset) {
    return new Env(config.glicko_setting);
  } else {
    var fileName = process.argv[2];
    console.log(fileName+"から復元します。")
    var env = new Env(config.glicko_setting);
    env.loadJSON(fileName).then(() => console.log("復元しました。"));
    return env;
  }
}();


function httpRequest(options) {
  return new Promise(function (resolve, reject) {
    request(options, function (error, res, body) {
      if (!error && (res.statusCode == 200)) {
        body['res'] = res;
        resolve(res);
      } else if(res.statusCode == 204){
        resolve();
      } else {
        console.error('not 200 code : ',res.statusCode);
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
  return postToChannel.send(mes)
    .catch(e => {
      console.error("Discordへの投稿に失敗しました。")
      console.error(e);
    });
}

function ruler(){
  let r = Math.random();
  const rep = 6;
  if(r < 1/6){
    return ":squid: ".repeat(rep*2);
  }else if (r < 2/6){
    return ":octopus: ".repeat(rep*2);
  }else{
    return ":squid: :octopus: ".repeat(rep);
  }
}

function dateFormat (date, format) {
  if (!format) format = 'YYYY-MM-DD hh:mm:ss.SSS';
  format = format.replace(/YYYY/g, date.getFullYear());
  format = format.replace(/MM/g, ('0' + (date.getMonth() + 1)).slice(-2));
  format = format.replace(/DD/g, ('0' + date.getDate()).slice(-2));
  format = format.replace(/hh/g, ('0' + date.getHours()).slice(-2));
  format = format.replace(/mm/g, ('0' + date.getMinutes()).slice(-2));
  format = format.replace(/ss/g, ('0' + date.getSeconds()).slice(-2));
  if (format.match(/S/g)) {
    var milliSeconds = ('00' + date.getMilliseconds()).slice(-3);
    var length = format.match(/S/g).length;
    for (var i = 0; i < length; i++) format = format.replace(/S/, milliSeconds.substring(i, i + 1));
  }
  return format;
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

function sendSummary(channel) {
  let pre = "終わり〜 みんなおつかれさま\n\n【今日の対戦結果のまとめ】\n";
  let body = environment.makeSummary();
  let tweet = pre + body;
  return channel.send(tweet)
    .catch(e => {
      console.error("まとめの投稿に失敗しました.");
      console.error(e);
    });
}

function sendUsage(channel) {
  let mes = "**このbotのコマンド一覧だよ**\n\n"
            + "`start`: バトルの集計を開始するよ。計測したガチパワーは`start`したチャンネルに投稿するよ。\n\n"
            + "`end`: バトルの集計を終了するよ。その集計での戦績のまとめも投稿するよ。\n\n"
            + "`ranking`: botが集計している全プレイヤーで、ガチパワーのランキングを投稿するよ。\n\n"
  channel.send(mes)
    .catch(e => {
      console.error("使い方の投稿に失敗しました。")
      console.error(e);
    });
}

function sendRanking(channel) {
  channel.send(environment.makeRanking())
    .catch(e => {
      console.error("ランキングの作成に失敗しました.");
      console.log(e);
    });
}

function sendTeamClassfying() {
  return postDiscord(environment.tweetTeamClassifying())
    .catch(e => {
      console.error("チーム分けの投稿に失敗しました。");
      console.error(e);
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
      return getPlayersResult(latestGameId);
    } else {
      return Promise.reject("Already Exists");
    }
  }).catch(function (e){
    if (e === "Already Exists"){
      // do nothing
    } else {
      console.error("データの取得に失敗しました。")
      console.error(e.statusCode + e.statusMessage);
      postDiscord("データを持ってくるのに失敗してるみたい...")
    }
    return Promise.reject(e);
  }).then(function(battleResult){
    //ウデマエアルゴリズム
    environment.updatePower(battleResult.winPlayer, battleResult.losePlayer);

    let tweet_body = environment.makeTweet();
    let tweet_pre = ruler() + "\n\n"
                    + "**【"+environment.gameCount+"試合目】**\n"
                    + battleResult.rule + " " + battleResult.stage
                    + "\n\n";
    let tweet = tweet_pre + tweet_body;

    return postDiscord(tweet);
  }).then(function() {
    // autosave
    return environment.saveJSON('./save/autosave.json')
      .then(() => console.log("autosave..."));
  }).catch(function (e){
    console.error(e);
  });
}

client.on('message', message => {
  var botTrigger = function(msg, keyword) {
    return msg.mentions.users.has(config.discord_bot_id)
            && new RegExp(keyword).test(msg.content);
  };

  if (botTrigger(message, "start") && isChecking == false) {
    isChecking = true;
    var today = new Date();
    postToChannel = message.channel;
    postDiscord("監視開始\n"+today);
    postDiscord("<#"+postToChannel.id+"> に試合結果を投稿します。");

    main();
  } else if (botTrigger(message, "end") && isChecking == true) {
    sendSummary(postToChannel);

    isChecking = false;
    latestGameId = 0;
    let datestr = dateFormat(new Date(), "YYYYMMDDhhmmss");
    let fileName = './save/log-'+ datestr +'.json';
    environment.saveJSON(fileName)
      .then(() => console.log("データを保存しました。("+fileName+")"));
  } else if(botTrigger(message, "status")){
    let statMes = isChecking ? "起動中" : "停止中";
    postDiscord("今は"+statMes+"だよ！");
  } else if(botTrigger(message, "ranking")){
    sendRanking(message.channel);
  } else if (botTrigger(message, "team") && isChecking == true) {
    sendTeamClassfying();
  } else if (botTrigger(message, "")) {
    sendUsage(message.channel);
  }
});

client.login(config.discord_token)
  .then(() => console.log("Discordへ接続しました。"))
  .catch(console.error);


if(!isDebug){
  new CronJob('00 */1 * * * *', function() {
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
