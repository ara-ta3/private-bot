var glicko2 = require('glicko2');
var Player = require('./player');
const fs = require('fs');

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

  var glickoMapper = e => this.players[e.principal_id].getGlicko();
  var winner_glk = winner.map(glickoMapper);
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
