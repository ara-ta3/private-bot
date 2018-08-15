# プラベでガチバトルbot
名前は適当です。
プライベートマッチの戦績を元に、ガチマッチやリーグマッチのようにガチパワーを計算して、Discordに投稿するbotです。
(original repository: https://github.com/kinmemodoki/private-bot)

## 使い方
最近のNode.jsが動くPCでならきっと動く
### 依存パッケージのインストール
```bash
$ npm install
```
### `config.json`を適切に編集する
1. https://discordapp.com/developers/applications/ でDiscord上のbotアカウントを作成し、サーバーにbotアカウントを招待する
このとき、 `CLIENT ID`と`TOKEN`をコピーして， 以下の箇所にペーストしてください

```
{
    "discord_token": TOKEN,
    "discord_bot_id": CLIENT ID,
```

2. `iksm_session`を何かしらの手段で手に入れて、`config.json`に追記してください。 **`iksm_session`に関する質問はいかなる内容であっても答えられません。**

### とりあえず動かす
```bash
$ node judge.js
```
コンソール側で `Discordへ接続しました。` と表示されれば、Discordへのログインには成功している。
その後、Discord側で ``@botアカウントのID start``とメッセージを送ってbotから返答が返ってきたら正常に動いているはず。

### ちゃんと動かす
あらかじめ、
```bash
$ node judge.js
```
しておく。

プライベートマッチを開始し、1戦目が終了したら、Discordで
```
@botアカウントのID start
```
とメッセージを送り、botによる戦績の監視を開始する。このタイミングで、1戦目の情報を収集して初戦のレート算出が行われるはず。

その後は自動で戦績の収集とレートの算出、Discordへのメッセージの投稿が行われる。

終了するときは、
```
@botアカウントのID end
```
とメッセージを送るか、スクリプトの実行そのものを中断すればよい。

スクリプトは実行されているが、監視状態にあるかどうかがわからないときは
```
@botアカウントのID status
```
とメッセージを送ると教えてくれる。

## 仕様など
### レートの計算について
[Glickoレーティング](https://ja.wikipedia.org/wiki/%E3%82%B0%E3%83%AA%E3%82%B3%E3%83%AC%E3%83%BC%E3%83%86%E3%82%A3%E3%83%B3%E3%82%B0#%E3%82%B9%E3%83%86%E3%83%83%E3%83%972:_%E6%96%B0%E3%83%AC%E3%83%BC%E3%83%86%E3%82%A3%E3%83%B3%E3%82%B0%E3%81%AE%E7%AE%97%E5%87%BA)
の亜種である[Glicko2レーティング](http://www.glicko.net/glicko/glicko2.pdf)を計算に用いてレートを計算します。
噂によれば、本家でも使用されているレーティングアルゴリズムらしいので、使用しています。

パラメータとか全然調整していないので、本家とは数値の変動が全然違うかもしれません。（多分ちがう）

### データの保存と復元について
1バトル集計するごとに，記録している個人のパワーなどを[saveディレクトリ](save/)中に`autosave.json`という名前で保存する。
また，
```
@botアカウントのID end
```
で集計を終了したときに，同じく[saveディレクトリ](save/)中に`log-(その時の日時).json`という名前で保存する。

データを復元する際は、
```bash
$ node judge.js save/xxx.json
```
と引数に復元したいデータのパスを指定すればよい。

### config
- `calculating_count` (default: 7)
本家にも存在する【計測中】扱いにする回数。
- `calculating_visible` (default: false)
計測中の不安定なガチパワーをbotのメッセージに表示するかどうか
- `glicko_setting`: Glickoレーティングの設定値。各パラメータの詳しくて正しい意味は調べてください。
    - `tau`: 0.3~1.2の値で良さげなものを選ぶ (default: 0.5)
    - `rating`: 初期値 (default: 2100)
    - `rd`: 初期レーティング偏差 (default: 200)
    - `vol`: 初期レーティング変動率 (default: 0.06)

## 不具合的なもの
- `iksm_session`の持ち主が観戦した場合、戦績がそもそも残らないので、その試合のレート算出ができません。
- 現状、仮に回線落ちなどがあった場合に関して、特別な考慮をしていません。
