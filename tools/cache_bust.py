#!/usr/bin/env python3
"""キャッシュ対策（cache busting）: site/ を dist/ にコピーし、HTML 内の画像・動画・JS の参照に
内容ハッシュ（?v=xxxxxxxx）を付ける。ファイルを更新すると URL が変わるので、ブラウザは必ず新しい方を取りに行く。

使い方: python3 tools/cache_bust.py [src=site] [dst=dist]
- 対象: src / href / poster 属性、CSS の url(...) のうち、images/ video/ assets/ 配下のローカルファイル
- 絶対URL（https://...）、data: URI、config.php などはそのまま
- 元の site/ は書き換えない（リポジトリはきれいなまま）。GitHub Actions が dist/ をサーバーへ同期する
"""
import sys,os,re,shutil,hashlib,glob
src=sys.argv[1] if len(sys.argv)>1 else 'site'
dst=sys.argv[2] if len(sys.argv)>2 else 'dist'
if os.path.exists(dst): shutil.rmtree(dst)
shutil.copytree(src,dst,ignore=shutil.ignore_patterns('*.zip','.DS_Store','build_details.py'))
cache={}
def ver(path):
    if path not in cache:
        h=hashlib.sha1(open(path,'rb').read()).hexdigest()[:8]; cache[path]=h
    return cache[path]
ATTR=re.compile(r'\b(src|href|poster)="((?:\.\./)?(?:images|video|assets)/[^"?#]+)(\?[^"#]*)?(#[^"]*)?"')
CSSURL=re.compile(r"url\((['\"]?)((?:\.\./)?(?:images|video|assets)/[^)'\"?#]+)(\?[^)'\"#]*)?\1\)")
n_files=n_refs=0
for html in glob.glob(dst+'/**/*.html',recursive=True):
    base=os.path.dirname(html); s=open(html,encoding='utf-8').read(); refs=0
    def rep_attr(m):
        global refs
        attr,rel,q,frag=m.group(1),m.group(2),m.group(3) or '',m.group(4) or ''
        fp=os.path.normpath(os.path.join(base,rel))
        if not os.path.isfile(fp): return m.group(0)
        refs+=1; return f'{attr}="{rel}?v={ver(fp)}{frag}"'
    def rep_css(m):
        global refs
        qch,rel=m.group(1),m.group(2); fp=os.path.normpath(os.path.join(base,rel))
        if not os.path.isfile(fp): return m.group(0)
        refs+=1; return f'url({qch}{rel}?v={ver(fp)}{qch})'
    s2=ATTR.sub(rep_attr,s); s2=CSSURL.sub(rep_css,s2)
    if s2!=s: open(html,'w',encoding='utf-8').write(s2); n_files+=1; n_refs+=refs
print(f'cache-bust: {n_files} html files, {n_refs} references versioned -> {dst}/')
