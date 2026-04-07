#!/usr/bin/env python3
import sys
from pathlib import Path
from PIL import Image
import pillow_heif

pillow_heif.register_heif_opener()

for heic in Path(sys.argv[1]).rglob("*.HEIC"):
    jpg = heic.with_suffix(".jpg")
    try:
        img = Image.open(heic)
        img.save(jpg, "JPEG", quality=90)
        print(f"OK: {heic}")
    except Exception as e:
        print(f"FAIL: {heic}: {e}")
