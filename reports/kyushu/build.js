const pptxgen = require('pptxgenjs');
const { applyTheme } = require('/root/.claude/skills/synced/cf9a4da1-cbf5-4de8-842a-68622ed8b0f4_a245a253-1200-40d9-a25f-376883852dd4/pptx/scripts/apply_theme.js');
const THEME = { name: 'PP Oita Report', headFontFace: 'Meiryo', bodyFontFace: 'Meiryo',
  colors: { dk1:'1F2937', lt1:'FFFFFF', dk2:'1B2A4A', lt2:'F1F4F9', accent1:'1B2A4A', accent2:'E8590C', accent3:'2F9E44', accent4:'C92A2A', accent5:'868E96', accent6:'4C6EF5', hlink:'4C6EF5', folHlink:'868E96' } };
const HEX = { navy:'1B2A4A', orange:'E8590C', green:'2F9E44', red:'C92A2A', gray:'868E96', light:'F1F4F9', text:'1F2937', grid:'DEE2E6' };
const F = 'Meiryo';
const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';
pres.theme = { headFontFace: F, bodyFontFace: F };
pres.title = 'パークプレイス大分イベント 実施報告書';

pres.defineSlideMaster({ title: 'CONTENT', background: { color: 'FFFFFF' },
  objects: [ { text: { text: 'パークプレイス大分イベント 実施報告書（11/13〜11/15）', options: { x:0.5, y:5.25, w:7, h:0.25, fontFace:F, fontSize:9, color:HEX.gray, isTextBox:true, margin:0 } } } ],
  slideNumber: { x:9.0, y:5.25, w:0.5, h:0.25, fontFace:F, fontSize:9, color:HEX.gray, align:'right' },
  placeholders: [] });

const T = (s, text, o) => s.addText(text, Object.assign({ fontFace:F, color:HEX.text, isTextBox:true, valign:'top', margin:0 }, o));
function header(s, no, title) {
  s.addShape(pres.shapes.OVAL, { x:0.5, y:0.33, w:0.42, h:0.42, fill:{ color:HEX.navy }, line:{ color:HEX.navy } });
  T(s, String(no), { x:0.5, y:0.33, w:0.42, h:0.42, fontSize:14, bold:true, color:'FFFFFF', align:'center', valign:'middle' });
  T(s, title, { x:1.05, y:0.28, w:8.4, h:0.52, fontSize:22, bold:true, color:HEX.navy, valign:'middle' });
}
const card = (s, x, y, w, h, fill) => s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius:0.08, fill:{ color: fill || HEX.light }, line:{ color: fill || HEX.light } });

// 1. Title
{ const s = pres.addSlide(); s.background = { color: HEX.navy };
  T(s, 'NTTドコモ 九州支社イベント', { x:0.6, y:1.2, w:8.8, h:0.4, fontSize:14, color:'C5CEE0' });
  T(s, 'パークプレイス大分イベント\n実施報告書', { x:0.6, y:1.65, w:8.8, h:1.5, fontSize:34, bold:true, color:'FFFFFF' });
  T(s, '2026年11月13日（金）〜15日（日）｜グランサックス前', { x:0.6, y:3.35, w:8.8, h:0.4, fontSize:14, color:'FFFFFF' });
  T(s, '株式会社DreamCreation', { x:0.6, y:4.6, w:8.8, h:0.35, fontSize:12, color:'C5CEE0' }); }

