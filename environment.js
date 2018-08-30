var glicko2 = require('glicko2');
var Player = require('./player');
const fs = require('fs');
const { combination } = require('js-combinatorics');

// const settings = require('./config.json').glicko_setting;

var Environment = function(settings) {
  this.gameCount = 0;
  this.settings = settings
  this.ranking = new glicko2.Glicko2(this.settings);
  this.players = {};
  this.todayPlayerIDs = new Set();
  this.topPlayers = new Set();
}

Environment.prototype.isEmpty = function() {
  return Object.keys(this.players).length === 0;
}

Environment.prototype.reset = function() {
  this.gameCount = 0;
  this.ranking = new glicko2.Glicko2(this.settings);
  this.players = {};
  this.todayPlayerIDs = new Set();
  this.topPlayers = new Set();
}

Environment.prototype.createPlayer = function(player) {
  var p = new Player(player, this.ranking.makePlayer());
  var pid = player.principal_id;
  this.players[pid] = p;
  this.todayPlayerIDs.add(pid);
}

Environment.prototype.updatePower = function(winner, loser) {
  console.log(winner);
  this.gameCount += 1;
  for(let k in this.players) {
    if(this.players.hasOwnProperty(k)){
      this.players[k].preservePower();
    }
  }

  // もしプレイヤーが新たに追加されていれば作成する
  let allPlayers = winner.concat(loser);
  allPlayers
    .filter(p => !this.players.hasOwnProperty(p.principal_id))
    .forEach(p => this.createPlayer(p));

  // 今日参加したプレイヤーを追加する
  allPlayers
    .forEach(p => this.todayPlayerIDs.add(p.principal_id));

  // プレイヤー名を更新する
  allPlayers
    .forEach(p => this.players[p.principal_id].updateName(p));

  let glickoMapper = e => this.players[e.principal_id].getGlicko();

  if(loser.some(e => e.game_paint_point === 0)){
    // no contest
  } else {
    // 勝ち側の回線落ちしていない人は勝利扱い
    var winner_glk = winner.filter(e => e.game_paint_point > 0)
                           .map(glickoMapper);
    var loser_glk = loser.map(glickoMapper);
    var race = this.ranking.makeRace([
      winner_glk,
      loser_glk,
    ]);
    this.ranking.updateRatings(race);

    for(let k in this.players) {
      if(this.players.hasOwnProperty(k)){
        this.players[k].updatePower();
      }
    }
  }

  // ガチパワーがトップのプレイヤーを探す
  this.topPlayers = this.getTopPlayersFromIDs(this.todayPlayerIDs);
}

Environment.prototype.getTopPlayersFromIDs = function(playerIDs) {
  let players = [...playerIDs].map(pid => this.players[pid]);
  return this.getTopPlayers(players);
}

Environment.prototype.getTopPlayers = function(players) {
  let max_power = Math.max(...Object.values(players).map(p => p.getPower()));
  return new Set(Object.values(players).filter(p => p.getPower() >= max_power));
}

Environment.prototype.makeTweet = function() {
  var tweet = "";
  var tmpAry = [];
  for(let k of this.todayPlayerIDs) {
    if(this.players.hasOwnProperty(k)){
      tmpAry.push(this.players[k]);
    }
  }
  // var ary = _ObjArraySort(tmpAry,"point","desc");
  var ary = tmpAry;

  return ary.map(e => {
    var s = e.str();
    if(this.topPlayers.has(e)){
      s += " :first_place: ";
    }
    return s;
  }).join('\n') + '\n';
}

Environment.prototype.showData = function() {
  for(let k in this.players) {
    if(this.players.hasOwnProperty(k)){
      var p = this.players[k];
      console.log(p.getName()+": "+p.getPower());
    }
  }
}

Environment.prototype.makeSummary = function() {
  var tweet = "";
  var tmpAry = [];
  for(let k of this.todayPlayerIDs) {
    if(this.players.hasOwnProperty(k)){
      tmpAry.push(this.players[k]);
    }
  }

  // パワーが高い順番にソートする
  var ary = tmpAry.sort((a, b) => b.getPower() - a.getPower());

  return ary.map(e => {
    var s = e.todaySummary();
    if(this.topPlayers.has(e)){
      s += " :first_place: ";
    }
    return s;
  }).join('\n') + '\n';
}

