const deepFreeze = require('deep-freeze');

function Players(){
  //プレイヤーデータ(モデル)
  var self = this;
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
    addPlayer:(aPlayer)=>{
      var name = aPlayer.nickname;
      this.players[name] = {
        name:name,
        point:2000,
        win:0,
        lose:0
      };
    },
    getTeamGachiPow:function(battleDataTeam){
      var sumPow = 0;
      for(var i=0;i<battleDataTeam.length;i++){
        if(!self.players[battleDataTeam[i].nickname]){
          console.log("created ",battleDataTeam[i].nickname," profile.");
          this.addPlayer(battleDataTeam[i]);
        }
        sumPow += self.players[battleDataTeam[i].nickname].point;
      }
      return sumPow
    },
    addTeamGachiPow:(team,point)=>{
      for(var i = 0;i<team.length;i++){
        var name = team[i].nickname;
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
    },
    getData:()=>{
      return deepFreeze(this.players);
    }
  }
}

module.exports.Players = Players