// 2. 総括
{ const s = pres.addSlide({ masterName:'CONTENT' }); header(s, 1, '総括：新規・カードは達成、主軸のPIは未達');
  const stats = [ ['PI', '64.5%', '20 / 31件（-11）', HEX.red], ['新規', '200.0%', '6 / 3件（+3）', HEX.green], ['イエナカ', '80.0%', '4 / 5件（-1）', HEX.red], ['カード', '116.7%', '7 / 6件（+1）', HEX.green] ];
  stats.forEach((st, i) => { const x = 0.5 + i * 2.3; card(s, x, 1.0, 2.1, 1.45);
    T(s, st[0], { x:x+0.15, y:1.1, w:1.8, h:0.3, fontSize:12, bold:true, color:HEX.navy });
    T(s, st[1], { x:x+0.15, y:1.4, w:1.8, h:0.55, fontSize:28, bold:true, color:st[3] });
    T(s, st[2], { x:x+0.15, y:2.0, w:1.8, h:0.3, fontSize:11, color:HEX.text }); });
  T(s, [
    { text: '前回からの課題「アプローチをもれなく行えているか？」', options:{ bold:true, color:HEX.navy, breakLine:true } },
    { text: '時間帯や導線によるムラ（機会損失）が発生し、全体の数値最大化に至らず。', options:{ breakLine:true } },
    { text: ' ', options:{ fontSize:6, breakLine:true } },
    { text: '日曜の配置変更：', options:{ bold:true } },
    { text: '土曜の課題（店舗前クレーム・競合イベント干渉）を受け、店舗前を', options:{} },
    { text: 'コンテンツ誘引', options:{ bold:true } },
    { text: 'へ切替。午前から着座・成約を積み上げた。', options:{ breakLine:true } },
    { text: '未達の要因：', options:{ bold:true } },
    { text: '集客が落ち着いた', options:{} },
    { text: '13時〜16時に勢いを継続できず', options:{ bold:true } },
    { text: '、反対側導線のフリーキャッチも伸び悩み。加えて', options:{} },
    { text: '複数台案件の未獲得', options:{ bold:true } },
    { text: 'がPI未達の大きな要因。', options:{} },
  ], { x:0.5, y:2.7, w:9, h:2.4, fontSize:13, paraSpaceAfter:4 }); }

// 3. 支社目標 日別
{ const s = pres.addSlide({ masterName:'CONTENT' }); header(s, 2, '支社目標の達成状況と日別推移');
  const hdr = ['項目','目標','金','土','日','実績','差分','達成率'].map(t => ({ text:t, options:{ bold:true, color:'FFFFFF', fill:{ color:HEX.navy }, align:'center' } }));
  const rows = [ ['PI',31,2,7,11,20,'-11','64.5%',HEX.red], ['新規',3,0,0,6,6,'+3','200.0%',HEX.green], ['イエナカ',5,0,2,2,4,'-1','80.0%',HEX.red], ['カード',6,1,2,4,7,'+1','116.7%',HEX.green] ];
  const body = rows.map(r => r.slice(0,8).map((v, j) => ({ text:String(v), options:{ align: j===0?'left':'center', bold: j===0||j>=5, color: j>=6 ? r[8] : HEX.text } })));
  s.addTable([hdr, ...body], { x:0.5, y:1.0, w:5.0, colW:[0.85,0.55,0.45,0.45,0.45,0.6,0.6,0.95], fontFace:F, fontSize:11, rowH:0.42, border:{ type:'solid', pt:0.5, color:HEX.grid } });
  s.addChart(pres.charts.BAR, [ { name:'PI', labels:['金','土','日'], values:[2,7,11] } ], { x:5.8, y:0.95, w:3.7, h:2.6, barDir:'col', chartColors:[HEX.navy], showTitle:true, title:'PI 日別実績（件）', titleFontFace:'+mn-lt', titleFontSize:11, titleColor:HEX.text, showValue:true, dataLabelPosition:'outEnd', dataLabelFontFace:'+mn-lt', dataLabelFontSize:10, catAxisLabelFontFace:'+mn-lt', valAxisLabelFontFace:'+mn-lt', catAxisLabelFontSize:10, valAxisLabelFontSize:9, catAxisLabelColor:HEX.gray, valAxisLabelColor:HEX.gray, valGridLine:{ color:HEX.grid, size:0.5 }, catGridLine:{ style:'none' }, showLegend:false });
  card(s, 0.5, 3.35, 5.0, 1.65);
  T(s, [
    { text:'ポイント', options:{ bold:true, color:HEX.navy, breakLine:true } },
    { text:'PIの', options:{} }, { text:'約半数（11件）が日曜', options:{ bold:true } }, { text:'に集中。配置変更が奏功。', options:{ breakLine:true } },
    { text:'金曜は2件', options:{ bold:true } }, { text:'。平日の見込み作りが土日に繋がらず。', options:{ breakLine:true } },
    { text:'新規6件はすべて日曜', options:{ bold:true } }, { text:'（U-15／Galaxy A25）。', options:{} },
  ], { x:0.7, y:3.48, w:4.6, h:1.45, fontSize:12, paraSpaceAfter:3 });
  T(s, '※ 九州全体 2W PI達成率：97.7%（595 / 609件）', { x:5.8, y:3.75, w:3.7, h:0.3, fontSize:10, color:HEX.gray }); }