Environment.prototype.makeRanking = function() {
  var tweet = "";
  var tmpAry = [];
  for(let k in this.players) {
    if(this.players.hasOwnProperty(k)){
      tmpAry.push(this.players[k]);
    }
  }

  // パワーが高い順番にソートする
  var ary = tmpAry.sort((a, b) => b.getPower() - a.getPower());
  let topPlayers = this.getTopPlayers(this.players);

  return ary.map(e => {
    var s = e.summary();
    if(topPlayers.has(e)){
      s += " :first_place: ";
    }
    return s;
  }).join('\n') + '\n';
}

Environment.prototype.buildTeam = function() {
  // ガチパワーの合計がほぼ同じになるようにマッチングをする

  // random.choices
  var choices = (array, num) => {
    var a = array;
    var t = {};
    var r = [];
    var l = a.length;
    var n = num < l ? num : l;
    while (n-- > 0) {
        var i = Math.random() * l | 0;
        r[n] = t[i] || a[i];
        --l;
        t[i] = t[l] || a[l];
    }
    return r;
  };

  const differenceSets = function(setA, setB) {
    var difference = new Set(setA);
    for (var elem of setB) {
        difference.delete(elem);
    }
    return difference;
  }

  // 8人用意する
  let targetPlayerIDs = choices(Array.from(this.todayPlayerIDs), 8);

  // 平均値
  let sumAveragePower = targetPlayerIDs.map(id => this.players[id])
                      .map(p => p.getPower())
                      .reduce((acc, cur) => acc + cur) / 2.0;

  var cmb = combination(targetPlayerIDs, 4);
  // 一番平均値に近いものを採用
  let bestAveragePlayerIDs = cmb.map(ids => {
    let sum = ids.map(id => this.players[id])
                 .map(p => p.getPower())
                 .reduce((acc, cur) => acc + cur);
    let distance = Math.abs(sum - sumAveragePower);
    return [distance, ids];
  }).reduce((acc, cur) => {
    return acc[0] < cur[0] ? acc[1] : cur[1];
  });

  let targetPlayerIDSet = new Set(targetPlayerIDs);
  bestAveragePlayerIDs = new Set(bestAveragePlayerIDs);
  let opponentIDs = differenceSets(targetPlayerIDSet, bestAveragePlayerIDs);

  return [bestAveragePlayerIDs, opponentIDs];
}

Environment.prototype.tweetTeamClassifying = function() {
  let [alpha, blabo] = this.buildTeam();
  let idsToNameStr = ids => {
    return Array.from(ids).map(id => this.players[id])
                    .map(p => p.getName())
                    .join('\n    ');
  };
  let alpha_text = "**アルファチーム**:\n    " + idsToNameStr(alpha) + "\n";
  let blabo_text = "**ブラボーチーム**:\n    " + idsToNameStr(blabo) + "\n";
  return "チーム分けはこちら！\n" + alpha_text + blabo_text;
}

Environment.prototype.toJSON = function (key) {
  return {
    gameCount: this.gameCount,
    settings: this.settings,
    players: Object.values(this.players)
  };
}

Environment.prototype.saveJSON = function (path) {
  const data = JSON.stringify(this);
  return new Promise((resolve, reject) => {
    fs.writeFile(path, data, 'utf8', (err) => {
      if (err) {
        console.error(err);
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

Environment.prototype.loadJSON = function (path) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf8', (err, data) => {
      if (err) {
        console.error(err);
        reject(err);
      } else {
        resolve(data);
      }
    })
  }).then(data => {
    return JSON.parse(data);
  }).then(data => {
    this.gameCount = data.gameCount;
    this.settings = data.settings;
    this.ranking = new glicko2.Glicko2(data.settings);
    this.players = {};
    data.players.map(p => {
      const rate = [p.rate.rating, p.rate.rd, p.rate.vol];
      return new Player(p, this.ranking.makePlayer(...rate));
    }).forEach(p => {
      this.players[p.pid] = p;
    });
    // this.topPlayers = this.getTopPlayers();
  });
}

module.exports = Environment;
