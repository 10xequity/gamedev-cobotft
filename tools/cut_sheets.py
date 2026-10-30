"""Cuts the 6x6 character sheets in art/sheets/ into transparent sprite sheets.

Each source sheet is a 1254x1254 PNG with a header row, a label column and 36
cells. The grid lines sit at the same pixels on every sheet. Output: one WebP
per look in tft-wcni4yex/assets/sprites/, 6 columns x 6 rows of 210x240 cells,
feet anchored to the cell bottom, grey studio backdrop removed, plus manifest.json.

Run: python -I tools/cut_sheets.py
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "art" / "sheets"
OUT = ROOT / "tft-wcni4yex" / "assets" / "sprites"
COLS = [90, 299, 493, 688, 865, 1055, 1251]      # rows 2-6
COLS_ROW1 = [90, 379, 533, 688, 865, 1055, 1251]  # the standing row has its own column widths
ROWS = [94, 333, 510, 688, 860, 1025, 1238]
CELL_W, CELL_H = 210, 240
INSET = 5     # top and bottom: drop the grid line and its halo
INSET_X = 10  # sides: the vertical lines wander a few pixels between sheets
POSES = {
    "front": (0, 0), "side": (0, 1), "back": (0, 2), "threeq_white": (0, 3), "threeq_teal": (0, 4), "portrait": (0, 5),
    "spike": [(1, 0), (1, 1), (1, 2)], "dig": [(1, 3), (1, 4), (1, 5)],
    "set": [(2, 0), (2, 1), (2, 2)], "block": [(2, 3), (2, 4), (2, 5)],
    "dance": [(3, 0), (3, 1), (3, 2)], "faint": [(3, 3), (3, 4), (3, 5)],
    "cry": [(4, 0), (4, 1), (4, 2)], "highfive_left": [(4, 3), (4, 4), (4, 5)],
    "highfive_right": [(5, 0), (5, 1), (5, 2)], "idle": [(5, 3), (5, 4), (5, 5)],
}


def knock_out_backdrop(cell: Image.Image) -> Image.Image:
    """Make the grey studio backdrop transparent. Only grey pixels connected to the
    cell border go; white kit (brighter than the backdrop) and enclosed greys stay."""
    rgb = np.asarray(cell.convert("RGB")).astype(np.int16)
    lum = rgb.mean(axis=2)
    sat = rgb.max(axis=2) - rgb.min(axis=2)
    # The backdrop is a near-flat grey; measure it from the border ring so the key band
    # sits just around it. White kit shading is lighter than the band and stays.
    ring = np.concatenate([lum[0], lum[-1], lum[:, 0], lum[:, -1]])
    bg = float(np.median(ring))
    # The band reaches the darker floor shadow below and the lighter floor sheen above the
    # backdrop value. White kit shading overlaps that band, so a gradient test keeps the
    # key from crossing a kit edge: backdrop, shadow and sheen are smooth, kit edges are sharp.
    grad = np.hypot(ndimage.sobel(lum, axis=0), ndimage.sobel(lum, axis=1)) / 8
    grey = (sat < 30) & (lum > bg - 95) & (lum < bg + 40) & (grad < 7)
    labels, _ = ndimage.label(grey)
    border = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    border = border[border != 0]
    bg = np.isin(labels, border)
    keep = ~bg
    # Drop debris: specks, and fragments at the top edge that are the feet of the row above.
    parts, n = ndimage.label(keep)
    for i, sl in enumerate(ndimage.find_objects(parts), start=1):
        area = int((parts[sl] == i).sum())
        height = sl[0].stop - sl[0].start
        if area < 80 or (sl[0].start < 12 and height < 40):
            keep[parts == i] = False
    alpha = Image.fromarray(np.where(keep, 255, 0).astype(np.uint8))
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
    out = cell.convert("RGBA")
    out.putalpha(alpha)
    return out


def cut(path: Path) -> Image.Image:
    src = Image.open(path).convert("RGB")
    # The club logo in the header spills a few pixels into the first cell; paint it over
    # with the backdrop colour sampled just beside it.
    src.paste(src.getpixel((250, 100)), (COLS[0], ROWS[0], 220, ROWS[0] + 20))
    sheet = Image.new("RGBA", (CELL_W * 6, CELL_H * 6), (0, 0, 0, 0))
    for r in range(6):
        cols = COLS_ROW1 if r == 0 else COLS
        for c in range(6):
            box = (cols[c] + INSET_X, ROWS[r] + INSET, cols[c + 1] - INSET_X, ROWS[r + 1] - INSET)
            cell = knock_out_backdrop(src.crop(box))
            # trim to content, then anchor feet to the bottom, centred
            bbox = cell.getchannel("A").getbbox() or (0, 0, cell.width, cell.height)
            cell = cell.crop(bbox)
            if cell.width > CELL_W or cell.height > CELL_H:
                cell.thumbnail((CELL_W, CELL_H), Image.LANCZOS)
            x = c * CELL_W + (CELL_W - cell.width) // 2
            y = r * CELL_H + (CELL_H - cell.height)
            sheet.alpha_composite(cell, (x, y))
    return sheet


def boxes(looks: list[str]) -> dict:
    """Per pose, the [x, y, w, h] box inside a cell that holds every look's figure, so the
    game can show just the figure instead of the whole cell."""
    out = {}
    sheets = [Image.open(OUT / f"{n}.webp").getchannel("A").point(lambda v: 255 if v > 8 else 0) for n in looks]  # ignore faint specks
    for pose, cells in POSES.items():
        x0, y0, x1, y1 = CELL_W, CELL_H, 0, 0
        for r, c in (cells if isinstance(cells[0], list) else [cells]):
            for a in sheets:
                bb = a.crop((c * CELL_W, r * CELL_H, c * CELL_W + CELL_W, r * CELL_H + CELL_H)).getbbox()
                if bb:
                    x0, y0, x1, y1 = min(x0, bb[0]), min(y0, bb[1]), max(x1, bb[2]), max(y1, bb[3])
        out[pose] = [x0, y0, x1 - x0, y1 - y0]
    return out


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    looks = []
    for path in sorted(SRC.glob("*.png")):
        sheet = cut(path)
        name = path.stem
        sheet.save(OUT / f"{name}.webp", "WEBP", quality=82, method=4)
        looks.append(name)
        print("cut", name)
    manifest = {"cell": [CELL_W, CELL_H], "cols": 6, "rows": 6, "poses": POSES, "looks": looks, "box": boxes(looks)}
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=1) + "\n")
    print(f"{len(looks)} looks -> {OUT}")


if __name__ == "__main__":
    main()