// 4. KPI
{ const s = pres.addSlide({ masterName:'CONTENT' }); header(s, 3, 'アプローチ・着座KPI');
  const big = [ ['アプローチ数','139','金49／土49／日41'], ['着座数','40','着座率 28.8%'], ['PI成約率','50.0%','着座40 → PI 20'] ];
  big.forEach((b,i)=>{ const x=0.5+i*3.05; card(s,x,1.0,2.85,1.35);
    T(s,b[0],{ x:x+0.2,y:1.1,w:2.5,h:0.3,fontSize:12,bold:true,color:HEX.navy });
    T(s,b[1],{ x:x+0.2,y:1.38,w:2.5,h:0.55,fontSize:28,bold:true,color:HEX.navy });
    T(s,b[2],{ x:x+0.2,y:1.95,w:2.5,h:0.3,fontSize:11 }); });
  const hdr = ['項目','金','土','日','合計','内訳・備考'].map(t=>({ text:t, options:{ bold:true, color:'FFFFFF', fill:{ color:HEX.navy }, align:'center' } }));
  const rows = [ ['アプローチ数','49','49','41','139','他社 33/36/31　既存 16/13/10'], ['着座数','14','12','14','40','他社 12/11/10　既存 2/1/4'], ['新規 対象／提案','0/0','0/0','8/5','8/5','日曜の着座から新規6件に直結'] ];
  const body = rows.map(r=>r.map((v,j)=>({ text:v, options:{ align: j===0||j===5?'left':'center', bold: j===0||j===4 } })));
  s.addTable([hdr,...body],{ x:0.5,y:2.6,w:9.0,colW:[1.7,0.8,0.8,0.8,0.9,4.0],fontFace:F,fontSize:11,rowH:0.4,border:{ type:'solid',pt:0.5,color:HEX.grid } });
  T(s,[ { text:'日曜のアプローチ数は41件', options:{ bold:true } }, { text:'（金・土は49件）にとどまり、午後帯の空白時間が数値に表れた。', options:{} } ],{ x:0.5,y:4.35,w:9,h:0.6,fontSize:12 }); }

// 5. 施策別
{ const s = pres.addSlide({ masterName:'CONTENT' }); header(s, 4, '土日の施策別内訳：コンテンツ vs フリーキャッチ');
  s.addChart(pres.charts.BAR, [ { name:'土曜', labels:['スクイーズ 着座','フリーキャッチ 着座'], values:[6,6] }, { name:'日曜', labels:['スクイーズ 着座','フリーキャッチ 着座'], values:[10,4] } ], { x:0.5, y:0.95, w:4.2, h:3.0, barDir:'col', barGrouping:'clustered', chartColors:[HEX.gray, HEX.orange], showTitle:true, title:'着座数（組）', titleFontFace:'+mn-lt', titleFontSize:11, titleColor:HEX.text, showValue:true, dataLabelPosition:'outEnd', dataLabelFontFace:'+mn-lt', dataLabelFontSize:10, catAxisLabelFontFace:'+mn-lt', valAxisLabelFontFace:'+mn-lt', catAxisLabelFontSize:10, valAxisLabelFontSize:9, catAxisLabelColor:HEX.gray, valAxisLabelColor:HEX.gray, valGridLine:{ color:HEX.grid, size:0.5 }, catGridLine:{ style:'none' }, showLegend:true, legendPos:'b', legendFontFace:'+mn-lt', legendFontSize:10 });
  card(s, 5.0, 0.95, 4.5, 1.95);
  T(s,[ { text:'スクイーズ（コンテンツ誘引）', options:{ bold:true, color:HEX.orange, breakLine:true } },
    { text:'参加：土13組31個 → 日22組56個', options:{ breakLine:true } },
    { text:'成約：土 PI4件(3組)／新規0件', options:{ breakLine:true } },
    { text:'　　　日 PI9件(4組)／新規6件', options:{ bold:true, breakLine:true } },
    { text:'日曜の新規獲得はすべてスクイーズ経由', options:{ bold:true } } ],{ x:5.2,y:1.05,w:4.1,h:1.8,fontSize:12,paraSpaceAfter:2 });
  card(s, 5.0, 3.05, 4.5, 1.55);
  T(s,[ { text:'フリーキャッチ（通常声掛け）', options:{ bold:true, color:HEX.navy, breakLine:true } },
    { text:'着座：土6組 → 日4組', options:{ breakLine:true } },
    { text:'成約：土 PI3件(3組)／日 PI2件(2組)、新規0件', options:{ breakLine:true } },
    { text:'13時〜16時の空白時間を解消できず', options:{ bold:true } } ],{ x:5.2,y:3.15,w:4.1,h:1.4,fontSize:12,paraSpaceAfter:2 });
  T(s,'※ 日曜は店舗前をコンテンツ誘引へ切替、キャッチ強化スタッフを反対側導線に配置',{ x:0.5,y:4.25,w:4.3,h:0.6,fontSize:10,color:HEX.gray }); }

