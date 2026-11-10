"""SV・ルートサポート質向上 進捗報告 を生成する。

使い方: python3 build_report.py  → 同フォルダに pptx を出力
"""
from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Emu, Pt

from report_data import DATA

OUT = Path(__file__).with_name(DATA["filename"])

NAVY = RGBColor(0x1B, 0x2A, 0x4E)
GRAY = RGBColor(0x5A, 0x63, 0x75)
PALE = RGBColor(0xC9, 0xCF, 0xDA)
LIGHT = RGBColor(0xF8, 0xF9, 0xFB)
NOTE_BG = RGBColor(0xEE, 0xF0, 0xF4)
AMBER = RGBColor(0xE8, 0xA3, 0x00)
AMBER_BG = RGBColor(0xFD, 0xF3, 0xDC)
GOOD = RGBColor(0x1E, 0x7B, 0x4F)
GOOD_BG = RGBColor(0xE3, 0xF2, 0xEA)
BAD = RGBColor(0xC0, 0x39, 0x2B)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
FONT = "メイリオ"

PX = 9525  # 1px (1600x900 基準) を EMU に


def px(v):
    return Emu(int(v * PX))


def style_run(r, size, bold=False, color=NAVY):
    r.font.size = Pt(size * 0.75)
    r.font.bold = bold
    r.font.color.rgb = color
    r.font.name = FONT
    rpr = r._r.get_or_add_rPr()
    for tag in ("a:ea", "a:cs"):
        el = rpr.find(qn(tag))
        if el is None:
            el = rpr.makeelement(qn(tag), {})
            rpr.append(el)
        el.set("typeface", FONT)


def text(slide, s, x, y, w, h, size=20, bold=False, color=NAVY, align=None, anchor=None):
    tb = slide.shapes.add_textbox(px(x), px(y), px(w), px(h))
    tf = tb.text_frame
    tf.word_wrap = True
    if anchor:
        tf.vertical_anchor = anchor
    for i, line in enumerate(s.split("\n")):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.space_after = Pt(3)
        if align:
            p.alignment = align
        r = p.add_run()
        r.text = line
        style_run(r, size, bold, color)
    return tb


def rect(slide, x, y, w, h, fill, shape=MSO_SHAPE.RECTANGLE, line=None):
    sh = slide.shapes.add_shape(shape, px(x), px(y), px(w), px(h))
    sh.shadow.inherit = False
    sh.fill.solid()
    sh.fill.fore_color.rgb = fill
    if line:
        sh.line.color.rgb = line
        sh.line.width = Pt(1.5)
    else:
        sh.line.fill.background()
    return sh


def badge(slide, label, x, y, w, kind):
    fg, bg = {"done": (GOOD, GOOD_BG), "prog": (AMBER, AMBER_BG), "todo": (GRAY, NOTE_BG)}[kind]
    rect(slide, x, y, w, 34, bg, MSO_SHAPE.ROUNDED_RECTANGLE)
    text(slide, label, x, y + 2, w, 30, 15, True, fg, PP_ALIGN.CENTER)


def frame(prs, d, idx, total):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    s.background.fill.solid()
    s.background.fill.fore_color.rgb = LIGHT
    rect(s, 0, 0, 1600, 8, AMBER)
    text(s, "DREAM CREATION  /  SV・ルートサポート質向上", 60, 34, 900, 30, 14, color=GRAY)
    text(s, DATA["version"], 1200, 34, 340, 30, 14, color=GRAY, align=PP_ALIGN.RIGHT)
    text(s, d["title"], 60, 86, 1480, 60, 34, bold=True)
    if d.get("lead"):
        text(s, d["lead"], 60, 156, 1480, 80, 19, color=GRAY)
    if d.get("note"):
        rect(s, 60, 776, 1480, 66, NOTE_BG)
        text(s, d["note"], 72, 780, 1456, 60, 13, color=GRAY)
    text(s, "ドコモCS 野尻課長 御中  ／  DreamCreation 事務局（森下）", 60, 858, 900, 30, 13, color=GRAY)
    text(s, f"{idx:02d} / {total:02d}", 1340, 858, 160, 30, 13, color=GRAY, align=PP_ALIGN.RIGHT)
    return s


