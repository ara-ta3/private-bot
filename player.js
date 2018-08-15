var glicko2 = require('glicko2');

var Player = function(player, glk) {
  this.name = player.nickname;
  this.pid = player.principal_id;
  this.glicko = glk;
  this.win = player.win || 0;
  this.count = player.count || 0;

  this.prevPower = glk.getRating();
  this.prevWon = null;
}

Player.setConfig = function(config) {
  this.config = {
    "calculating_count": config.calculating_count,
    "calculating_visible": config.calculating_visible
  };
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

Player.prototype.preservePower = function() {
  this.prevPower = this.getPower();
}

Player.prototype.updatePower = function() {
  this.count += 1;
  if(this.getPower() > this.prevPower) {
    this.win += 1;
    this.prevWon = true;
  } else {
    this.prevWon = false;
  }
}

Player.prototype.str = function() {
  var s = "";
  s += this.name + ":\n    ";

  var powerstr = () => {
    var s = this.getPower().toFixed(1);
    let i = this.getDiffPower();
    if(i !== null || i === 0){
      let diffstr = i > 0 ? "+"+i.toFixed(1)+" :arrow_upper_right: " : i.toFixed(1)+" :arrow_lower_right: ";
      s += " (" + diffstr + ")";
    }
    return s;
  };

  if (this.count < Player.config.calculating_count) {
    var calcstr = "【計測中 " + this.count + "/" + Player.config.calculating_count +"】";
    if(Player.config.calculating_visible){
      s += calcstr + " *" + powerstr() + "*";
    }else{
      s += calcstr;
    }
  } else {
    s += powerstr();
  }

  return s;
}

Player.prototype.toJSON = function(key) {
  var res = {
    nickname: this.name,
    principal_id: this.pid,
    win: this.win,
    count: this.count
  };

  const glk_params = {
    rating: this.glicko.getRating(),
    rd: this.glicko.getRd(),
    vol: this.glicko.getVol()
  };

  res.rate = glk_params;

  return res;
}


module.exports = Player;