// 6. よかった点
{ const s = pres.addSlide({ masterName:'CONTENT' }); header(s, 5, 'よかった点（成果・評価ポイント）');
  const items = [
    ['新規獲得の目標大幅達成（200.0%）', [ ['日曜のスクイーズからの着座・新規提案（対象8件／提案5件）が確実に機能し、', false], ['目標3件に対し6件獲得', true], ['。', false] ]],
    ['イエナカ・カードの高い付帯率', [ ['PI20件に対し', false], ['イエナカ4件（付帯率20.0%）、カード7件（付帯率35.0%）', true], ['。着座客へのセット提案・クロスセルが有効に機能。', false] ]],
    ['現場判断による日曜午前の改善', [ ['店舗前を「通常声掛け」から「コンテンツ誘引」へ即時変更。クレームを回避しつつ', false], ['参加数 土13組 → 日22組', true], ['、午前からの着座・成約に繋げた。', false] ]] ];
  items.forEach((it,i)=>{ const y=1.0+i*1.38; card(s,0.5,y,9.0,1.22);
    s.addShape(pres.shapes.OVAL,{ x:0.7,y:y+0.36,w:0.5,h:0.5,fill:{ color:HEX.green },line:{ color:HEX.green } });
    T(s,'✓',{ x:0.7,y:y+0.36,w:0.5,h:0.5,fontSize:16,bold:true,color:'FFFFFF',align:'center',valign:'middle' });
    T(s,it[0],{ x:1.4,y:y+0.12,w:7.9,h:0.35,fontSize:14,bold:true,color:HEX.navy });
    T(s,it[1].map(([t,b])=>({ text:t, options:{ bold:b } })),{ x:1.4,y:y+0.5,w:7.9,h:0.65,fontSize:12 }); }); }

// 7. 課題
{ const s = pres.addSlide({ masterName:'CONTENT' }); header(s, 6, '課題分析：アプローチのムラ・複数台案件の未獲得');
  const items = [
    ['① 日曜午後帯（13〜16時）の失速', [ ['反対側導線にキャッチの強いスタッフを配置したが、', false], ['フリーキャッチ着座は土6組 → 日4組に減少', true], ['。1F中央のSB合同イベントによる動線干渉に加え、通常声掛けの', false], ['「携帯イベント感（売り込み感）」', true], ['で足止めできず。', false] ]],
    ['② 複数台案件の未獲得', [ ['着座40件・付帯率は良好だったが、成約は1〜2台の単体にとどまり、', false], ['家族まとめ等の複数台案件ゼロ', true], ['がPI -11件に直結。', false] ]],
    ['③ 平日（金曜）からの見込み持ち越し不足', [ ['非決裁者が多く即決に至らず、家族相談・土日再来店に繋げる', false], ['見込み作りができなかった', true], ['。土日が「当日の新規キャッチのみ」の勝負に。', false] ]],
    ['④ 土曜午前の外部要因', [ ['大分トリニータ戦の影響で来館は多いものの客足が速く、', false], ['土曜10〜13時の獲得はゼロ', true], ['。グランサックス前はキャッチ範囲も狭い。', false] ]] ];
  items.forEach((it,i)=>{ const y=0.98+i*1.04; card(s,0.5,y,9.0,0.94,'FDF1EC');
    T(s,it[0],{ x:0.7,y:y+0.08,w:8.6,h:0.3,fontSize:13,bold:true,color:HEX.red });
    T(s,it[1].map(([t,b])=>({ text:t, options:{ bold:b } })),{ x:0.7,y:y+0.4,w:8.6,h:0.52,fontSize:11 }); }); }

