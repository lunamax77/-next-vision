import base64, json, sys, urllib.request, concurrent.futures as cf, os

OUT = os.path.dirname(os.path.abspath(__file__))
COMMON = " Photorealistic product photo, soft natural lighting, clean composition. Absolutely no text, no letters, no logos, no watermarks."
SQ, PT = "1024x1024", "1024x1536"
JOBS = {
  "kit_snowdome": (SQ, "Flat lay of a children's DIY Christmas snow globe craft kit on a light pink table: clear plastic globe, red base, tiny Santa, Christmas tree and snowman figurines, small bags of white glitter snow and silver flakes, a small glue bottle, neatly arranged in an open red gift box with tissue paper." + COMMON),
  "kit_squeeze": (SQ, "Flat lay of a children's DIY squishy (squeeze toy) craft kit on a light pink table: soft silicone molds shaped like a Christmas tree, a boot, a snowman and a present box, small measuring cups, red, green and white liquid colorants, a small jar of shimmering powder, and finished pastel squishies in Christmas shapes." + COMMON),
  "arch": (SQ, "Large inflatable Christmas arch in green with red stripes and a big red bow on top, with an inflatable Santa Claus on the left and an inflatable snowman with top hat on the right, set up at the entrance of a bright modern retail store event space inside a shopping mall, families walking by." + COMMON),
  "poster_a": (PT, "Vertical Christmas event poster illustration for kids: a huge sparkling snow globe in the center containing a snowy town with a small shop and Christmas trees, light red and white background with falling snowflakes, large empty space at top and bottom for headline text. Cute flat illustration style. No text, no letters."),
  "poster_b": (PT, "Vertical Christmas event poster illustration for kids designed like an advent calendar: four large rounded windows arranged in a 2x2 grid, each showing a different craft (snow globe, squishy toy in tree shape, snow globe with snowman, squishy toy in present shape), light red background with ribbons and snowflakes, empty band at top for headline. Cute flat illustration style. No text, no letters, no numbers."),
  "poster_c": (PT, "Vertical Christmas event poster illustration for kids: cheerful Santa Claus, a snowman and a reindeer waving and inviting, standing around a table with handmade snow globes and squishy toys, light red background with snowflakes, empty space at top for headline. Cute flat illustration style. No text, no letters."),
  "tablecloth": (SQ, "A long event table covered with a Christmas tablecloth in red with a white snowflake and green holly pattern, a mini Christmas tree, warm LED string lights and craft supplies on top, set for a kids craft workshop inside a bright store." + COMMON),
  "nobori": (PT, "A tall Japanese nobori banner flag on a pole standing in a bright shopping mall, banner design in light red with white snowflakes, a Christmas tree, a snow globe illustration and green holly border, large blank white area in the middle reserved for vertical text." + " Absolutely no text, no letters, no logos."),
  "stand_sign": (SQ, "An A-frame sidewalk stand sign shaped like a green Christmas tree with a red star on top, decorated with ornaments, with a blank white rounded panel in the middle reserved for text, standing at a bright store entrance." + COMMON),
  "cos_santa": (SQ, "E-commerce product photo of an adult Santa Claus costume set on a white background: red velvet jacket and pants with white fur trim, black belt, Santa hat, white beard, laid out neatly." + COMMON),
  "cos_reindeer": (SQ, "E-commerce product photo of an adult reindeer kigurumi onesie costume made of brown fleece with antler hood and red nose, on a white background, on a mannequin." + COMMON),
  "cos_snowman": (SQ, "E-commerce product photo of an adult snowman costume onesie, white fleece with black buttons, orange carrot nose hood and red scarf, on a mannequin on white background." + COMMON),
  "cos_elf": (SQ, "E-commerce product photo of an adult Christmas elf costume set: green tunic with red trim, striped tights, pointed green hat with bell, on a mannequin on white background." + COMMON),
  "cos_gingerbread": (SQ, "E-commerce product photo of an adult gingerbread man costume, brown plush tunic with white icing trim and colorful buttons, on a mannequin on white background." + COMMON),
  "cos_tree": (SQ, "E-commerce product photo of an adult Christmas tree costume poncho, green with ornaments and a star headband, on a mannequin on white background." + COMMON),
}

def run(name):
    size, prompt = JOBS[name]
    path = os.path.join(OUT, name + ".png")
    if os.path.exists(path):
        return name, "skip"
    body = json.dumps({"model": os.environ.get("IMG_MODEL","gpt-image-1.5"), "prompt": prompt, "size": size, "quality": "medium", "n": 1}).encode()
    req = urllib.request.Request("https://api.openai.com/v1/images/generations", data=body,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=300) as r:
        d = json.load(r)
    open(path, "wb").write(base64.b64decode(d["data"][0]["b64_json"]))
    return name, "ok"

names = sys.argv[1:] or list(JOBS)
with cf.ThreadPoolExecutor(6) as ex:
    for f in cf.as_completed([ex.submit(run, n) for n in names]):
        try: print(*f.result(), flush=True)
        except Exception as e: print("ERR", e, getattr(e, "read", lambda: b"")()[:300], flush=True)
