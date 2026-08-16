#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""詳細ページ(klp/punilab/seal).html を index.html と同じデザインで生成する。
index.html の <style> を共有し、各ページ固有の内容を差し込む。再実行で再生成。"""
import re, os
HERE = os.path.dirname(os.path.abspath(__file__))
idx = open(os.path.join(HERE, "index.html"), encoding="utf-8").read()
STYLE = re.search(r'<style>.*?</style>', idx, re.S).group(0)
FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@400;500;700;900'
         '&family=Baloo+2:wght@600;700;800'
         '&family=Roboto+Mono:wght@500;700&display=swap" rel="stylesheet">')

EXTRA = """
<style>
.crumb{font-size:12.5px;color:var(--sub);padding:16px 0 0}
.crumb a{color:var(--blue-d);text-decoration:none}
.dhero{padding:clamp(20px,3.5vw,40px) 0 clamp(28px,5vw,52px)}
.dhero-grid{display:grid;grid-template-columns:1fr 1.06fr;gap:clamp(24px,4vw,46px);align-items:center}
@media(max-width:860px){.dhero-grid{grid-template-columns:1fr}}
.dhero h1{font-size:clamp(26px,4.2vw,42px);line-height:1.42;margin:12px 0 14px}
.dhero .lead{color:var(--ink-soft);font-size:15.5px}
.dphoto{border-radius:var(--r);overflow:hidden;border:4px solid #fff;box-shadow:0 22px 44px -22px rgb(var(--shadow)/.5)}
.dphoto img{width:100%;display:block;aspect-ratio:4/3;object-fit:cover}
.keypts{display:grid;gap:9px;margin:18px 0 22px}
.keypts div{display:flex;gap:10px;align-items:flex-start;font-size:14.5px;color:var(--ink)}
.keypts b{flex:none;width:20px;height:20px;border-radius:50%;background:var(--blue);margin-top:2px;
  -webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='white' d='M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z'/%3E%3C/svg%3E") center/14px no-repeat;
  mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='white' d='M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z'/%3E%3C/svg%3E") center/14px no-repeat}
.gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
@media(max-width:700px){.gallery{grid-template-columns:1fr 1fr}}
.gallery figure{margin:0}
.gallery img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:14px;border:2px solid var(--line);background:#fff}
.gallery.contain img{object-fit:contain;padding:8px}
.gallery figcaption{font-size:12px;color:var(--sub);margin-top:6px;text-align:center}
.steps{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
@media(max-width:820px){.steps{grid-template-columns:repeat(2,1fr)}}
.pstep{background:var(--card);border:2px solid var(--line);border-radius:14px;padding:16px 15px}
.pstep .n{width:32px;height:32px;border-radius:50%;background:var(--orange);color:#3a2600;font-family:var(--round);
  font-weight:700;display:grid;place-items:center;margin-bottom:9px;font-size:14px}
.pstep b{display:block;font-family:var(--display);font-size:14.5px;margin-bottom:4px}
.pstep p{font-size:12.5px;color:var(--ink-soft)}
.specbox{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
@media(max-width:560px){.specbox{grid-template-columns:1fr}}
.specbox div{background:var(--card);border:2px solid var(--line);border-radius:12px;padding:13px 16px;font-size:14px}
.specbox b{display:block;font-size:11.5px;color:var(--blue-d);font-family:var(--display);margin-bottom:3px}
.pricebar{display:flex;flex-wrap:wrap;gap:18px;align-items:center;justify-content:space-between;background:var(--cream);
  border:2px solid var(--line);border-radius:var(--r);padding:24px 28px;margin-top:8px}
.pricebar .p{font-family:var(--mono);font-weight:700;font-size:clamp(28px,4vw,38px);color:var(--coral);line-height:1}
.pricebar .p small{font-size:15px;color:var(--ink);font-family:var(--display)}
.rel{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media(max-width:640px){.rel{grid-template-columns:1fr}}
.rel a{display:flex;gap:13px;align-items:center;background:var(--card);border:2px solid var(--line);border-radius:14px;
  padding:12px;text-decoration:none;transition:.16s}
.rel a:hover{border-color:var(--blue);transform:translateY(-3px)}
.rel img{width:78px;height:78px;object-fit:cover;border-radius:10px;flex:none;background:#fff}
.rel b{font-family:var(--display);font-size:15px;color:var(--ink)}
.rel span{font-size:12.5px;color:var(--sub);display:block}
.carsel{display:grid;grid-template-columns:1.15fr .85fr;gap:24px;align-items:center;background:var(--card);
  border:2px solid var(--line);border-radius:var(--r);padding:clamp(18px,3vw,26px)}
@media(max-width:760px){.carsel{grid-template-columns:1fr}}
.car-stage{text-align:center}
.car-stage img{width:100%;max-width:440px;margin:0 auto;border-radius:12px;background:#fff}
.car-meta b{display:block;font-family:var(--display);font-size:clamp(18px,2.4vw,22px);margin-top:12px;color:var(--ink)}
.car-meta span{font-size:13.5px;color:var(--sub)}
.car-thumbs{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
.car-t{background:#fff;border:2px solid var(--line);border-radius:12px;padding:6px;cursor:pointer;transition:.15s;font:inherit}
.car-t:hover{border-color:var(--blue);transform:translateY(-2px)}
.car-t.is-on{border-color:var(--coral);background:var(--pink-soft)}
.car-t img{width:100%;border-radius:8px;display:block}
.car-t small{display:block;font-size:11px;color:var(--ink-soft);font-weight:700;font-family:var(--display);padding:4px 2px 2px}
.effs{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
@media(max-width:760px){.effs{grid-template-columns:repeat(2,1fr)}}
.eff{background:var(--card);border:2px solid var(--line);border-radius:14px;padding:16px 12px;text-align:center}
.eff b{display:block;font-family:var(--mono);font-weight:700;font-size:20px;color:var(--coral)}
.eff span{font-size:12px;color:var(--ink-soft)}
/* 必要スペースの強調ブロック */
.spacehl{display:flex;flex-wrap:wrap;gap:16px 20px;align-items:center;background:var(--cream);border:2px solid var(--orange);
  border-radius:var(--r);padding:22px 26px;margin-bottom:16px}
.spacehl .sh-ic{width:52px;height:52px;flex:none;color:var(--coral)}
.spacehl .sh-main{min-width:180px}
.spacehl .sh-t{font-family:var(--round);font-size:12px;letter-spacing:.12em;color:var(--blue-d);font-weight:700}
.spacehl .sh-v{font-family:var(--display);font-weight:900;font-size:clamp(24px,4.5vw,36px);color:var(--ink);line-height:1.15}
.spacehl .sh-n{font-size:12.5px;color:var(--ink-soft);flex:1;min-width:200px;line-height:1.7}
</style>
"""

HEADER = """<div class="topbar"><div class="topbar-in"><span>大阪発・全国対応</span><span>平日 9:30 - 18:00</span></div></div>
<header>
  <div class="bar">
    <a href="index.html" class="logo"><img src="images/logo.png" alt="株式会社NextVision"><span><b>NextVision</b><small>キッズ体験イベントの企画・運営</small></span></a>
    <button class="burger" aria-label="メニュー" aria-expanded="false"><span></span><span></span><span></span></button>
    <nav class="main">
      <a href="index.html#pillars">できること</a>
      <a href="index.html#contents">体験コンテンツ</a>
      <a href="index.html#plan">プラン</a>
      <a href="index.html#safety">安心・安全</a>
      <a href="index.html#price">料金</a>
      <a href="index.html#faq">FAQ</a>
      <a href="tel:07013192126" class="tel"><b>070-1319-2126</b><span>平日 9:30 - 18:00</span></a>
      <a href="index.html#contact" class="btn btn-primary nav-cta">相談する</a>
    </nav>
  </div>
</header>"""

FOOTER = """<footer>
  <div class="wrap foot">
    <div>
      <img src="images/logo.png" alt="株式会社NextVision">
      <div>キッズ体験イベントの企画・運営</div>
      <div style="margin-top:10px;line-height:1.7">〒550-0014<br>大阪府大阪市西区北堀江1丁目23番25号<br>シティタワー堀江2501号室</div>
    </div>
    <div style="text-align:right">
      <div><a href="tel:07013192126">070-1319-2126</a>　/　<a href="mailto:data@nextvision.fun">data@nextvision.fun</a></div>
      <div style="margin-top:6px">© 2026 NextVision Inc.</div>
    </div>
  </div>
</footer>
<script>
const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
const burger=document.querySelector('.burger'),navm=document.querySelector('nav.main');
burger.addEventListener('click',()=>{const o=navm.classList.toggle('open');burger.setAttribute('aria-expanded',o?'true':'false');document.body.style.overflow=o?'hidden':'';});
navm.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{navm.classList.remove('open');burger.setAttribute('aria-expanded','false');document.body.style.overflow='';}));
</script>"""

def cta():
    return ('<section class="blue-sec"><div class="wrap" style="text-align:center">'
            '<span class="kick">CONTACT</span><h2 style="margin:12px 0 10px">このコンテンツで相談する</h2>'
            '<p style="color:rgb(255 255 255/.9);margin-bottom:22px">会場の広さ・想定来場者数・ご予算をお聞かせください。日程未定でもOKです。</p>'
            '<a href="index.html#contact" class="btn btn-primary">相談・お見積りへ</a></div></section>')

def related(cur):
    cards = {
      "klp": ('images/klp.jpg','キッズライセンスパーク','EVカー運転体験＋こども免許証','klp.html'),
      "punilab": ('images/punilab-paw.jpg','ぷにラボ｜スクイーズ工作','肉球＆アニマル型でぷにぷに制作','punilab.html'),
      "seal": ('images/seal.jpg','シールデコ ワークショップ','シャカシャカシールを制作','seal.html'),
    }
    items="".join(f'<a href="{h}"><img src="{img}" alt="{t}"><span><b>{t}</b><span>{d}</span></span></a>'
                  for k,(img,t,d,h) in cards.items() if k!=cur)
    return ('<section class="tint"><div class="wrap"><div class="sec-head reveal"><span class="kick">OTHER</span>'
            f'<h2>ほかの体験コンテンツ</h2></div><div class="rel reveal">{items}</div></div></section>')

def keypts(items):
    return '<div class="keypts">'+''.join(f'<div><b></b>{x}</div>' for x in items)+'</div>'

def specbox(pairs):
    return '<div class="specbox">'+''.join(f'<div><b>{k}</b>{v}</div>' for k,v in pairs)+'</div>'

def spec_section(space_val, space_note, pairs):
    """会場で実施可能か判断できるスペック表。必要スペースを大きく図示的に強調。"""
    ic=('<svg class="sh-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" '
        'stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>')
    hl=(f'<div class="spacehl">{ic}'
        f'<div class="sh-main"><div class="sh-t">SPACE ／ 必要スペース</div><div class="sh-v">{space_val}</div></div>'
        f'<div class="sh-n">{space_note}</div></div>')
    return ('<section><div class="wrap"><div class="sec-head reveal"><span class="kick">SPEC</span>'
            '<h2>会場でできる？スペック</h2><p>いずれも目安です。会場条件により変動しますので、まずはご相談ください。</p></div>'
            f'<div class="reveal">{hl}'+specbox(pairs)+'</div></div></section>')

def page(slug, title, desc, hero_photo, kick, h1, lead, keys, price_html, body_mid):
    head=(f'<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8">'
          f'<meta name="viewport" content="width=device-width, initial-scale=1">'
          f'<title>{title}</title><meta name="description" content="{desc}">'
          f'<meta name="theme-color" content="#3E9BD8"><link rel="canonical" href="https://nextvision.fun/{slug}.html">'
          f'{FONTS}{STYLE}{EXTRA}</head><body>')
    crumb=(f'<div class="wrap crumb"><a href="index.html">ホーム</a> ／ <a href="index.html#contents">体験コンテンツ</a> ／ {h1}</div>')
    dhero=(f'<section class="dhero"><div class="wrap dhero-grid">'
           f'<div class="reveal"><span class="kick">{kick}</span><h1>{h1}</h1>'
           f'<p class="lead">{lead}</p>{keypts(keys)}'
           f'<a href="index.html#contact" class="btn btn-blue">相談・お見積り</a></div>'
           f'<div class="dphoto reveal"><img src="{hero_photo}" alt="{h1}" loading="lazy"></div>'
           f'</div></section>')
    price=(f'<section><div class="wrap"><div class="sec-head reveal"><span class="kick">PRICE</span><h2>料金</h2></div>'
           f'<div class="pricebar reveal">{price_html}'
           f'<a href="index.html#price" class="btn btn-primary">見積りシミュレーター</a></div>'
           f'<p class="note">※機材レンタル費用（税別）。運営スタッフ費・送料は別途。配送料は実費でご請求します。</p></div></section>')
    return head+HEADER+crumb+dhero+body_mid+price+cta()+related(slug)+FOOTER+'</body></html>'

# ---------- KLP ----------
klp_mid=(
 # 車を選べる(インタラクティブ)
 '<section id="cars" class="tint"><div class="wrap"><div class="sec-head reveal"><span class="kick">LINE-UP</span>'
 '<h2>車を選べる</h2><p>本格EVカーを複数ご用意。会場やご希望に合わせて車種をお選びいただけます。</p></div>'
 '<div class="carsel reveal"><div class="car-stage"><img id="car-img" src="images/car-gtr.jpg" alt="選択中の車種">'
 '<div class="car-meta"><b id="car-name">Mercedes-Benz GT R</b><span id="car-type">スポーツカー／スピード感重視</span></div></div>'
 '<div class="car-thumbs">'
 '<button type="button" class="car-t is-on" data-img="images/car-gtr.jpg" data-name="Mercedes-Benz GT R" data-type="スポーツカー／スピード感重視"><img src="images/car-gtr.jpg" alt="GT R"><small>GT R</small></button>'
 '<button type="button" class="car-t" data-img="images/car-lc500.jpg" data-name="LEXUS LC500" data-type="高級スポーツカー／高級感重視"><img src="images/car-lc500.jpg" alt="LC500"><small>LC500</small></button>'
 '<button type="button" class="car-t" data-img="images/car-540k.jpg" data-name="Mercedes-Benz 540K" data-type="クラシックカー／レトロ感"><img src="images/car-540k.jpg" alt="540K"><small>540K</small></button>'
 '<button type="button" class="car-t" data-img="images/car-gx550.jpg" data-name="LEXUS GX550（二人乗り）" data-type="SUV／二人乗り"><img src="images/car-gx550.jpg" alt="GX550"><small>GX550</small></button>'
 '</div></div>'
 '<p class="note">※パトカー（サイレン演出付き）など、その他車種にも対応可能です。車種は在庫状況により変わる場合があります。</p>'
 '<script>(function(){var i=document.getElementById("car-img"),n=document.getElementById("car-name"),t=document.getElementById("car-type");'
 'document.querySelectorAll(".car-t").forEach(function(b){b.addEventListener("click",function(){'
 'document.querySelectorAll(".car-t").forEach(function(x){x.classList.remove("is-on")});b.classList.add("is-on");'
 'i.src=b.dataset.img;n.textContent=b.dataset.name;t.textContent=b.dataset.type;});});})();</script>'
 '</div></section>'
 # 3つのポイント
 '<section><div class="wrap"><div class="sec-head reveal"><span class="kick">POINT</span>'
 '<h2>集客を強くする3つのポイント</h2></div><div class="uses reveal">'
 '<div class="use"><div class="u-ic" style="background:var(--blue)"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/></svg></div><h3>視認性</h3><p>キッズカー展示＋ゲートで「何のイベントか」が一目で伝わり、通行客の足を止めます。</p></div>'
 '<div class="use"><div class="u-ic" style="background:var(--orange)"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.4 7.4H22l-6 4.5 2.3 7.1L12 16.8 5.7 21l2.3-7.1-6-4.5h7.6z"/></svg></div><h3>記念性</h3><p>顔写真入り「こども免許証」が“参加した証”に。持ち帰れる成果物で満足度が高い。</p></div>'
 '<div class="use"><div class="u-ic" style="background:var(--coral)"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7l1.5-2h3L15 7"/><circle cx="12" cy="13" r="3"/></svg></div><h3>撮影価値</h3><p>免許証×キッズカーでSNS映え。自然な拡散で来場喚起＆ブランド露出を獲得。</p></div>'
 '</div></div></section>'
 # 体験フロー
 '<section class="tint"><div class="wrap"><div class="sec-head reveal"><span class="kick">FLOW</span>'
 '<h2>体験フロー（1組 約8〜10分）</h2></div><div class="flow reveal">'
 '<div class="step"><div class="n">1</div><b>受付・撮影</b><i>顔写真を撮影</i></div>'
 '<div class="step"><div class="n">2</div><b>運転体験</b><i>コースを約3周</i></div>'
 '<div class="step"><div class="n">3</div><b>免許証発行</b><i>その場でプリント</i></div>'
 '<div class="step"><div class="n">4</div><b>撮影</b><i>フォトスポットで</i></div>'
 '<div class="step"><div class="n">5</div><b>商談導線へ</b><i>保護者様をご案内</i></div>'
 '</div></div></section>'
 # 期待される効果
 '<section><div class="wrap"><div class="sec-head reveal"><span class="kick">EFFECT</span><h2>期待される効果</h2></div>'
 '<div class="effs reveal">'
 '<div class="eff"><b>+30分</b><span>滞在時間</span></div>'
 '<div class="eff"><b>SNS</b><span>自然拡散</span></div>'
 '<div class="eff"><b>再来訪</b><span>率アップ</span></div>'
 '<div class="eff"><b>商談</b><span>導線確立</span></div>'
 '<div class="eff"><b>3世代</b><span>集客</span></div>'
 '</div></div></section>'
 # 開催の様子
 '<section class="tint"><div class="wrap"><div class="sec-head reveal"><span class="kick">SCENE</span>'
 '<h2>実際の開催の様子</h2><p>商業施設・店舗の店頭で、コース・受付・免許発行までワンストップで運営します。</p></div>'
 '<div class="gallery reveal">'
 '<figure><img src="images/klp-event1.jpg" alt="キッズライセンスパーク 会場の様子"><figcaption>会場全景（コース・受付・EVカー）</figcaption></figure>'
 '<figure><img src="images/klp-event2.jpg" alt="キッズライセンスパーク 運転体験"><figcaption>EVカーで運転体験</figcaption></figure>'
 '<figure><img src="images/klp.jpg" alt="こども免許証と車種"><figcaption>免許証見本＆車種ラインナップ</figcaption></figure>'
 '</div></div></section>'
 +spec_section('10m × 8m 目安',
   'コース＋受付・発行ブースを含む目安です。会場の形状に合わせてコース配置を調整します。屋内・屋外どちらも対応可能。',
   [('対象年齢','3〜8歳（会場により調整）'),('所要時間','1組およそ 8〜12分'),
    ('実施人数目安','応相談'),('推奨スタッフ','2〜3名'),
    ('車種','本格EVカー 7タイプ'),('免許証','顔写真入り・その場で約5分発行'),
    ('電源','発行機材・EVカー充電で必要'),('屋内外','屋内・屋外')]))
klp_price=('<div><div class="p">¥90,000<small>〜／日（税別）</small></div>'
           '<div style="font-size:13px;color:var(--ink-soft);margin-top:6px">スタンダード（車両2台・1コース）／プレミアム ¥135,000（車両3台・フルセット）</div></div>')
klp=page("klp","キッズライセンスパーク｜こども免許証がもらえる運転体験｜NextVision",
 "EVカーの運転体験と、顔写真入り『こども免許証』をその場で発行。商業施設・店舗の集客イベントに。設営〜運営代行まで対応。",
 "images/klp-event1.jpg","LICENSE PARK","キッズライセンスパーク",
 "EVカーでコースを周回し、顔写真入りの「こども免許証」をその場で発行。写真が撮れて持ち帰れる、来店の動機になる看板コンテンツです。",
 ["こども免許証を「その場で・約5分」発行","本格EVカー 7車種で憧れの運転体験","写真が撮れてSNS映え、ご家族の来店理由に","受付〜安全管理まで運営代行もお任せ"],
 klp_price, klp_mid)

# ---------- PUNILAB ----------
puni_steps=[("型と色を選ぶ","お気に入りの型（肉球・とら・ぞう・ペンギン）とカラーを選ぶ"),
 ("計量＆混ぜる","カップに液を入れ、色を付けて混ぜる"),
 ("型に流し込む","こぼれないよう静かにモールドへ流し込む"),
 ("会場作業は終了","ワークショップはここまで（会場作業 約20分）"),
 ("そのまま持ち帰り","お持ち帰り袋に入れ、型のままお渡し"),
 ("水につけて剥がす","ご自宅で水につけ、型からそっと剥がす"),
 ("パウダーで完成","マジックパウダーをかけて、おうちで完成！")]
puni_mid=(
 '<section><div class="wrap"><div class="sec-head reveal"><span class="kick">POINT</span><h2>ぷにラボの特長</h2>'
 '<p>「肉球（大）スクイーズ」と「アニマル3種モールド」の2本柱でお届けします。</p></div>'
 '<div class="specbox reveal">'+specbox([
   ('肉球（大）スクイーズ｜通信限定景品','縦8×横8×厚さ3cmの極厚・特大ボリューム。安心・安全なシリコン素材の、クセになるぷにぷに触感。「見積もり参加でプレゼント」の設計で、お子様から保護者様への“参加”を強力に後押しします。'),
   ('アニマル3種モールド｜とら・ぞう・ペンギン','縦3×横4×高さ1cmの安定した薄型シリコン型。男の子も女の子も大好きな人気の3種。液剤を注ぎやすくこぼれにくいので、小さなお子様でも失敗しない簡単オペレーションです。'),
 ])+'</div></div></section>'
 '<section class="tint"><div class="wrap"><div class="sec-head reveal"><span class="kick">PROCESS</span>'
 '<h2>制作の流れ（全7工程）</h2><p>会場作業は約20分。仕上げはご自宅で。「型のまま持ち帰る」設計で、おうちで完成させるワクワクまで。</p></div>'
 '<div class="steps reveal">'+''.join(
   f'<div class="pstep"><div class="n">{i+1}</div><b>{t}</b><p>{d}</p></div>' for i,(t,d) in enumerate(puni_steps))+
 '</div></div></section>'
 '<section><div class="wrap"><div class="sec-head reveal"><span class="kick">GALLERY</span>'
 '<h2>作れるアイテム</h2><p>手元で何度も触りたくなる、癒しのぷにぷにアイテム。サイズ感もチェックしてください。</p></div>'
 '<div class="gallery reveal">'
 '<figure><img src="images/punilab-paw.jpg" alt="肉球（大）スクイーズ 通信限定景品"><figcaption>肉球スクイーズ（8×8×3cm・通信限定景品）</figcaption></figure>'
 '<figure><img src="images/punilab-animals.jpg" alt="アニマル型スクイーズ とら・ぞう・ペンギン"><figcaption>アニマル3種モールド（3×4×1cm）</figcaption></figure>'
 '<figure><img src="images/squeeze.jpg" alt="デコレーション完成品"><figcaption>デコ完成イメージ（ハート・星など）</figcaption></figure>'
 '</div></div></section>'
 +spec_section('6畳〜',
   'テーブル＋イスで設置できる省スペース設計。会場作業は約20分で、保護者様へのご案内タイムも確保。仕上げはご自宅で。屋内向き。',
   [('対象年齢','4歳〜'),('所要時間','約20分・1組（＋自宅仕上げ）'),
    ('実施人数目安','応相談'),('推奨スタッフ','1〜2名'),
    ('工程','全7工程'),('電源','一部必要'),('屋内外','屋内向き')]))
puni_price='<div><div class="p">¥90,000<small>／日（税別）</small></div><div style="font-size:13px;color:var(--ink-soft);margin-top:6px">所要 約20分／組（＋自宅仕上げ）・全7工程／6畳程度から</div></div>'
puni=page("punilab","ぷにラボ｜スクイーズ工作ワークショップ｜NextVision",
 "肉球（大）スクイーズと、とら・ぞう・ペンギンのアニマル3種モールドを制作。型のまま持ち帰り、おうちで完成。省スペース・着座20分で集客イベントに。",
 "images/punilab-paw.jpg","PUNI-LABO","ぷにラボ｜スクイーズ工作",
 "極厚の肉球（大）スクイーズと、とら・ぞう・ペンギンのアニマル3種モールドが作れる、ぷにぷにスクイーズ作成体験。「型のまま持ち帰り、おうちで完成させる」ワクワクまで設計したワークショップです。",
 ["肉球（大）スクイーズ＋アニマル3種の2本柱","型のまま持ち帰り→おうちで完成のワクワク","安心・安全なシリコン素材で小さなお子様も安心","6畳〜の省スペース・会場作業20分で商談タイムも"],
 puni_price, puni_mid)

# ---------- SEAL ----------
seal_mid=(
 '<section><div class="wrap"><div class="sec-head reveal"><span class="kick">RECORD</span>'
 '<h2>開催実績</h2><p>楽天モバイル・ドコモなど、通信キャリアの店頭イベントで多数開催しています。</p></div>'
 '<div class="gallery contain reveal">'
 '<figure><img src="images/seal-event.jpg" alt="ふにふにシール作り体験会 告知"><figcaption>ふにふにシール作り体験会（楽天モバイル イオンモール高岡店）</figcaption></figure>'
 '<figure><img src="images/seal.jpg" alt="シールデコ 制作イメージ"><figcaption>制作イメージ（シャカシャカシール）</figcaption></figure>'
 '</div></div></section>'
 '<section class="tint"><div class="wrap"><div class="sec-head reveal"><span class="kick">POINT</span><h2>シールデコの特長</h2></div>'
 '<div class="specbox reveal">'+specbox([
   ('シャカシャカシール','振ると中が揺れる、キラキラのオリジナルシール'),
   ('はさみ不要','道具を使わないので小さなお子様も安心'),
   ('省スペース・着座','6畳程度から。着座20分で待ち時間対策に'),
   ('当日持ち帰り','その場で完成、すぐにお持ち帰りいただけます'),
 ])+'</div></div></section>')
seal_steps=[("材料選び","ビーズやスパンコールを選ぶ"),("封入","カプセル内にパーツを投入"),
 ("接着","接着剤を塗り、固定準備"),("ラインストーン","飾りを散らす"),("仕上げ","背面にテープを貼り完成")]
seal_mid=('<section class="tint"><div class="wrap"><div class="sec-head reveal"><span class="kick">PROCESS</span>'
 '<h2>制作の流れ（全5工程・約25分）</h2><p>「こだわりを選ぶ」工程が集中を生み、テンポの良い5分×5工程設計。</p></div>'
 '<div class="steps reveal">'+''.join(f'<div class="pstep"><div class="n">{i+1}</div><b>{t}</b><p>{d}</p></div>' for i,(t,d) in enumerate(seal_steps))+
 '</div></div></section>')+seal_mid+spec_section('6畳〜',
   '道具不要・着座で楽しめる省スペース設計。テーブル＋イスがあれば店内スペースにも設置できます。屋内向き。',
   [('対象年齢','3歳〜'),('所要時間','約20〜25分・1組'),
    ('実施人数目安','応相談'),('推奨スタッフ','1〜2名'),
    ('工程','全5工程'),('電源','不要'),('屋内外','屋内向き')])
seal_price='<div><div class="p">¥90,000<small>／日（税別）</small></div><div style="font-size:13px;color:var(--ink-soft);margin-top:6px">所要 約25分／組・全5工程／6畳程度から</div></div>'
seal=page("seal","シールデコ ワークショップ｜シャカシャカシール｜NextVision",
 "振ると中が揺れる『シャカシャカシール』を制作するワークショップ。はさみ不要で小さなお子様も安心。省スペース・着座20分で集客イベントに。",
 "images/seal.jpg","SEAL DECO","シールデコ ワークショップ",
 "星やハートの型と丸型カプセル、好みのスパンコールを組み合わせ、振ると中で揺れる“シャカシャカ”シールを制作するワークショップです。",
 ["振ると中で揺れるキラキラの“シャカシャカ”シール","パーツを選んで組み合わせる、唯一無二のデザイン","6畳〜の省スペース・着座 約25分で商談タイムも","その場で完成、当日お持ち帰り"],
 seal_price, seal_mid)

for slug,html in [("klp",klp),("punilab",puni),("seal",seal)]:
    open(os.path.join(HERE,f"{slug}.html"),"w",encoding="utf-8").write(html)
    print("wrote",slug+".html",len(html),"bytes")