// 8. 改善アクション
{ const s = pres.addSlide({ masterName:'CONTENT' }); header(s, 7, '次回に向けた改善アクション');
  const cols = [
    ['1', '参加型簡易コンテンツの導入', 'アプローチ数の向上', [ ['売り込み感を払拭し、', false], ['13〜16時のアイドルタイム', true], ['に層別で使い分け', false] ], [ ['フリー層：', true], ['握力チャレンジ', false] ], [ ['高齢者層：', true], ['漢字クイズ', false] ], [ ['幅広い層：', true], ['街頭インタビュー', false] ] ],
    ['2', '複数台案件のヒアリング強化', '1組あたりPI台数の引き上げ', [ ['ファミリー層・平日の非決裁者に', false], ['世帯全体の通信費診断', true], ['を実施', false] ], [ ['家族まとめ乗り換え', true], ['のメリット訴求を徹底', false] ], [ ['平日は', false], ['土日への見込み持ち越し', true], ['を狙う', false] ], null ],
    ['3', '「店舗前＝コンテンツ誘引」の標準化', 'スタートダッシュの再現', [ ['クレームリスクのある導線では', false], ['無理な声掛けをしない', true] ], [ ['初日から', false], ['スクイーズ等の配置を軸', true], ['に設計', false] ], [ ['日曜午前の着座の積み上げを', false], ['初日から再現', true] ], null ] ];
  cols.forEach((c,i)=>{ const x=0.5+i*3.05; card(s,x,0.98,2.85,3.6);
    s.addShape(pres.shapes.OVAL,{ x:x+0.2,y:1.12,w:0.5,h:0.5,fill:{ color:HEX.orange },line:{ color:HEX.orange } });
    T(s,c[0],{ x:x+0.2,y:1.12,w:0.5,h:0.5,fontSize:16,bold:true,color:'FFFFFF',align:'center',valign:'middle' });
    T(s,c[1],{ x:x+0.2,y:1.72,w:2.5,h:0.6,fontSize:13,bold:true,color:HEX.navy });
    T(s,c[2],{ x:x+0.2,y:2.32,w:2.5,h:0.3,fontSize:10,color:HEX.orange,bold:true });
    const bl = c.slice(3).filter(Boolean); const runs=[];
    bl.forEach((b,k)=>{ b.forEach(([t,bo],m)=>{ const o={ bold:bo }; if(m===0) o.bullet=true; if(m===b.length-1 && k<bl.length-1) o.breakLine=true; runs.push({ text:t, options:o }); }); });
    T(s,runs,{ x:x+0.15,y:2.7,w:2.6,h:1.8,fontSize:11,paraSpaceAfter:5 }); });
  T(s,[ { text:'次回：', options:{ bold:true, color:HEX.navy } }, { text:'イオンモール都城駅前（11/20〜23）、トキハわさだタウン（11/27〜29）で上記3点を実行', options:{} } ],{ x:0.5,y:4.72,w:9,h:0.35,fontSize:11 }); }

(async()=>{ await pres.writeFile({ fileName:'PP大分_実施報告書_1113-1115.pptx' }); await applyTheme('PP大分_実施報告書_1113-1115.pptx', THEME); console.log('ok'); })();
