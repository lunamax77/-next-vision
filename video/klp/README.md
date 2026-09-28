# キッズ・ライセンス・パーク 大型ディスプレイ動画(アニメーション仮版)

| ファイル | スタイル | 元データ |
|---|---|---|
| `klp_display.mp4` | レーシング風(ダーク×ネオン、斜めワイプ) | `index.html` |
| `klp_cinema.mp4` | 映画予告風(シネスコ帯・金文字・フィルムグレイン) | `cinema.html` |

- 共通: 1920×1080 / 28秒 / 30fps / 音声なし。台本(仮)の7シーン構成どおり。
- 素材: `site/images` の車写真・こども免許証画像を使用。ロゴは使用していない。
- フォント(SIL OFL、使用文字のみに削減済み): Dela Gothic One / Shippori Mincho B1 / Cinzel
  - テロップを変えたら、元のフォントを再取得してから書き出すこと(削減で文字が欠けるため)。

## 修正・再書き出し

1. HTML を編集(ブラウザで開くとループ再生でプレビューできる)
2. 書き出し:
   ```
   pip install imageio-ffmpeg
   export FFMPEG=$(python3 -c "import imageio_ffmpeg as i;print(i.get_ffmpeg_exe())") NODE_PATH=$(npm root -g)
   node render.js klp_display.mp4
   CRF=24 node render.js klp_cinema.mp4 --page cinema.html
   ```
   静止画確認は `node render.js --preview 1.5,4.5,14` のように秒を指定。

実写素材が届いたら、同じ構成・テロップで差し替え可能。
