# HP 掲載メディア（写真・動画）の台帳

最終更新: 2026-09-09　担当: プロダクト

## 方針（代表決定）

- 実写を優先する。イラストは実写が無い箇所のみ。
- 実写に写る人物の顔はモザイク。会場が特定できるロゴ・看板・売場はぼかす。のぼり・コース・機材は残す。
- AI生成の人物（こども免許証の見本）はモザイク不要（2026-09-09 代表指示）。
- 掲載前に加工後の画像を代表に見せて「公開OK」を得る。

## 掲載中のメディア

| ファイル | 掲載場所 | 元データ（Google ドライブ） | 加工 |
| --- | --- | --- | --- |
| images/klp-photo-hero.jpg | klp.html 上部 ／ index.html 開催イメージ | 企画・提案書/コンテンツ/キッズライセンスパーク/画像/6月ヨドバシ梅田 ② | 顔モザイク・背景ぼかし |
| images/klp-photo-scene.jpg | klp.html 開催イメージ ／ index.html 開催イメージ | 同 ① | 同上 |
| images/klp-photo-session.jpg | klp.html 開催イメージ | 同 ③ | 同上 |
| images/klp-license.jpg, license.jpg, klp.jpg | klp.html ／ index.html | AI生成 | モザイクなし |
| video/punilab-promo.mp4（+ punilab-promo-poster.jpg） | punilab.html MOVIE ／ index.html 動画で見る | 企画・提案書/コンテンツ/スクイーズ/fixed_audio_overlap_final.mp4（代表作成） | faststart のみ。出演者2名の顔あり（代表承認 2026-09-09） |
| video/punilab-making.mp4（+ punilab-making-poster.jpg） | punilab.html MOVIE | ぷにラボ作成動画 ①⑫⑬ ＋ 素材 ② を結合（各4秒） | 540×960・無音・ループ |
| images/punilab-colors.jpg / punilab-mold.jpg / punilab-pack.jpg | punilab.html 作れるアイテム ／ index.html 開催イメージ | 素材②・作成①・作成⑬ から切り出し | 4:3 トリミング |
| images/car-*.jpg（7台） | klp.html 車種選択 | カタログ PPTX（元が横240px） | 4倍拡大・シャープ化。**元の大きな写真が届けば差し替える** |

## 未使用の素材（判断済み）

- ヨドバシ梅田 スクイーズ会場写真5枚：店名・通信会社ロゴが大半を占めるため見送り（2026-09-09）。
- ヨドバシ京都 スクイーズ写真6枚（1枚4〜7MB）：未確認。必要になれば取り出す。
- スクイーズ(子供作成ver).MOV（515MB）：未確認。長尺のため、使うなら短く切り出す。

## 作り方メモ（プロダクト用）

- 動画は Google ドライブ MCP で取得（base64 → ファイル化）。ffmpeg は `imageio-ffmpeg` の同梱バイナリを使用。
- 顔検出は YuNet（OpenCV FaceDetectorYN）。検出漏れは目視で座標を追加する。
- 公開前プレビューは、画像・動画を data URI で埋め込んだ単一 HTML を Artifact として発行する。
