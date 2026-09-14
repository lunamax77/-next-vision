#!/usr/bin/env python3
"""記事ドラフト（Markdown）→ HP デザインの記事HTML。

使い方:
  python3 tools/build_article.py 04                 # site/blog/<slug>.html を生成
  python3 tools/build_article.py 04 --publish       # 生成＋index.html の読みもの欄・sitemap.xml へ追加＋ドラフトの status を published に更新
  python3 tools/build_article.py 04 --date 2026-09-19

ドラフトの front matter（--- で囲む）で使う項目:
  title / description / slug / keywords / cta / reader   … 必須（既存ドラフトと同じ）
  lead: klp-photo-scene.jpg          … アイキャッチ（site/images/ のファイル名。省略時は klp-photo-scene.jpg）
  category: 集客                     … 読みもの欄に出す分類（省略時は「コラム」）
  minutes: 6                         … 読了目安（省略時は文字数から算出）
  cta_heading / cta_text             … 末尾の相談ボックスの見出し・本文（省略時は共通文）
  cta_buttons: index.html#contact|相談・お見積り ; klp.html|キッズライセンスパーク   … 「;」区切り、各要素は「リンク|表示名」（1つ目が主ボタン）
本文中の図版: 見出しの直後に画像を入れたい場合は本文に
  [figure: license.jpg|こども免許証の見本 ; seal.jpg|シールデコの完成品 :: 持ち帰れるもの]
のように書く（「;」で最大2枚、「::」の後ろがキャプション）。
"""
import re,sys,json,html,glob,os,datetime
import markdown
CSS='''.crumb{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.crumb .cur{color:var(--sub)}.post{max-width:760px;margin:0 auto;padding:10px 0 30px}.post .kick{margin-bottom:10px}.post h1{font-size:clamp(22px,3.3vw,30px);line-height:1.45;margin:0 0 12px;text-wrap:pretty;word-break:keep-all;overflow-wrap:anywhere}.post .pmeta{display:flex;gap:14px;flex-wrap:wrap;font-size:13px;color:var(--sub);margin-bottom:18px}.post .lead-img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:16px;border:2px solid var(--line);display:block;margin:0 0 26px}.post .pbody{font-size:16px;line-height:2}.post .pbody p{margin:0 0 1.3em}.post .pbody h2{font-size:clamp(20px,3.2vw,24px);line-height:1.45;margin:40px 0 14px;padding:10px 14px;border-left:6px solid var(--blue);background:var(--tint,#FFF3E0);border-radius:0 12px 12px 0}.post .pbody h3{font-size:17.5px;margin:26px 0 8px;padding-bottom:6px;border-bottom:2px dashed var(--line)}.post .pbody ul,.post .pbody ol{padding-left:1.4em;margin:0 0 1.3em}.post .pbody li{margin:.3em 0}.post .pbody table{border-collapse:collapse;width:100%;font-size:14px;margin:0 0 1.5em}.post .pbody th,.post .pbody td{border:1px solid var(--line);padding:8px 10px;text-align:left;vertical-align:top}.post .pbody th{background:var(--tint,#FFF3E0);white-space:nowrap}.post .tw{overflow-x:auto;margin:0 0 1.5em}.post .tw table{margin:0}.post .pbody pre{background:#fff;border:2px solid var(--line);border-radius:12px;padding:14px 16px;font-size:14px;line-height:1.8;overflow-x:auto;white-space:pre-wrap;margin:0 0 1.5em}.post figure{margin:18px 0 26px}.post figure img{width:100%;border-radius:14px;border:2px solid var(--line);display:block;aspect-ratio:4/3;object-fit:cover;background:#fff}.post figure.two{display:grid;grid-template-columns:1fr 1fr;gap:12px}.post figure figcaption{grid-column:1/-1;font-size:12.5px;color:var(--sub);text-align:center;margin-top:6px}.post .pcta{margin:44px 0 0;padding:26px 24px;border-radius:18px;background:var(--navy);color:#fff;text-align:center}.post .pcta h2{color:#fff;font-size:20px;margin:0 0 8px}.post .pcta p{color:rgb(255 255 255/.85);font-size:14px;margin:0 0 16px}.post .pcta .btns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}.post .pcta .btn-ghost{background:transparent;color:#fff;border:2px solid rgb(255 255 255/.7)}.post .back{display:inline-block;margin-top:26px;color:var(--blue);font-weight:700;text-decoration:none}@media(max-width:600px){.post figure.two{grid-template-columns:1fr}}'''
DEF_CTA_H='まずは会場の条件だけ、ご相談ください'
DEF_CTA_P='会場の広さ・電源・想定来場者数をお聞かせいただければ、開催できるコンテンツと概算をご提案します。日程未定でもOKです。'
DEF_BTNS='index.html#contact|相談・お見積り ; index.html#contents|体験コンテンツを見る'

