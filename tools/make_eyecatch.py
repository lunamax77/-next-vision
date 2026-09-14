#!/usr/bin/env python3
"""記事のアイキャッチ画像を生成する（1200×900 JPG）。記事ごとに色・写真・レイアウトを変えて、並んだときに似た印象にならないようにする。
使い方: python3 tools/make_eyecatch.py NN [NN ...]   （docs/marketing/articles/NN-*.md の front matter を読む）
front matter の項目: title / category / photo（site/images のファイル名。省略時は category から自動）/ theme（orange|blue|coral|green|navy|purple。省略時は番号順に自動）
出力: site/images/eyecatch-<slug>.jpg。ドラフトの lead: を自動で eyecatch-<slug>.jpg に更新する。
"""
import re,sys,glob,base64,subprocess,os,tempfile,html
THEMES={'orange':('#F5A623','#FFF3E0','#22384F'),'blue':('#3E9BD8','#E7F3FB','#FFFFFF'),'coral':('#E5624C','#FFE9E4','#FFFFFF'),'green':('#5FA97A','#E9F5EC','#FFFFFF'),'navy':('#22384F','#E3E9EF','#FFFFFF'),'purple':('#8C7BD6','#EFEBFA','#FFFFFF')}
ORDER=['orange','blue','coral','green','navy','purple']
PHOTO_BY_CAT={'集客':'klp-photo-scene.jpg','費用':'airizm.jpg','効果':'klp-photo-session.jpg','準備':'case-klp-store.jpg','運転体験':'klp-photo-hero.jpg','ワークショップ':'punilab-colors.jpg','エア遊具':'airizm.jpg','業種':'license.jpg'}
CHROME='/opt/pw-browsers/chromium'

def wbr(t):
    """日本語の文節っぽい位置にだけ改行候補（<wbr>）を入れる。word-break:keep-all と組み合わせて、単語の途中で折り返さないようにする"""
    t=html.escape(t)
    t=re.sub(r'(｜|、|・|：|:)',r'\1<wbr>',t)
    t=re.sub(r'(?<=[ぁ-ん])(の|が|と|を|に|は|で|へ|や|も)(?=[^ぁ-ん<])',r'\1<wbr>',t)
    t=re.sub(r'(?<=[一-龥ァ-ヶa-zA-Z0-9])(の|が|と|を|に|は|で|へ|や|も|から|まで)(?=[一-龥ァ-ヶ「a-zA-Z0-9])',r'\1<wbr>',t)
    return t
def du(p):
    mt='image/png' if p.endswith('.png') else 'image/jpeg'
    return f'data:{mt};base64,'+base64.b64encode(open(p,'rb').read()).decode()
def make(num):
    mdp=sorted(glob.glob(f'docs/marketing/articles/{num}-*.md'))[0]; md=open(mdp,encoding='utf-8').read()
    m=re.match(r'---\n(.*?)\n---\n',md,re.S); fm=dict(l.split(': ',1) for l in m.group(1).split('\n') if ': ' in l)
    title=fm['title']; slug=fm['slug']; cat=fm.get('category','コラム').strip()
    theme=fm.get('theme','').strip() or ORDER[(int(num)-1)%len(ORDER)]
    photo=fm.get('photo','').strip() or PHOTO_BY_CAT.get(cat,'klp-photo-scene.jpg')
    main,tint,ink=THEMES[theme]; flip=int(num)%2==0
    tshort,_,tsub=title.partition('｜')
    mascot=du('site/images/mascot.png'); ph=du('site/images/'+photo)
    page=f'''<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@700;900&display=swap" rel="stylesheet">
<style>*{{margin:0;padding:0;box-sizing:border-box}}html,body{{width:1200px;height:900px;overflow:hidden}}
.f{{position:relative;width:1200px;height:900px;background:{tint};font-family:'Zen Maru Gothic','Hiragino Maru Gothic ProN',sans-serif;display:flex;flex-direction:{'row-reverse' if flip else 'row'}}}
.panel{{width:640px;height:100%;background:{main};color:{ink};padding:70px 60px;display:flex;flex-direction:column;justify-content:space-between;position:relative}}
.photo{{flex:1;position:relative;overflow:hidden}}.photo img{{width:100%;height:100%;object-fit:cover;display:block}}
.photo:after{{content:"";position:absolute;inset:0;background:linear-gradient({'to left' if flip else 'to right'},rgba(0,0,0,0) 70%,rgba(0,0,0,.12))}}
.cat{{display:inline-block;background:rgba(255,255,255,.22);border:2px solid rgba(255,255,255,.7);border-radius:999px;padding:8px 22px;font-size:24px;font-weight:700;align-self:flex-start}}
.t{{font-size:52px;font-weight:900;line-height:1.4;letter-spacing:.01em;word-break:keep-all;overflow-wrap:anywhere;text-wrap:pretty}}
.s{{font-size:28px;font-weight:700;opacity:.9;margin-top:14px;line-height:1.5}}
.brand{{display:flex;align-items:center;gap:14px;font-size:24px;font-weight:700;opacity:.95}}.brand img{{width:84px}}
.dot{{position:absolute;border-radius:50%;background:rgba(255,255,255,.14)}}
</style></head><body><div class="f">
<div class="panel"><div class="dot" style="width:360px;height:360px;right:-140px;top:-120px"></div><div class="dot" style="width:220px;height:220px;left:-80px;bottom:120px"></div>
<span class="cat">{html.escape(cat)}</span><div><div class="t">{wbr(tshort)}</div>{'<div class="s">'+html.escape(tsub)+'</div>' if tsub else ''}</div>
<div class="brand"><img src="{mascot}">NextVision コラム</div></div>
<div class="photo"><img src="{ph}"></div></div></body></html>'''
    tmp=tempfile.NamedTemporaryFile('w',suffix='.html',delete=False,encoding='utf-8'); tmp.write(page); tmp.close()
    out_png=tmp.name+'.png'
    subprocess.run([CHROME,'--headless=new','--no-sandbox','--disable-gpu','--hide-scrollbars','--window-size=1200,900','--force-device-scale-factor=1',f'--screenshot={out_png}','file://'+tmp.name],check=True,capture_output=True,timeout=90)
    from PIL import Image
    out=f'site/images/eyecatch-{slug}.jpg'; Image.open(out_png).convert('RGB').save(out,quality=86,optimize=True,progressive=True)
    os.remove(tmp.name); os.remove(out_png)
    if re.search(r'^lead: .*$',md,re.M): md=re.sub(r'^lead: .*$',f'lead: eyecatch-{slug}.jpg',md,count=1,flags=re.M)
    else: md=md.replace('\n---\n',f'\nlead: eyecatch-{slug}.jpg\n---\n',1)
    open(mdp,'w',encoding='utf-8').write(md)
    print(out,theme,photo)
if __name__=='__main__':
    for n in sys.argv[1:]: make(n)
