# 毎週土曜 記事自動公開ルーチン（実行手順書）

**代表決定（2026-09-14）**: 毎週土曜 9:00（日本時間）に、記事キューの先頭1本を自動で作成し、HP に公開する。代表の事前承認は不要（包括承認）。代表は公開後に確認し、問題があれば「NN 取り下げ」で非公開にする。

この手順書は、Routine（定期実行）で起動した AI セッションが**そのまま実行する**ためのものです。順番どおり進め、途中で止まった場合は「何が止まったか」を報告して終了すること。

## 0. 前提

- リポジトリ: `lunamax77/-next-vision`、作業ブランチ: `claude/hp-zip-import-a2ibct`（このブランチへの push で GitHub Actions が nextvision.fun に自動デプロイする）。
- 対外行為の扱い: 記事公開は代表が包括承認済み。**それ以外の対外行為（メール送信・SNS投稿・外部サービス登録など）はしない。**
- 秘密情報（サーバーのパスワード等）は扱わない。`site/config.php` は触らない。

## 1. 準備

```bash
git fetch origin claude/hp-zip-import-a2ibct && git checkout claude/hp-zip-import-a2ibct && git pull --ff-only origin claude/hp-zip-import-a2ibct
pip install -q markdown
```

## 2. 今週の記事を決める

- `docs/marketing/article-queue.md` の表で、状態が `待機` の**一番上の行**を今週の記事とする（番号 NN、タイトル案、キーワード、主CTA、アイキャッチ候補）。
- 同じ番号の下書きが `docs/marketing/articles/NN-*.md` に既にあればそれを使う。無ければ書く（次項）。

## 3. 下書きを書く（`docs/marketing/articles/NN-<slug>.md`）

形式は `docs/marketing/articles/01-family-shukyaku.md` と同じ front matter（title / description / slug / keywords / cta / reader / status）に加えて、`lead`（アイキャッチのファイル名）、`category`、`cta_heading`、`cta_text`、`cta_buttons` を書く（書式は `tools/build_article.py` の冒頭コメント）。slug は英小文字とハイフンのみ。

**書き方のルール（必ず守る）**

1. 読者は「商業施設・店舗・展示場・ディーラーの販促／集客担当者」。保護者向けには書かない。
2. 2,500〜3,500字。title は32字以内、description は120字以内。H2 を4〜6個、各 H2 の下に本文2〜4段落。最後に「まとめ」。
3. **事実は HP に書いてあることだけ**を使う。参照してよい一次情報: `site/index.html`（料金表・条件早見表・FAQ・プラン）、`site/klp.html`、`site/punilab.html`、`site/seal.html`、`site/air.html`。そこに無い数字・実績・顧客名・効果の数値は書かない。効果は「〜が期待できます」に留める。
4. 価格を書く場合は `site/index.html` の料金表と同じ金額で、「税別・機材レンタル費用・運営スタッフ費と送料は別途」を必ず添える。2日目以降50%はキッズライセンスパークとエア遊具のみ（ワークショップは対象外）。
5. 取引先の社名・施設名・店舗名は書かない（「大手家電量販店」「携帯キャリアショップ」など業種まで）。会社の住所も書かない。
6. 返信期限の表現は「1営業日以内（土日祝を除く）」。
7. 画像は `site/images/` にある加工済みのものだけ（klp-photo-hero.jpg / klp-photo-scene.jpg / klp-photo-session.jpg / punilab-colors.jpg / punilab-mold.jpg / punilab-pack.jpg / license.jpg / seal.jpg / airizm.jpg / case-klp-store.jpg / case-seal-store.jpg）。本文への図版は `[figure: ...]` 記法で1〜2か所。
8. 内部リンクを最低2本（主CTAの商材ページ＋関連する公開済み記事 `blog/*.html`）。外部リンクは張らない。
9. `<!-- 要確認 -->` は**残さない**。自分で判断できない事実は書かない（削る）。
10. AI が書いたことを隠さないが、記事内で「AI」に言及する必要はない。文体は「です・ます」、断定しすぎない。

## 4. 公開する

```bash
python3 tools/build_article.py NN --publish            # site/blog/<slug>.html 生成、index.html の読みもの欄（先頭）と sitemap.xml に追加、下書きの status を published に
python3 -c "import html.parser,sys;open('site/blog/<slug>.html').read()" && grep -c "要確認" site/blog/<slug>.html   # 0 であること
```

- `docs/marketing/article-queue.md` の該当行を `公開済（YYYY-MM-DD）` にし、「公開済み」表に URL を追記。
- 変更を確認: `git status` に含まれるのは `site/blog/<slug>.html`、`site/index.html`、`site/sitemap.xml`、`docs/marketing/articles/NN-*.md`、`docs/marketing/article-queue.md` だけであること。**それ以外のファイルは変更しない。**

```bash
git add site/blog site/index.html site/sitemap.xml docs/marketing
git commit -m "HP: コラム記事NN「<タイトル>」を公開（毎週土曜の自動公開ルーチン）"
git push -u origin claude/hp-zip-import-a2ibct
```

- push 後 2分以内に GitHub Actions「Deploy site to nextvision.fun」が成功したことを確認する（GitHub の MCP ツールが使える場合は最新の workflow run の conclusion を見る。使えない場合は「未確認」と報告する）。失敗していて原因が `530 Login` や `ETIMEDOUT` なら1回だけ再実行し、それでも失敗なら報告して終了。

## 5. 報告（セッションの最後に必ず）

次の形式で短く報告する（通知メールに載る）:

```
【記事自動公開】NN タイトル
URL: https://nextvision.fun/blog/<slug>.html
文字数: 約N字 ／ キーワード: …
デプロイ: 成功（Actions #N） or 未確認 or 失敗（理由）
次回（来週土曜）: NN+1 タイトル案
代表へのお願い: 内容に問題があれば「NN 取り下げ」と返信。Search Console の URL検査でインデックス登録をリクエスト。
```

## 6. 取り下げの手順（代表から「NN 取り下げ」と言われたとき）

`site/blog/<slug>.html` を削除、`site/index.html` の該当 `col-card` と `site/sitemap.xml` の該当 `<url>` を削除、下書きを `docs/marketing/articles/archive/` に移して status を withdrawn にし、push する。
