const config  = require('./config.json');
const request = require('request');
var CronJob = require('cron').CronJob;
const Discord = require("discord.js");
const client = new Discord.Client();

const USER_LANG = "ja-jp";

var gameCount = 0;
const isDebug = true; //true: ツイートOFF，1分間隔で更新，同じ試合でもカウント
const isTweeting = false;
const isDiscording = true;
var isChecking = false;

var postToChannel = null;

const gachiPowConst = 50;

var iksmSession;

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
      } else if(res.statusCode == 204){
        resolve();
      } else {
        console.log('not 200 code : ',res.statusCode);
        reject(error);
      }
    });
  });
}

function postDiscord(mes){
  postToChannel.send(mes);
}

async function getIksmSession(){
  // var client_id = config.client_id;
  // var resource_id = config.resource_id;
  // var init_session_token = config.init_session_token;

  // var apiTokenRes = await httpRequest({
  //   url: 'https://accounts.nintendo.com/connect/1.0.0/api/token',
  //   method: 'POST',
  //   headers: {'Accept': 'application/json'},
  //   json:{
  //     'client_id': client_id,
  //     'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer-session-token',
  //     'session_token': init_session_token
  //   }
  // });
  // var apiToken = apiTokenRes['body'];

  // var someTokensRes = await httpRequest({
  //   url: 'https://api-lp1.znc.srv.nintendo.net/v1/Account/GetToken',
  //   method: 'POST',
  //   headers: {'Accept': 'application/json',
  //     'Authorization': 'Bearer ' + apiToken['access_token']},
  //   json:{"parameter": {
  //     "language": "null",
  //     "naBirthday": "null",
  //     "naCountry": "null",
  //     "naIdToken": apiToken["id_token"]}
  //   }
  // });
  // var tokens = someTokensRes['body']['result'];

  // var authRes = await httpRequest({
  //   url: "https://api-lp1.znc.srv.nintendo.net/v1/Game/GetWebServiceToken",
  //   method: 'POST',
  //   headers: {"Accept": "application/json",
  //     "Authorization": "Bearer "+tokens["webApiServerCredential"]["accessToken"]},
  //   json:{"parameter": {"id": resource_id}}
  // });

  // if(authRes['body'].status != 0){
  //   return new Promise(function (resolve, reject) {
  //     reject('Nintendo Account Auth Error!!');
  //   });
  // }

  // var accessToken = authRes['body']["result"]["accessToken"]

  // var session = await httpRequest({
  //   url: "https://app.splatoon2.nintendo.net/?lang=ja-JP",
  //   method: 'GET',
  //   headers: {"Accept": "application/json",
  //     "X-gamewebtoken": accessToken}
  // });

  // var session_id = session.caseless.dict['set-cookie'][0].split(';')[0];

  return new Promise(function (resolve, reject) {
    resolve(config.iksm_session);
  });
}

function Players(){
  //プレイヤーデータ(モデル)
  this.players = {};
  function _ObjArraySort(ary, key, order) {
    var reverse = 1;
    if(order && order.toLowerCase() == "desc")
        reverse = -1;
    ary.sort(function(a, b) {
      if(a[key] < b[key])
          return -1 * reverse;
      else if(a[key] == b[key])
          return 0;
      else
          return 1 * reverse;
    });
    return ary
  }

  return {
    isEmpty:()=>{
      if(Object.keys(this.players).length === 0){
        return true
      }
      return false
    },
    getGachiPow:(battleDataTeam)=>{
      var sumPow = 0;
      for(var i=0;i<battleDataTeam.length;i++){
        if(this.players[battleDataTeam[i].nickname]){
          sumPow += this.players[battleDataTeam[i].nickname].point;
        }else{
          sumPow += 2000;
        }

      }
      return sumPow
    },
    addGachiPow:(team,point)=>{
      for(var i = 0;i<team.length;i++){
        var name = team[i].nickname;
        if(!this.players[name]){
          console.log("created ",team[i].nickname," profile.");
          this.players[name] = {name:name,point:2000,win:0,lose:0};
        }
        this.players[name]["point"] += point;
        if(point>0)
          this.players[name].win++;
        if(point<0)
          this.players[name].lose++;
      }
    },
    makeTweet:()=>{
      var tweet = "";
      var tmpAry = [];
      for(key in this.players){
        tmpAry.push(this.players[key]);
      }
      //console.log(tmpAry);
      var ary = _ObjArraySort(tmpAry,"point","desc");
      //console.log("ButtleResult:(",gameCount,"試合目)");
      for(var i = 0; i < ary.length;i++){
        tweet = tweet+ary[i].name+"("+ary[i].point+")\n";
      }
      return tweet
    },
    clearData:()=>{
      this.players = {};
    },
    showData:()=>{
      console.log(this.players);
    }

  }
}

async function getPlayersResult(gameId){
  if(!iksmSession)
    return 0;

  var resData = await jsonRequest({
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
      'Cookie': 'iksm_session='+config.iksm_session,
    },
  });

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
  var winPlayer = [winner[0].player,winner[1].player,winner[2].player,winner[3].player];
  var losePlayer = [loser[0].player,loser[1].player,loser[2].player,loser[3].player];
  return new Promise(function (resolve, reject) {
    resolve({winPlayer:winPlayer,losePlayer:losePlayer});
  });
}

var latestGameId = 0;
var players = new Players();

async function main(){
  if(!iksmSession)
    iksmSession = await getIksmSession();

  var resData = await jsonRequest({
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
      'Cookie': 'iksm_session='+config.iksm_session,
    },
  });

  if(latestGameId != resData.results[0].battle_number || isDebug){
    gameCount++;
    latestGameId = resData.results[0].battle_number;
    var battleResult = await getPlayersResult(latestGameId);

    //ウデマエアルゴリズム
    //TODO: addGachiPowを個別にする（今後のため）
    var winPowAvg = players.getGachiPow(battleResult.winPlayer);
    var losePowAvg = players.getGachiPow(battleResult.losePlayer);
    players.showData();
    var diffPowAvg = winPowAvg-losePowAvg;
    console.log("diffPowAvg ",diffPowAvg);
    if(diffPowAvg < gachiPowConst*-1){
      //弱いチームが逆転
      players.addGachiPow(battleResult.winPlayer,20);
      players.addGachiPow(battleResult.losePlayer,-20);
    }else if(diffPowAvg < gachiPowConst){
      //特に差分なし
      players.addGachiPow(battleResult.winPlayer,10);
      players.addGachiPow(battleResult.losePlayer,-10);
    }else{
      //弱いチームがさらに負け
      players.addGachiPow(battleResult.winPlayer,5);
      players.addGachiPow(battleResult.losePlayer,-5);
    }

    var tweet = players.makeTweet();
    //console.log(tweet);

    // if(!isDebug&&isTweeting){
    //   T.post('statuses/update', { status: tweet }, function(err, data, response) {
    //     console.log("tweeted");
    //     if(err){
    //       console.log(err);
    //     }
    //   });
    // }
    if(isDiscording){
      postDiscord("【"+gameCount+"試合目】\n"+tweet);
    }
  }

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
    message.channel.send("<#"+postToChannel.id+"> に試合結果を投稿します。\n"+today);
    main();
  }else if (botTrigger(message, "end") && isChecking == true) {
    isChecking = false;
    players.clearData();
    latestGameId = 0;
    gameCount = 0;
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
    players.clearData();

    if(isChecking){
      main();

    }
  }, null, true, 'Asia/Tokyo');
}
