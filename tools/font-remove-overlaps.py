"""Merge overlapping contours in the Roboto files so outlined (text-stroke) headings draw clean.

Roboto's glyphs are built from overlapping shapes, which -webkit-text-stroke draws as stray inner
lines. This rewrites the given WOFF2 files in place with overlaps removed. Fills look the same.
Usage: python tools/font-remove-overlaps.py resources/fonts/roboto-latin-*-normal.woff2
Needs: pip install fonttools skia-pathops brotli
"""
import sys

from fontTools.ttLib import TTFont
from fontTools.ttLib.removeOverlaps import removeOverlaps

for path in sys.argv[1:]:
    font = TTFont(path)
    removeOverlaps(font)
    font.flavor = "woff2"
    font.save(path)
    print("cleaned", path)
