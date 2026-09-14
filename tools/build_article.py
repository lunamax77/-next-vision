#!/usr/bin/env python3
"""docs/marketing/articles/NN-slug.md → site/blog/slug.html（klp.html のヘッダー・フッター・CSSを流用）
使い方: python3 tools/build_article.py 02 03   （番号だけ指定。設定は ARTICLES に追記）"""
import re,sys,json,html,glob
import markdown
ARTICLES={
 '01':dict(lead='klp-photo-scene.jpg',lead_alt='商業施設の店頭で開催したキッズ体験イベントの会場',cat='集客',minutes=6,
    figs={'打ち手2':'<figure class="two"><img src="../images/license.jpg" alt="こども免許証の見本"><img src="../images/seal.jpg" alt="シールデコで作った完成品"><figcaption>持ち帰れるもの：こども免許証（見本）と、シールデコの完成品</figcaption></figure>',
          '打ち手3':'<figure><img src="../images/punilab-colors.jpg" alt="ぷにラボで作る肉球スクイーズ"><figcaption>着座で楽しむ工作ワークショップ（ぷにラボの肉球スクイーズ）</figcaption></figure>'},
    cta_h='ファミリー集客のイベント、まずは条件だけご相談ください',cta_p='会場の広さ・電源・想定来場者数をお聞かせいただければ、開催できるコンテンツと概算をご提案します。日程未定でもOKです。',
    btns=[('../index.html#contact','相談・お見積り','btn-primary'),('../index.html#contents','体験コンテンツを見る','btn-ghost'),('../klp.html','キッズライセンスパーク','btn-ghost')]),
 '02':dict(lead='klp-photo-hero.jpg',lead_alt='EVカーの運転体験（キッズライセンスパーク）',cat='費用',minutes=7,
    figs={'機材レンタル費の目安':'<figure class="two"><img src="../images/airizm.jpg" alt="エア遊具（エアリズム）"><img src="../images/seal.jpg" alt="シールデコの完成品"><figcaption>機材の例：エア遊具（左）と、シールデコで作る完成品（右）</figcaption></figure>'},
    cta_h='予算に合わせた組み合わせを、無料でご提案します',cta_p='「この予算で何ができる？」からで大丈夫です。会場条件をお聞かせいただければ、機材費・スタッフ費・送料を分けた見積りをお出しします。',
    btns=[('../index.html#price','料金・見積りシミュレーター','btn-primary'),('../index.html#contact','相談・お見積り','btn-ghost'),('../air.html','エア遊具の料金表','btn-ghost')]),
 '03':dict(lead='klp-photo-session.jpg',lead_alt='クラシックカーで記念撮影するキッズライセンスパークの会場',cat='効果',minutes=6,
    figs={'コンテンツ別':'<figure class="two"><img src="../images/license.jpg" alt="こども免許証の見本"><img src="../images/punilab-colors.jpg" alt="ぷにラボの肉球スクイーズ"><figcaption>持ち帰れるものが体験を長くする：こども免許証（左）と肉球スクイーズ（右）</figcaption></figure>'},
    cta_h='「滞在時間を伸ばしたい」から、一緒に設計します',cta_p='会場の動線・想定来場者数・商談の有無をお聞かせください。所要時間と待ち時間まで含めた運営プランをご提案します。',
    btns=[('../klp.html','キッズライセンスパーク','btn-primary'),('../punilab.html','ぷにラボ','btn-ghost'),('../index.html#contact','相談・お見積り','btn-ghost')]),
 '04':dict(lead='klp-photo-scene.jpg',lead_alt='店頭イベントの会場設営（コース・受付・EVカー）',cat='準備',minutes=8,
    figs={'チェック3':'<figure><img src="../images/license.jpg" alt="こども免許証の見本"><figcaption>年齢・サイズに合わせた運用例：顔写真入りのこども免許証</figcaption></figure>'},
    cta_h='準備の抜け漏れは、こちらで一緒に確認します',cta_p='会場図面や写真があれば、スペース・電源・動線をこちらで確認してご提案します。初めての開催でも大丈夫です。',
    btns=[('../index.html#contact','相談・お見積り','btn-primary'),('../index.html#faq','よくあるご質問','btn-ghost'),('../index.html#contents','体験コンテンツを見る','btn-ghost')]),
}
CSS='''.post{max-width:760px;margin:0 auto;padding:10px 0 30px}.post .kick{margin-bottom:10px}.post h1{font-size:clamp(24px,4.4vw,34px);line-height:1.4;margin:0 0 12px;text-wrap:balance}.post .pmeta{display:flex;gap:14px;flex-wrap:wrap;font-size:13px;color:var(--sub);margin-bottom:18px}.post .lead-img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:16px;border:2px solid var(--line);display:block;margin:0 0 26px}.post .pbody{font-size:16px;line-height:2}.post .pbody p{margin:0 0 1.3em}.post .pbody h2{font-size:clamp(20px,3.2vw,24px);line-height:1.45;margin:40px 0 14px;padding:10px 14px;border-left:6px solid var(--blue);background:var(--tint,#FFF3E0);border-radius:0 12px 12px 0}.post .pbody h3{font-size:17.5px;margin:26px 0 8px;padding-bottom:6px;border-bottom:2px dashed var(--line)}.post .pbody ul,.post .pbody ol{padding-left:1.4em;margin:0 0 1.3em}.post .pbody li{margin:.3em 0}.post .pbody table{border-collapse:collapse;width:100%;font-size:14px;margin:0 0 1.5em}.post .pbody th,.post .pbody td{border:1px solid var(--line);padding:8px 10px;text-align:left;vertical-align:top}.post .pbody th{background:var(--tint,#FFF3E0);white-space:nowrap}.post .tw{overflow-x:auto;margin:0 0 1.5em}.post .tw table{margin:0}.post .pbody pre{background:#fff;border:2px solid var(--line);border-radius:12px;padding:14px 16px;font-size:14px;line-height:1.8;overflow-x:auto;white-space:pre-wrap;margin:0 0 1.5em}.post figure{margin:18px 0 26px}.post figure img{width:100%;border-radius:14px;border:2px solid var(--line);display:block;aspect-ratio:4/3;object-fit:cover;background:#fff}.post figure.two{display:grid;grid-template-columns:1fr 1fr;gap:12px}.post figure figcaption{grid-column:1/-1;font-size:12.5px;color:var(--sub);text-align:center;margin-top:6px}.post .pcta{margin:44px 0 0;padding:26px 24px;border-radius:18px;background:var(--navy);color:#fff;text-align:center}.post .pcta h2{color:#fff;font-size:20px;margin:0 0 8px}.post .pcta p{color:rgb(255 255 255/.85);font-size:14px;margin:0 0 16px}.post .pcta .btns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}.post .pcta .btn-ghost{background:transparent;color:#fff;border:2px solid rgb(255 255 255/.7)}.post .back{display:inline-block;margin-top:26px;color:var(--blue);font-weight:700;text-decoration:none}@media(max-width:600px){.post figure.two{grid-template-columns:1fr}}'''
def relfix(x): return re.sub(r'((?:href|src|action)=")(?!https?:|#|mailto:|tel:|data:|\.\./)([^"]+)"',r'\1../\2"',x)
def build(num,date):
    cfg=ARTICLES[num]
    mdp=glob.glob(f'docs/marketing/articles/{num}-*.md')[0]
    md=open(mdp,encoding='utf-8').read()
    m=re.match(r'---\n(.*?)\n---\n',md,re.S); fm=dict(l.split(': ',1) for l in m.group(1).split('\n') if ': ' in l); body=md[m.end():]
    body=re.sub(r'<!--.*?-->','',body,flags=re.S); body=re.sub(r'^\s*# .*\n','',body.strip()+'\n',count=1)
    bh=markdown.markdown(body,extensions=['tables','fenced_code'])
    title=fm['title']; desc=fm['description']; slug=fm['slug']; url=f'https://nextvision.fun/blog/{slug}.html'
    src=open('site/klp.html',encoding='utf-8').read()
    head=src[src.find('<head'):src.find('</head>')+7]; header=src[src.find('<header'):src.find('</header>')+9]
    footer=src[src.find('<footer'):src.find('</footer>')+9]; tail=src[src.find('</footer>')+9:]
    h=head
    h=re.sub(r'<title>.*?</title>',f'<title>{html.escape(title)}｜NextVision</title>',h,flags=re.S)
    h=re.sub(r'<meta name="description" content="[^"]*">',f'<meta name="description" content="{html.escape(desc)}">',h)
    h=h.replace('https://nextvision.fun/klp.html',url)
    for tag in ('og:title','twitter:title'):
        h=re.sub(r'(<meta (?:property|name)="'+tag+r'" content=")[^"]*"',lambda m:m.group(1)+html.escape(title)+'｜NextVision"',h)
    for tag in ('og:description','twitter:description'):
        h=re.sub(r'(<meta (?:property|name)="'+tag+r'" content=")[^"]*"',lambda m:m.group(1)+html.escape(desc)+'"',h)
    h=h.replace('https://nextvision.fun/images/klp.jpg',f'https://nextvision.fun/images/{cfg["lead"]}')
    h=re.sub(r'<script type="application/ld\+json">.*?</script>','',h,flags=re.S)
    h=h.replace('<meta property="og:type" content="article">',f'<meta property="og:type" content="article"><meta property="article:published_time" content="{date}">')
    ld={"@context":"https://schema.org","@graph":[
     {"@type":"Article","headline":title,"description":desc,"image":[f"https://nextvision.fun/images/{cfg['lead']}"],"datePublished":date,"dateModified":date,"author":{"@type":"Organization","name":"株式会社NextVision","url":"https://nextvision.fun/"},"publisher":{"@type":"Organization","name":"株式会社NextVision","logo":{"@type":"ImageObject","url":"https://nextvision.fun/images/logo.png"}},"mainEntityOfPage":url,"inLanguage":"ja"},
     {"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"ホーム","item":"https://nextvision.fun/"},{"@type":"ListItem","position":2,"name":"コラム","item":"https://nextvision.fun/#column"},{"@type":"ListItem","position":3,"name":title,"item":url}]}]}
    h=h.replace('</head>','<script type="application/ld+json">'+json.dumps(ld,ensure_ascii=False)+'</script></head>').replace('</style>',CSS+'</style>',1)
    header,footer,tail=relfix(header),relfix(footer),relfix(tail)
    def ins(m):
        for k,v in cfg['figs'].items():
            if k in m.group(0): return m.group(0)+'\n'+v
        return m.group(0)
    bh=re.sub(r'<h2>.*?</h2>',ins,bh)
    bh=bh.replace('<table>','<div class="tw"><table>').replace('</table>','</table></div>')
    bh=re.sub(r'href="(index\.html|klp\.html|punilab\.html|seal\.html|air\.html)',r'href="../\1',bh)
    btns=''.join(f'<a href="{u}" class="btn {c}">{t}</a>' for u,t,c in cfg['btns'])
    page=('<!DOCTYPE html><html lang="ja">'+h+'<body>'+header+
     f'<div class="wrap crumb"><a href="../index.html">ホーム</a> ／ <a href="../index.html#column">コラム</a> ／ {html.escape(title)}</div>'
     f'<main class="wrap post"><span class="kick">COLUMN</span><h1>{html.escape(title)}</h1>'
     f'<div class="pmeta"><span>公開日 {date}</span><span>読了 約{cfg["minutes"]}分</span><span>株式会社NextVision</span></div>'
     f'<img class="lead-img" src="../images/{cfg["lead"]}" alt="{html.escape(cfg["lead_alt"])}" fetchpriority="high">'
     f'<div class="pbody">{bh}</div>'
     f'<div class="pcta"><h2>{cfg["cta_h"]}</h2><p>{cfg["cta_p"]}</p><div class="btns">{btns}</div></div>'
     '<a class="back" href="../index.html#column">← コラム一覧へ</a></main>'+footer+tail)
    open(f'site/blog/{slug}.html','w',encoding='utf-8').write(page)
    return dict(num=num,slug=slug,title=title,desc=desc,lead=cfg['lead'],cat=cfg['cat'],date=date)
if __name__=='__main__':
    date=sys.argv[1]; out=[build(n,date) for n in sys.argv[2:]]
    print(json.dumps(out,ensure_ascii=False))
