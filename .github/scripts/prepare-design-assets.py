"""Fetch a fixed set of licensed design images, optimize, and retain attribution."""
import io, json, urllib.request
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets'/'site';OUT.mkdir(parents=True,exist_ok=True)
IMAGES={
 'architecture':'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1800&q=85',
 'coastal-home':'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=85',
 'bathroom':'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1600&q=85',
 'interior':'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1600&q=85',
 'kitchen':'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1600&q=85',
 'north-shore':'https://upload.wikimedia.org/wikipedia/commons/6/69/Vancouverskyline.jpg'
}
for name,url in IMAGES.items():
 dest=OUT/(name+'.webp')
 if dest.exists():continue
 req=urllib.request.Request(url,headers={'User-Agent':'JowkariTech-DesignBuild/1.0 (jowkaritech.com)'})
 with urllib.request.urlopen(req,timeout=30) as r:raw=r.read(12000000)
 im=Image.open(io.BytesIO(raw)).convert('RGB');im.thumbnail((1800,1400));im.save(dest,'WEBP',quality=84,method=6)
 print(name,im.size,dest.stat().st_size)
(OUT/'sources.json').write_text(json.dumps(IMAGES,indent=2))
(OUT/'CREDITS.md').write_text('''# Design image credits\n\nThe architecture, home, bathroom, interior and kitchen images are stock design imagery from Unsplash, not client projects or claims of local work. Original source URLs are in sources.json. Unsplash license: https://unsplash.com/license\n\nNorth Shore: Vancouver skyline from Lonsdale Quay by rpaterso, CC BY-SA 2.0. Source: https://commons.wikimedia.org/wiki/File:Vancouverskyline.jpg. License: https://creativecommons.org/licenses/by-sa/2.0/. Resized and converted to WebP; the image remains under that license.\n\nDemo screenshots are generated from the actual JowkariTech concept websites.\n''')
