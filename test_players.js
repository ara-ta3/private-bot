var p = require("./players.js")
const assert = require('assert');
const ja = require('json-assert');

(function test_isempty(){
  console.log(".");
  var e = new p.Players();
  assert(e.isEmpty());
}());

(function test_addplayer(){
  console.log(".");
  var e = new p.Players();
  const ap = {
    nickname: "hoge"
  };
  e.addPlayer(ap);
  assert(!e.isEmpty());
  const ans = {
    name:"hoge",
    point:2000,
    win:0,
    lose:0,
  }
  assert(ja.isEqual(ans, e.getData()["hoge"]));
}());

(function test_getDataFreeze(){
  console.log(".");
  var e = new p.Players();
  const ap = {
    nickname: "hoge"
  };
  e.addPlayer(ap);
  var dat = e.getData();
  dat["fuga"] = "aaa";
  dat["hoge"].point = 2001
  const ans = {
    name:"hoge",
    point:2000,
    win:0,
    lose:0,
  }
  assert(ja.isEqual(ans, e.getData()["hoge"]));
}());

(function test_getTeamGachiPow(){
  console.log(".");
  var e = new p.Players();
  const team = [
    { nickname:"p1" },
    { nickname:"p2" },
    { nickname:"p3" },
    { nickname:"p4" }
  ];
  assert.equal(8000, e.getTeamGachiPow(team));
}());

(function test_addTeamGachiPow(){
  console.log(".");
  var e = new p.Players();
  const team = [
    { nickname:"p1" },
    { nickname:"p2" },
    { nickname:"p3" },
    { nickname:"p4" }
  ];
  for(var i = 0; i < team.length; i++){
    e.addPlayer(team[i]);
  }
  e.addTeamGachiPow(team, 100);
  const ans = {
    p1:{
      name:"p1",
      point:2100,
      win:1,
      lose:0
    },
    p2:{
      name:"p2",
      point:2100,
      win:1,
      lose:0
    },
    p3:{
      name:"p3",
      point:2100,
      win:1,
      lose:0
    },
    p4:{
      name:"p4",
      point:2100,
      win:1,
      lose:0
    },
  };
  assert(ja.isEqual(ans, e.getData()));
}());