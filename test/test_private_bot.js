var Env = require('../environment');
var glicko2 = require('glicko2');
var fs = require('fs');

describe('Environment', function(){

  var settings = {
      "tau" : 0.5,
      "rating" : 2100,
      "rd" : 200,
      "vol" : 0.06
  };
  var e1 = new Env(settings);
  var p1 = {
    nickname: "hoge",
    principal_id: 1
  };
  var p2 = {
    nickname: "fuga",
    principal_id: 2
  }

  it('createPlayer', function(){
    e1.createPlayer(p1);
    e1.players.should.have.ownProperty(p1.principal_id);
    e1.players[p1.principal_id].getName().should.be.equal(p1.nickname);
  });

  it('saveJSON', function(done){
    e1.createPlayer(p1);
    e1.createPlayer(p2);
    e1.updatePower([p1], [p2]);

    e1.saveJSON('./test/json/test_saveJSON.json')
      .then(() => {
        fs.readFile('./test/json/test_saveJSON.json', 'utf8', (err, data) => {
          should.not.exist(err);

          var d = JSON.parse(data);
          d.settings.should.be.eql(settings);
          d.gameCount.should.be.eql(e1.gameCount);
          d.players.should.matchAny(p => p.should.properties({
            nickname: "hoge",
            principal_id: 1,
            win: 1,
            count: 1
          }));
          d.players.should.matchAny(p => p.should.properties({
            nickname: "fuga",
            principal_id: 2,
            win: 0,
            count: 1
          }));
          done();
        });
      });
  });
});
