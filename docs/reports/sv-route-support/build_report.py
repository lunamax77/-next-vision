"""SV・ルートサポート質向上 進捗報告 (2026.11.05版) を生成する。

使い方: python3 build_report.py  → 同フォルダに pptx を出力
"""
from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.util import Emu, Pt

from report_data import DATA

OUT = Path(__file__).with_name(DATA["filename"])

NAVY = RGBColor(0x1B, 0x2A, 0x4E)
GRAY = RGBColor(0x5A, 0x63, 0x75)
LIGHT = RGBColor(0xF8, 0xF9, 0xFB)
NOTE_BG = RGBColor(0xEE, 0xF0, 0xF4)
AMBER = RGBColor(0xE8, 0xA3, 0x00)
GOOD = RGBColor(0x1E, 0x7B, 0x4F)
BAD = RGBColor(0xC0, 0x39, 0x2B)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
FONT = "Hiragino Sans"

PX = 9525  # 1px (1600x900 基準) を EMU に


def px(v):
    return Emu(int(v * PX))


def text(slide, s, x, y, w, h, size=20, bold=False, color=NAVY, align=None):
    tb = slide.shapes.add_textbox(px(x), px(y), px(w), px(h))
    tf = tb.text_frame
    tf.word_wrap = True
    for i, line in enumerate(s.split("\n")):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.space_after = Pt(4)
        if align:
            p.alignment = align
        r = p.add_run()
        r.text = line
        r.font.size = Pt(size * 0.75)
        r.font.bold = bold
        r.font.name = FONT
        r.font.color.rgb = color
    return tb


def rect(slide, x, y, w, h, fill):
    sh = slide.shapes.add_shape(1, px(x), px(y), px(w), px(h))
    sh.fill.solid()
    sh.fill.fore_color.rgb = fill
    sh.line.fill.background()
    return sh


def frame(prs, d, idx, total):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    s.background.fill.solid()
    s.background.fill.fore_color.rgb = LIGHT
    rect(s, 0, 0, 1600, 8, AMBER)
    text(s, "DREAM CREATION  /  SV・ルートサポート質向上", 60, 38, 900, 30, 15, color=GRAY)
    text(s, DATA["version"], 1200, 38, 340, 30, 15, color=GRAY, align=PP_ALIGN.RIGHT)
    text(s, d["title"], 60, 96, 1480, 60, 36, bold=True)
    if d.get("lead"):
        text(s, d["lead"], 60, 170, 1480, 70, 21, color=GRAY)
    if d.get("note"):
        rect(s, 60, 770, 1480, 70, NOTE_BG)
        text(s, d["note"], 72, 776, 1456, 60, 14, color=GRAY)
    text(s, "ドコモCS 野尻課長 御中  ／  DreamCreation 事務局（森下）", 60, 860, 900, 30, 14, color=GRAY)
    text(s, f"{idx:02d} / {total:02d}", 1340, 860, 160, 30, 14, color=GRAY, align=PP_ALIGN.RIGHT)
    return s


def columns(s, cols, y=270, h=470):
    n = len(cols)
    gap = 40
    w = (1480 - gap * (n - 1)) / n
    for i, c in enumerate(cols):
        x = 60 + i * (w + gap)
        rect(s, x, y, w, 4, AMBER if i == n - 1 else NAVY)
        text(s, c["head"], x, y + 16, w, 70, 22, bold=True)
        text(s, c["body"], x, y + 90, w, h - 90, 18, color=NAVY)


def table(s, rows, y=260, widths=None, size=15, row_h=None, highlight_col=None):
    nrows, ncols = len(rows), len(rows[0])
    widths = widths or [1480 / ncols] * ncols
    row_h = row_h or min(60, 480 / nrows)
    shape = s.shapes.add_table(nrows, ncols, px(60), px(y), px(sum(widths)), px(row_h * nrows))
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
            tf = cell.text_frame
            tf.word_wrap = True
            p = tf.paragraphs[0]
            r = p.add_run()
            r.text = str(val)
            r.font.size = Pt(size * 0.75)
            r.font.name = FONT
            r.font.bold = i == 0
            color = WHITE if i == 0 else NAVY
            if i > 0 and highlight_col is not None and j == highlight_col:
                pct = _pct(val)
                if pct is not None:
                    color = GOOD if pct >= 100 else (BAD if pct < 80 else NAVY)
                    r.font.bold = True
            r.font.color.rgb = color
    return tbl


def _pct(v):
    try:
        return float(str(v).split("%")[0].split("(")[-1])
    except ValueError:
        return None


def main():
    prs = Presentation()
    prs.slide_width, prs.slide_height = px(1600), px(900)
    slides = DATA["slides"]
    for i, d in enumerate(slides, 1):
        s = frame(prs, d, i, len(slides))
        if "columns" in d:
            columns(s, d["columns"], y=d.get("cols_y", 270), h=d.get("cols_h", 470))
        if "table" in d:
            t = d["table"]
            table(s, t["rows"], y=t.get("y", 260), widths=t.get("widths"), size=t.get("size", 15),
                  row_h=t.get("row_h"), highlight_col=t.get("highlight_col"))
        if "table2" in d:
            t = d["table2"]
            if t.get("caption"):
                text(s, t["caption"], 60, t["y"] - 40, 1480, 36, 18, bold=True)
            table(s, t["rows"], y=t["y"], widths=t.get("widths"), size=t.get("size", 15),
                  row_h=t.get("row_h"), highlight_col=t.get("highlight_col"))
        if "side" in d:
            sd = d["side"]
            text(s, sd["head"], sd["x"], sd["y"], sd["w"], 40, 20, bold=True)
            text(s, sd["body"], sd["x"], sd["y"] + 46, sd["w"], sd.get("h", 400), 17)
    prs.save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()
