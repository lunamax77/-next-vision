#!/usr/bin/env python3
"""公開中の HP が改ざんされていないかを確認する（改ざん検知）。
リポジトリから作った正本（dist/）と、実際に https://nextvision.fun/ で配信されている内容を1ファイルずつ比べる。
- 比べる対象: すべての HTML、assets/site.js、robots.txt、sitemap.xml
- 一致しない／取得できない／見知らぬスクリプトが入っている → 終了コード1（GitHub Actions が失敗として通知）
使い方: python3 tools/cache_bust.py site dist && python3 tools/integrity_check.py dist https://nextvision.fun
"""
import sys,os,glob,hashlib,re,urllib.request,ssl
dist=sys.argv[1] if len(sys.argv)>1 else 'dist'; base=(sys.argv[2] if len(sys.argv)>2 else 'https://nextvision.fun').rstrip('/')
targets=sorted(glob.glob(dist+'/**/*.html',recursive=True))+[dist+'/assets/site.js',dist+'/robots.txt',dist+'/sitemap.xml']
SUSPICIOUS=re.compile(r'<script[^>]*src="(?!https://www\.googletagmanager\.com/|https://cdnjs\.cloudflare\.com/|assets/|\.\./assets/)[^"]*"|eval\(|base64_decode|atob\(|document\.write\(unescape|<iframe',re.I)
bad=[];ok=0
ctx=ssl.create_default_context()
for f in targets:
    rel=os.path.relpath(f,dist).replace(os.sep,'/'); url=f'{base}/{rel}'
    try:
        req=urllib.request.Request(url,headers={'User-Agent':'nextvision-integrity-check','Cache-Control':'no-cache'})
        with urllib.request.urlopen(req,timeout=30,context=ctx) as r:
            live=r.read(); final=r.geturl()
    except Exception as e:
        bad.append(f'{rel}: 取得できません ({e})'); continue
    if not final.startswith(base): bad.append(f'{rel}: 別の場所へ転送されています -> {final}'); continue
    local=open(f,'rb').read()
    if hashlib.sha256(live).hexdigest()!=hashlib.sha256(local).hexdigest():
        bad.append(f'{rel}: 内容が正本と一致しません（サイズ 正本{len(local)} / 公開中{len(live)}）')
        if rel.endswith('.html') or rel.endswith('.js'):
            m=SUSPICIOUS.search(live.decode('utf-8','ignore'))
            if m: bad.append(f'{rel}: 不審なコードの可能性 -> {m.group(0)[:120]}')
        continue
    ok+=1
print(f'一致: {ok}/{len(targets)}')
if bad:
    print('\n'.join('NG '+b for b in bad)); sys.exit(1)
print('改ざんは検知されませんでした')
