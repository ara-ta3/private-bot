var glicko2 = require('glicko2');
var Player = require('./player');

const settings = require('./config.json').glicko_setting;

var Environment = function() {
  this.gameCount = 0;
  this.ranking = new glicko2.Glicko2(settings);
  this.players = {};
}

Environment.prototype.isEmpty = function() {
  return Object.keys(this.players).length === 0;
}

Environment.prototype.reset = function() {
  this.gameCount = 0;
  this.ranking = new glicko2.Glicko2(settings);
  this.players = {};
}

Environment.prototype.createPlayer = function(player) {
  var p = new Player(player, this.ranking.makePlayer());
  var pid = player.principal_id;
  this.players[pid] = p;
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
}

Environment.prototype.makeTweet = function() {
  var tweet = "";
  var tmpAry = [];
  for(let k in this.players) {
    if(this.players.hasOwnProperty(k)){
      tmpAry.push(this.players[k]);
    }
  }
  // var ary = _ObjArraySort(tmpAry,"point","desc");
  var ary = tmpAry;

  return ary.map(function(e){
    return e.str();
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

module.exports = Environment;