def tiles(s, items, y=250, h=170):
    n = len(items)
    gap = 30
    w = (1480 - gap * (n - 1)) / n
    for i, t in enumerate(items):
        x = 60 + i * (w + gap)
        rect(s, x, y, w, h, WHITE, line=PALE)
        rect(s, x, y, 6, h, AMBER)
        text(s, t["label"], x + 24, y + 14, w - 40, 30, 15, True, GRAY)
        text(s, t["big"], x + 24, y + 46, w - 40, 64, 36, True, NAVY)
        text(s, t["sub"], x + 24, y + 112, w - 40, 50, 14, color=GOOD if t.get("up") else GRAY)


def columns(s, cols, y=270, h=470):
    n = len(cols)
    gap = 40
    w = (1480 - gap * (n - 1)) / n
    for i, c in enumerate(cols):
        x = 60 + i * (w + gap)
        rect(s, x, y, w, 4, AMBER if i == n - 1 else NAVY)
        text(s, c["head"], x, y + 14, w, 64, 19, bold=True)
        text(s, c["body"], x, y + 80, w, h - 80, 16)


def ladder(s, d):
    """前回→今回の段階を●で並べ、新たに進んだ段を強調する。"""
    stages = d["stages"]
    x0, y0 = 60, 250
    name_w, txt_w, dot_x = 190, 470, 1200
    # 見出し
    text(s, "対象", x0, y0, name_w, 30, 15, True, GRAY)
    text(s, "前回 9/15 時点", x0 + name_w, y0, txt_w, 30, 15, True, GRAY)
    text(s, "今回（最新）", x0 + name_w + txt_w + 40, y0, txt_w, 30, 15, True, AMBER)
    for k, st in enumerate(stages):
        text(s, st, dot_x + k * 85 - 20, y0 - 8, 105, 44, 11, True, GRAY, PP_ALIGN.CENTER)
    row_h = 150
    for i, r in enumerate(d["rows"]):
        y = y0 + 44 + i * row_h
        rect(s, x0, y, 1480, row_h - 14, WHITE, line=PALE)
        text(s, r["name"], x0 + 16, y + 14, name_w - 20, 60, 20, True)
        text(s, r["before"], x0 + name_w, y + 14, txt_w - 10, row_h - 30, 14, color=GRAY)
        arrow = rect(s, x0 + name_w + txt_w - 6, y + 50, 34, 30, AMBER, MSO_SHAPE.RIGHT_ARROW)
        text(s, r["after"], x0 + name_w + txt_w + 40, y + 14, txt_w + 10, row_h - 30, 14, True)
        for k in range(len(stages)):
            cx = dot_x + k * 85 + 18
            if k < r["prev"]:
                fill, ln = NAVY, None
            elif k < r["now"]:
                fill, ln = AMBER, None
            else:
                fill, ln = WHITE, PALE
            rect(s, cx, y + 40, 30, 30, fill, MSO_SHAPE.OVAL, ln)
        if r["now"] > r["prev"]:
            text(s, f"+{r['now'] - r['prev']}段階", dot_x, y + 82, 340, 30, 14, True, AMBER, PP_ALIGN.CENTER)


def checklist(s, d):
    y = 250
    text(s, "9/15に設定した宿題", 340, y, 560, 30, 15, True, GRAY)
    text(s, "最新の結果", 1000, y, 540, 30, 15, True, GRAY)
    row_h = 118
    for i, r in enumerate(d["rows"]):
        yy = y + 40 + i * row_h
        rect(s, 60, yy, 1480, row_h - 12, WHITE, line=PALE)
        text(s, r["name"], 76, yy + 12, 150, 40, 18, True)
        badge(s, r["label"], 76, yy + 56, 130, r["kind"])
        text(s, r["task"], 340, yy + 12, 620, row_h - 30, 14, color=GRAY)
        text(s, r["result"], 1000, yy + 12, 520, row_h - 30, 14, True)


