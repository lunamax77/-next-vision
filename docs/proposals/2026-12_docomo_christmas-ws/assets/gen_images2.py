import sys, os, importlib.util
spec = importlib.util.spec_from_file_location("g", os.path.join(os.path.dirname(os.path.abspath(__file__)), "gen.py"))
ST = " Cute flat vector illustration, soft light red, pink and white palette with small green accents, rounded simple shapes, plain white background, Japanese everyday setting. Absolutely no text, no letters, no numbers, no logos."
NEW = {
 "ill_family": "A happy Japanese family (parents and two small kids) walking into a bright phone store event space decorated for Christmas, kids pointing excitedly.",
 "ill_calendar": "A December wall calendar with four weekly sections, each marked with a small Christmas craft icon (snow globe, squishy tree, squishy snowman, snow globe), a child happily circling the next week.",
 "ill_parent_child": "Split scene: on the left a child happily making a craft at a decorated table with a store staff member watching, on the right the parents sitting at a store counter talking with a friendly staff member about smartphones.",
 "ill_store_scene": "A Christmas craft workshop booth inside a phone store: an inflatable green-and-red Christmas arch with Santa and snowman, a long table with red snowflake tablecloth where kids make crafts, a tall vertical banner flag, a tree-shaped stand sign, a large poster board, staff wearing Santa and reindeer costumes.",
 "ill_wk1": "A cute snow globe containing Santa Claus and a small Christmas tree, sparkles around it.",
 "ill_wk2": "Cute pastel squishy toys shaped like a Christmas tree and a Christmas boot, soft and squishy looking.",
 "ill_wk3": "Cute pastel squishy toys shaped like a snowman and a wrapped present box, soft and squishy looking.",
 "ill_wk4": "A cute snow globe containing a snowman and a reindeer, sparkles around it.",
 "ill_order": "A business person handing over a signed order document with a checkmark, simple icon-like scene.",
 "ill_make": "Workers packing craft kits and posters into cardboard boxes on a table, simple icon-like scene.",
 "ill_ship": "A delivery truck carrying cardboard boxes driving across a simple map of Japan with location pins.",
 "ill_event": "Children doing crafts at a Christmas decorated table inside a store while parents watch, simple icon-like scene.",
 "ill_return": "A cardboard box being taped closed with a shipping label attached, a deflated inflatable arch folded inside, simple icon-like scene.",
 "ill_manual": "An open instruction booklet with step-by-step picture cards for a kids craft, simple icon-like scene.",
}
os.environ.setdefault("IMG_MODEL", "gpt-image-1.5")
g = importlib.util.module_from_spec(spec)
sys.argv = [sys.argv[0], "__none__"]
src = open(spec.origin, encoding="utf8").read().split("names = sys.argv")[0]
exec(src, g.__dict__)
g.JOBS.clear()
g.JOBS.update({k: ("1024x1024", v + ST) for k, v in NEW.items()})
import concurrent.futures as cf
with cf.ThreadPoolExecutor(7) as ex:
    for f in cf.as_completed([ex.submit(g.run, n) for n in NEW]):
        try: print(*f.result(), flush=True)
        except Exception as e: print("ERR", e, flush=True)