def wbr(t):
    """日本語の文節っぽい位置にだけ改行候補（<wbr>）を入れる。word-break:keep-all と組み合わせて、単語の途中で折り返さないようにする"""
    t=html.escape(t)
    t=re.sub(r'(｜|、|・|：|:)',r'\1<wbr>',t)
    t=re.sub(r'(?<=[ぁ-ん])(の|が|と|を|に|は|で|へ|や|も)(?=[^ぁ-ん<])',r'\1<wbr>',t)
    t=re.sub(r'(?<=[一-龥ァ-ヶa-zA-Z0-9])(の|が|と|を|に|は|で|へ|や|も|から|まで)(?=[一-龥ァ-ヶ「a-zA-Z0-9])',r'\1<wbr>',t)
    return t
def relfix(x): return re.sub(r'((?:href|src|action)=")(?!https?:|#|mailto:|tel:|data:|\.\./)([^"]+)"',r'\1../\2"',x)
def figure(spec):
    imgs,_,cap=spec.partition('::'); items=[i.strip() for i in imgs.split(';') if i.strip()]
    tags=''.join(f'<img src="../images/{f.strip()}" alt="{html.escape(a.strip())}">' for f,_,a in (i.partition('|') for i in items))
    cls=' class="two"' if len(items)>1 else ''
    capt=f'<figcaption>{html.escape(cap.strip())}</figcaption>' if cap.strip() else ''
    return f'<figure{cls}>{tags}{capt}</figure>'
