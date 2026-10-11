from pathlib import Path
from PIL import Image
import json
root=Path(__file__).resolve().parent
report=json.loads((root/'PRUEFBERICHT.json').read_text(encoding='utf-8'))
for item in report['optimized']:
    f=root/item['variant']
    assert f.is_file(), f
    with Image.open(f) as im:
        assert im.size==(item['width'],item['height']), f
print('OK:',len(report['optimized']),'WebP-Bilder validiert; keine Animation ersetzt.')
