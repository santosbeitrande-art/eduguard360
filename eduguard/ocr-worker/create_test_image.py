from PIL import Image, ImageDraw, ImageFont

img = Image.new('RGB', (800, 200), color=(255,255,255))
d = ImageDraw.Draw(img)
try:
    f = ImageFont.truetype('arial.ttf', 24)
except Exception:
    f = ImageFont.load_default()
text = 'EduGuard Teste - 2026-07-01\nNome: Teste\nValor: 1234'
d.multiline_text((10,10), text, fill=(0,0,0), font=f)
img.save('test_doc.png')
print('Wrote test_doc.png')
