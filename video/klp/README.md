# キッズ・ライセンス・パーク 大型ディスプレイ動画(アニメーション仮版)

- 完成動画: `klp_display.mp4`(1920×1080 / 28秒 / 30fps / 音声なし)
- 構成: 台本(仮)の7シーンどおり(①車登場 → ②運転 → ③コース → ④ゴール → ⑤免許証 → ⑥告知 → ⑦ラスト)
- 素材: `site/images` の車写真・こども免許証画像を使用。ロゴは使用していない。
- フォント: M PLUS Rounded 1c(SIL OFL)

## 修正・再書き出し

1. `index.html` を編集(ブラウザで開くとループ再生でプレビューできる)
2. 書き出し:
   ```
   pip install imageio-ffmpeg
   FFMPEG=$(python3 -c "import imageio_ffmpeg as i;print(i.get_ffmpeg_exe())") NODE_PATH=$(npm root -g) node render.js klp_display.mp4
   ```
   静止画確認は `node render.js --preview 1.5,4.5,14` のように秒を指定。

実写素材が届いたら、同じ構成・テロップで差し替え可能。
