import base64
import io
import os
from PIL import Image

gen_dir = '/working_dir/c_de7c884d0727772d/user_uploaded_files/ttl=63d/tool_generated'
files = {
    'organizerPortrait': ('watermarked_img_16626476610851982987.jpg', (420, 420)),
    'workspaceDesk': ('watermarked_img_10201055918508969843.jpg', (420, 420)),
    'card01CampusBlue': ('watermarked_img_12892109522706695276.jpg', (840, 560)),
    'card02StudyRoom': ('watermarked_img_11253407918250210145.jpg', (840, 560)),
    'card03YellowCourtyard': ('watermarked_img_5625057145023416794.jpg', (840, 560)),
    'card04SunsetDunes': ('watermarked_img_16065960159136018242.jpg', (840, 560)),
}

out_lines = [
    "// Auto-generated optimized image assets for Quorum Landing Page (JavaScript ES Module)",
    "export const MEDIA_ASSETS = {"
]

for key, (fname, size) in files.items():
    p = os.path.join(gen_dir, fname)
    img = Image.open(p).convert('RGB')
    img = img.resize(size, Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=82, optimize=True)
    b64 = base64.b64encode(buf.getvalue()).decode('ascii')
    out_lines.append(f'  {key}: "data:image/jpeg;base64,{b64}",')

out_lines.append("};\n")

with open('/working_dir/c_de7c884d0727772d/src/assets/mediaAssets.js', 'w') as f:
    f.write('\n'.join(out_lines))

print("Created src/assets/mediaAssets.js successfully, size:", os.path.getsize('/working_dir/c_de7c884d0727772d/src/assets/mediaAssets.js'))
