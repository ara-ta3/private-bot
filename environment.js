var glicko2 = require('glicko2');
var Player = require('./player');

var settings = {
  // tau : "Reasonable choices are between 0.3 and 1.2, though the system should
  //       be tested to decide which value results in greatest predictive accuracy."
  tau : 0.5,
  // rating : default rating
  rating : 2100,
  //rd : Default rating deviation
  //     small number = good confidence on the rating accuracy
  rd : 200,
  //vol : Default volatility (expected fluctation on the player rating)
  vol : 0.06
};

var Environment = function() {
  this.ranking = new glicko2.Glicko2(settings);
  this.players = {};

  return {
    isEmpty:()=>{
      if(Object.keys(this.players).length === 0){
        return true;
      }
      return false;
    },
    reset:()=>{
      this.ranking = new glicko2.Glicko2(settings);
      this.players = {};
    },
    createPlayer:(player)=>{
      var p = new Player(player, this.ranking.makePlayer());
      var pid = player.principal_id;
      this.players[pid] = p;
    },
    updatePower:(winner, loser)=>{
      for(let k in this.players) {
        if(this.players.hasOwnProperty(k)){
          this.players[k].updatePower();
        }
      }

      var self = this;
      var winner_glk = winner.map(function(e){
        return self.players[e.principal_id].getGlicko();
      });
      var loser_glk = loser.map(function(e){
        return self.players[e.principal_id].getGlicko();
      });
      var race = this.ranking.makeRace([
        winner_glk,
        loser_glk,
      ]);
      this.ranking.updateRatings(race);
    },
    makeTweet:()=>{
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
      }).join('\n');
    },
    showData:()=>{
      for(let k in this.players) {
        if(this.players.hasOwnProperty(k)){
          var p = this.players[k];
          console.log(p.getName()+": "+p.getPower());
        }
      }
    },
  };
}

module.exports = Environment;