def table(s, rows, y=260, widths=None, size=15, row_h=None, highlight_col=None, x=60):
    nrows, ncols = len(rows), len(rows[0])
    widths = widths or [1480 / ncols] * ncols
    row_h = row_h or min(60, 480 / nrows)
    shape = s.shapes.add_table(nrows, ncols, px(x), px(y), px(sum(widths)), px(row_h * nrows))
    tbl = shape.table
    for j, w in enumerate(widths):
        tbl.columns[j].width = px(w)
    for i, row in enumerate(rows):
        tbl.rows[i].height = px(row_h)
        for j, val in enumerate(row):
            cell = tbl.cell(i, j)
            cell.fill.solid()
            cell.fill.fore_color.rgb = NAVY if i == 0 else (WHITE if i % 2 else NOTE_BG)
            cell.margin_left = cell.margin_right = px(10)
            cell.margin_top = cell.margin_bottom = px(4)
            cell.vertical_anchor = MSO_ANCHOR.MIDDLE
            tf = cell.text_frame
            tf.word_wrap = True
            r = tf.paragraphs[0].add_run()
            r.text = str(val)
            color, bold = (WHITE, True) if i == 0 else (NAVY, False)
            if i > 0 and highlight_col is not None and j in (
                    highlight_col if isinstance(highlight_col, (list, tuple)) else [highlight_col]):
                pct = _pct(val)
                if pct is not None:
                    color = GOOD if pct >= 100 else (BAD if pct < 80 else NAVY)
                    bold = True
            style_run(r, size, bold, color)
    return tbl


def _pct(v):
    try:
        return float(str(v).split("%")[0].split("(")[-1].split("→")[-1])
    except ValueError:
        return None


def bars(s, d):
    """光シェアなど推移を横棒で描く（目標線つき）。"""
    b = d["bars"]
    x0, y0, w = b["x"], b["y"], b["w"]
    scale = w / b["max"]
    text(s, b["caption"], x0, y0 - 44, w + 200, 34, 17, True)
    row = 0
    for g in b["groups"]:
        text(s, g["name"], x0, y0 + row * 46, 160, 40, 15, True)
        for k, (lab, v) in enumerate(g["values"]):
            yy = y0 + row * 46 + k * 30 + 4
            col = AMBER if k == len(g["values"]) - 1 else PALE
            text(s, lab, x0 + 160, yy - 4, 60, 28, 12, color=GRAY)
            rect(s, x0 + 220, yy, max(v * scale, 2), 22, col)
            text(s, f"{v:.1f}%", x0 + 226 + v * scale, yy - 4, 90, 28, 13, k == len(g["values"]) - 1)
        row += len(g["values"]) * 30 / 46 + 0.6
    tx = x0 + 220 + b["target"] * scale
    total_h = row * 46
    rect(s, tx, y0 - 6, 2, total_h, BAD)
    text(s, f"目標{b['target']}%", tx - 40, y0 + total_h - 4, 100, 26, 12, True, BAD, PP_ALIGN.CENTER)


def main():
    prs = Presentation()
    prs.slide_width, prs.slide_height = px(1600), px(900)
    slides = DATA["slides"]
    for i, d in enumerate(slides, 1):
        s = frame(prs, d, i, len(slides))
        if "tiles" in d:
            tiles(s, d["tiles"], y=d.get("tiles_y", 250))
        if "columns" in d:
            columns(s, d["columns"], y=d.get("cols_y", 270), h=d.get("cols_h", 470))
        if "stages" in d:
            ladder(s, d)
        if d.get("checklist"):
            checklist(s, d)
        for key in ("table", "table2"):
            if key in d:
                t = d[key]
                if t.get("caption"):
                    text(s, t["caption"], t.get("x", 60), t["y"] - 40, 900, 36, 17, True)
                table(s, t["rows"], y=t.get("y", 260), widths=t.get("widths"), size=t.get("size", 15),
                      row_h=t.get("row_h"), highlight_col=t.get("highlight_col"), x=t.get("x", 60))
        if "bars" in d:
            bars(s, d)
        if "side" in d:
            sd = d["side"]
            if sd.get("box"):
                rect(s, sd["x"] - 16, sd["y"] - 12, sd["w"] + 32, sd.get("h", 400) + 60, WHITE, line=PALE)
            text(s, sd["head"], sd["x"], sd["y"], sd["w"], 40, 18, bold=True, color=sd.get("color", NAVY))
            text(s, sd["body"], sd["x"], sd["y"] + 44, sd["w"], sd.get("h", 400), 15)
    prs.save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()
