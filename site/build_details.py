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
         '<link href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700;900'
         '&family=Zen+Kaku+Gothic+New:wght@400;500;700&family=Baloo+2:wght@600;700;800'
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
      "punilab": ('images/squeeze.jpg','ぷにラボ｜スクイーズ工作','動物モールドでぷにぷに制作','punilab.html'),
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
 '<section class="tint"><div class="wrap"><div class="sec-head reveal"><span class="kick">SCENE</span>'
 '<h2>実際の開催の様子</h2><p>商業施設・店舗の店頭で、コース・受付・免許発行までワンストップで運営します。</p></div>'
 '<div class="gallery reveal">'
 '<figure><img src="images/klp-event1.jpg" alt="キッズライセンスパーク 会場の様子"><figcaption>会場全景（コース・受付・EVカー）</figcaption></figure>'
 '<figure><img src="images/klp-event2.jpg" alt="キッズライセンスパーク 運転体験"><figcaption>EVカーで運転体験</figcaption></figure>'
 '<figure><img src="images/klp.jpg" alt="こども免許証と車種"><figcaption>免許証見本＆車種ラインナップ</figcaption></figure>'
 '</div></div></section>'
 '<section><div class="wrap"><div class="sec-head reveal"><span class="kick">SPEC</span><h2>仕様・目安</h2></div>'
 '<div class="specbox reveal">'+specbox([
   ('対象年齢','3〜8歳（会場により調整）'),('所要時間','1組およそ 8〜12分'),
   ('必要スペース','コース＋受付で 10m×8m が目安'),('車種','本格EVカー 7タイプ'),
   ('免許証','顔写真入り・その場で約5分発行'),('電源','発行機材・EVカー充電で必要'),
 ])+'</div></div></section>')
klp_price=('<div><div class="p">¥90,000<small>〜／日（税別）</small></div>'
           '<div style="font-size:13px;color:var(--ink-soft);margin-top:6px">スタンダード（車両2台・1コース）／プレミアム ¥135,000（車両3台・フルセット）</div></div>')
klp=page("klp","キッズライセンスパーク｜こども免許証がもらえる運転体験｜NextVision",
 "EVカーの運転体験と、顔写真入り『こども免許証』をその場で発行。商業施設・店舗の集客イベントに。設営〜運営代行まで対応。",
 "images/klp-event1.jpg","LICENSE PARK","キッズライセンスパーク",
 "EVカーでコースを周回し、顔写真入りの「こども免許証」をその場で発行。写真が撮れて持ち帰れる、来店の動機になる看板コンテンツです。",
 ["こども免許証を「その場で・約5分」発行","本格EVカー 7車種で憧れの運転体験","写真が撮れてSNS映え、ご家族の来店理由に","受付〜安全管理まで運営代行もお任せ"],
 klp_price, klp_mid)

# ---------- PUNILAB ----------
puni_steps=[("型と色を選ぶ","お気に入りの動物型（とら・ぞう・ペンギン）とカラーを選択"),
 ("計量＆混ぜる","カップに液を入れ、色を付けて混ぜる"),
 ("型に流し込む","こぼれないよう静かにモールドへ"),
 ("会場作業はここまで","型のままお持ち帰り袋でお渡し"),
 ("おうちで剥がす","ご自宅で水につけて型から剥がす"),
 ("パウダーで完成","マジックパウダーをかけて完成！")]
puni_mid=(
 '<section class="tint"><div class="wrap"><div class="sec-head reveal"><span class="kick">PROCESS</span>'
 '<h2>制作の流れ（全7工程）</h2><p>「型のまま持ち帰る」設計で、おうちで完成させるワクワクまで。ご家庭での体験価値と満足度を高めます。</p></div>'
 '<div class="steps reveal">'+''.join(
   f'<div class="pstep"><div class="n">{i+1}</div><b>{t}</b><p>{d}</p></div>' for i,(t,d) in enumerate(puni_steps))+
 '</div></div></section>'
 '<section><div class="wrap"><div class="sec-head reveal"><span class="kick">POINT</span><h2>ぷにラボの特長</h2></div>'
 '<div class="specbox reveal">'+specbox([
   ('人気のアニマル3種','とら・ぞう・ペンギン。「どれ作る？」のワクワク'),
   ('安心・かんたん','安全なシリコン素材＆こぼれにくい薄型モールド'),
   ('省スペース・着座','6畳程度から。着座20分でご案内の時間も確保'),
   ('通信限定ノベルティ','肉球（大）スクイーズ景品で「見積り参加」を後押し'),
 ])+'</div></div></section>')
puni_price='<div><div class="p">¥90,000<small>／日（税別）</small></div><div style="font-size:13px;color:var(--ink-soft);margin-top:6px">所要 約20分／組・全7工程／6畳程度から</div></div>'
puni=page("punilab","ぷにラボ｜スクイーズ工作ワークショップ｜NextVision",
 "動物モールド（とら・ぞう・ペンギン）でぷにぷにスクイーズを制作。型のまま持ち帰り、おうちで完成。省スペース・着座20分で集客イベントに。",
 "images/squeeze.jpg","PUNI-LABO","ぷにラボ｜スクイーズ工作",
 "動物モールドから、自分だけのぷにぷにスクイーズを制作。「型のまま持ち帰り、おうちで完成させる」ワクワクまで設計したワークショップです。",
 ["動物モールド（とら・ぞう・ペンギン）から制作","型のまま持ち帰り→おうちで完成のワクワク","安全なシリコン素材で小さなお子様も安心","6畳〜の省スペース・着座20分で商談タイムも"],
 puni_price, puni_mid)

# ---------- SEAL ----------
seal_mid=(
 '<section class="tint"><div class="wrap"><div class="sec-head reveal"><span class="kick">POINT</span><h2>シールデコの特長</h2></div>'
 '<div class="specbox reveal">'+specbox([
   ('シャカシャカシール','振ると中が揺れる、キラキラのオリジナルシール'),
   ('はさみ不要','道具を使わないので小さなお子様も安心'),
   ('省スペース・着座','6畳程度から。着座20分で待ち時間対策に'),
   ('当日持ち帰り','その場で完成、すぐにお持ち帰りいただけます'),
 ])+'</div></div></section>')
seal_price='<div><div class="p">¥90,000<small>／日（税別）</small></div><div style="font-size:13px;color:var(--ink-soft);margin-top:6px">所要 約20分／組・道具不要／6畳程度から</div></div>'
seal=page("seal","シールデコ ワークショップ｜シャカシャカシール｜NextVision",
 "振ると中が揺れる『シャカシャカシール』を制作するワークショップ。はさみ不要で小さなお子様も安心。省スペース・着座20分で集客イベントに。",
 "images/seal.jpg","SEAL DECO","シールデコ ワークショップ",
 "振ると中が揺れる「シャカシャカシール」を制作。はさみを使わず、小さなお子様も安心して楽しめるワークショップです。",
 ["振ると揺れるキラキラのシャカシャカシール","はさみ不要・道具いらずで安心","6畳〜の省スペース・着座20分","その場で完成、当日お持ち帰り"],
 seal_price, seal_mid)

for slug,html in [("klp",klp),("punilab",puni),("seal",seal)]:
    open(os.path.join(HERE,f"{slug}.html"),"w",encoding="utf-8").write(html)
    print("wrote",slug+".html",len(html),"bytes")