def build(num,date,publish=False):
    mdp=sorted(glob.glob(f'docs/marketing/articles/{num}-*.md'))
    if not mdp: sys.exit(f'draft {num} not found')
    mdp=mdp[0]; md=open(mdp,encoding='utf-8').read()
    m=re.match(r'---\n(.*?)\n---\n',md,re.S); fm=dict(l.split(': ',1) for l in m.group(1).split('\n') if ': ' in l); body=md[m.end():]
    if re.search(r'<!--\s*要確認',body) and not fm.get('status','').startswith('published'): sys.exit('ERROR: 本文に「要確認」が残っています。解消してから公開してください。')
    body=re.sub(r'<!--.*?-->','',body,flags=re.S); body=re.sub(r'^\s*# .*\n','',body.strip()+'\n',count=1)
    body=re.sub(r'^\[figure:\s*(.*?)\]\s*$',lambda m:figure(m.group(1)),body,flags=re.M)
    chars=len(re.sub(r'\s','',body))
    bh=markdown.markdown(body,extensions=['tables','fenced_code','md_in_html'])
    title=fm['title']; desc=fm['description']; slug=fm['slug']; url=f'https://nextvision.fun/blog/{slug}.html'
    lead=fm.get('lead','klp-photo-scene.jpg').strip(); cat=fm.get('category','コラム').strip(); minutes=fm.get('minutes') or str(max(3,round(chars/500)))
    cta_h=fm.get('cta_heading',DEF_CTA_H); cta_p=fm.get('cta_text',DEF_CTA_P)
    btns=[b.strip() for b in fm.get('cta_buttons',DEF_BTNS).split(';') if b.strip()]
    if not os.path.exists('site/images/'+lead): sys.exit(f'ERROR: lead image not found: {lead}')
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
    h=h.replace('https://nextvision.fun/images/klp.jpg',f'https://nextvision.fun/images/{lead}')
    h=re.sub(r'<script type="application/ld\+json">.*?</script>','',h,flags=re.S)
    h=h.replace('<meta property="og:type" content="article">',f'<meta property="og:type" content="article"><meta property="article:published_time" content="{date}">')
    ld={"@context":"https://schema.org","@graph":[
     {"@type":"Article","headline":title,"description":desc,"image":[f"https://nextvision.fun/images/{lead}"],"datePublished":date,"dateModified":date,"author":{"@type":"Organization","name":"株式会社NextVision","url":"https://nextvision.fun/"},"publisher":{"@type":"Organization","name":"株式会社NextVision","logo":{"@type":"ImageObject","url":"https://nextvision.fun/images/logo.png"}},"mainEntityOfPage":url,"inLanguage":"ja"},
     {"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"ホーム","item":"https://nextvision.fun/"},{"@type":"ListItem","position":2,"name":"コラム","item":"https://nextvision.fun/#column"},{"@type":"ListItem","position":3,"name":title,"item":url}]}]}
    h=h.replace('</head>','<script type="application/ld+json">'+json.dumps(ld,ensure_ascii=False)+'</script></head>').replace('</style>',CSS+'</style>',1)
    header,footer,tail=relfix(header),relfix(footer),relfix(tail)
    bh=bh.replace('<table>','<div class="tw"><table>').replace('</table>','</table></div>')
    bh=re.sub(r'href="(index\.html|klp\.html|punilab\.html|seal\.html|air\.html)',r'href="../\1',bh)
    bt=''.join(f'<a href="../{u.strip()}" class="btn {"btn-primary" if i==0 else "btn-ghost"}">{html.escape(t.strip())}</a>' for i,(u,_,t) in enumerate(b.partition('|') for b in btns))
    page=('<!DOCTYPE html><html lang="ja">'+h+'<body>'+header+
     f'<div class="wrap crumb"><a href="../index.html">ホーム</a> ／ <a href="../index.html#column">コラム</a> ／ <span class="cur">{html.escape(title)}</span></div>'
     f'<main class="wrap post"><span class="kick">COLUMN</span><h1>{wbr(title)}</h1>'
     f'<div class="pmeta"><span>公開日 {date}</span><span>読了 約{minutes}分</span><span>株式会社NextVision</span></div>'
     f'<img class="lead-img" src="../images/{lead}" alt="{html.escape(fm.get("lead_alt",title))}" fetchpriority="high">'
     f'<div class="pbody">{bh}</div>'
     f'<div class="pcta"><h2>{html.escape(cta_h)}</h2><p>{html.escape(cta_p)}</p><div class="btns">{bt}</div></div>'
     '<a class="back" href="../index.html#column">← コラム一覧へ</a></main>'+footer+tail)
    os.makedirs('site/blog',exist_ok=True); out=f'site/blog/{slug}.html'; open(out,'w',encoding='utf-8').write(page)
    info=dict(num=num,slug=slug,title=title,desc=desc,lead=lead,cat=cat,date=date,chars=chars,url=url,out=out)
    if publish:
        p='site/index.html'; s=open(p,encoding='utf-8').read()
        if f'blog/{slug}.html' in s:
            s=re.sub(rf'(<a class="col-card" href="blog/{re.escape(slug)}\.html"><img src=")[^"]*(")',rf'\g<1>images/{lead}\2',s,count=1)
            open(p,'w',encoding='utf-8').write(s)
        else:
            card=f'\n      <a class="col-card" href="blog/{slug}.html"><img src="images/{lead}" alt="" loading="lazy"><span><small>{date}　{html.escape(cat)}</small><b>{wbr(title)}</b><em>{html.escape(desc[:60])}…</em></span></a>'
            k=s.find('<div class="col-list reveal">'); k=s.find('>',k)+1; s=s[:k]+card+s[k:]   # 新しい記事を先頭に
            open(p,'w',encoding='utf-8').write(s)
        p='site/sitemap.xml'; s=open(p,encoding='utf-8').read()
        if f'blog/{slug}.html' not in s:
            s=s.replace('</urlset>',f'  <url>\n    <loc>{url}</loc>\n    <lastmod>{date}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>\n</urlset>')
            open(p,'w',encoding='utf-8').write(s)
        t=open(mdp,encoding='utf-8').read(); t=re.sub(r'^status: .*$',f'status: published（{date}）　URL: {url}',t,count=1,flags=re.M); open(mdp,'w',encoding='utf-8').write(t)
    return info
if __name__=='__main__':
    args=[a for a in sys.argv[1:] if not a.startswith('--')]; publish='--publish' in sys.argv
    date=datetime.date.today().isoformat()
    if '--date' in sys.argv: date=sys.argv[sys.argv.index('--date')+1]; args=[a for a in args if a!=date]
    print(json.dumps([build(n,date,publish) for n in args],ensure_ascii=False,indent=1))
