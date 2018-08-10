var glicko2 = require('glicko2');

var Player = function(player, glk) {
  this.name = player.nickname;
  this.pid = player.principal_id;
  this.glicko = glk;
  this.win = 0;
  this.lose = 0;
  this.count = 0;

  this.prevPower = null;

}

Player.prototype.getName = function() {
  return this.name;
}

Player.prototype.getGlicko = function() {
  return this.glicko;
}

Player.prototype.getPower = function() {
  return this.glicko.getRating();
}

Player.prototype.getDiffPower = function() {
  return this.prevPower === null ? null : this.getPower() - this.prevPower;
}

Player.prototype.updatePower = function() {
  this.prevPower = this.getPower();
}

Player.prototype.str = function() {
  var s = this.name + ": " + this.getPower().toFixed(1);;
  let i = this.getDiffPower();
  if(i !== null){
    let diffstr = i > 0 ? "+"+i.toFixed(1); : i.toFixed(1);
    s += " (" + diffstr + ")";
  }

  return s;
}


module.exports = Player;
