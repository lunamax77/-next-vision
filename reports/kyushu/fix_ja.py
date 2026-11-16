import sys, zipfile, re, shutil
src = sys.argv[1]; tmp = src + '.tmp'
zin = zipfile.ZipFile(src); zout = zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED)
for item in zin.infolist():
    data = zin.read(item.filename)
    if item.filename.endswith('.xml'):
        s = data.decode('utf-8')
        s = re.sub(r'<a:ea typeface="Meiryo"[^/]*/>', '<a:ea typeface="メイリオ" pitchFamily="50" charset="-128"/>', s)
        s = re.sub(r'<a:latin typeface="Meiryo"[^/]*/>', '<a:latin typeface="メイリオ" pitchFamily="50" charset="-128"/>', s)
        s = re.sub(r'<a:cs typeface="Meiryo"[^/]*/>', '<a:cs typeface="メイリオ" pitchFamily="50" charset="-128"/>', s)
        s = s.replace('lang="en-US"', 'lang="ja-JP" altLang="en-US"')
        if 'theme' in item.filename:
            s = s.replace('<a:ea typeface=""/>', '<a:ea typeface="メイリオ"/>')
            s = re.sub(r'<a:font script="Jpan" typeface="[^"]*"/>', '<a:font script="Jpan" typeface="メイリオ"/>', s)
        data = s.encode('utf-8')
    zout.writestr(item, data)
zout.close(); shutil.move(tmp, src)
