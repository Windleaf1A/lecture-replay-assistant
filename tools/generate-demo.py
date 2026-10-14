"""Rebuild synthetic demo assets. Development only: Pillow + ffmpeg required."""
from pathlib import Path
from tempfile import TemporaryDirectory
import subprocess
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets'
LESSON = [
    ('Vectors', 'A vector has both direction and magnitude.', '向量同時具有方向與大小。', 'v = (2, 1)'),
    ('Vectors', 'In two dimensions, a vector is an ordered pair.', '二維向量可寫成一組有序數對。', 'v = (x, y)'),
    ('Linear combinations', 'A linear combination scales and adds vectors.', '線性組合將向量縮放後相加。', 'a u + b v'),
    ('Linear combinations', 'For example, two copies of u plus one copy of v.', '例如，兩倍的 u 加上一倍的 v。', '2 (1, 0) + (0, 1) = (2, 1)'),
    ('Span', 'The span contains every linear combination of the vectors.', '張成空間包含這些向量的所有線性組合。', 'span(u, v) = { a u + b v }'),
    ('Span', 'Two nonparallel vectors span the entire plane.', '兩個不平行的向量可張成整個平面。', 'u = (1, 0)     v = (0, 1)'),
    ('Linear independence', 'Independent vectors cannot be made from each other.', '線性獨立的向量無法由彼此組合得到。', 'a u + b v = 0'),
    ('Linear independence', 'Only zero coefficients produce the zero vector.', '只有係數全為零時才得到零向量。', 'a = 0     b = 0'),
    ('A dependent pair', 'Parallel vectors are linearly dependent.', '平行向量是線性相依的。', 'u = (1, 2)     v = (2, 4)'),
    ('A dependent pair', 'Here, v is twice u, so the span is only a line.', '這裡 v 是 u 的兩倍，張成空間只有一條直線。', 'v = 2 u'),
    ('Quick review', 'Vectors, linear combinations, span, and independence.', '複習：向量、線性組合、張成空間與線性獨立。', 'vector -> combination -> span'),
    ('Try it yourself', 'Search for span, then jump back to its explanation.', '搜尋 span，再跳回對應的講解片段。', 'Search -> timestamp -> replay'),
]

def font(size):
    candidates = ['/System/Library/Fonts/Supplemental/Arial.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']
    for path in candidates:
        if Path(path).exists(): return ImageFont.truetype(path, size)
    raise RuntimeError('Install Arial or DejaVu Sans, or set a font path in this script.')

def wrap(draw, text, face, width):
    lines, line = [], ''
    for word in text.split():
        candidate = (line + ' ' + word).strip()
        if draw.textlength(candidate, font=face) > width and line:
            lines.append(line); line = word
        else: line = candidate
    return lines + [line]

def frame(index):
    topic, caption, _, equation = LESSON[index]
    im = Image.new('RGB', (1280, 720), '#152f29'); d = ImageDraw.Draw(im)
    d.rectangle((0, 0, 1280, 9), fill='#dfeec6')
    d.text((72, 55), 'LECTURE REPLAY / SAMPLE LESSON', font=font(18), fill='#b7cfb2')
    d.text((72, 125), topic, font=font(53), fill='#f3f6e9')
    for i, line in enumerate(wrap(d, caption, font(30), 1040)):
        d.text((72, 225 + i * 42), line, font=font(30), fill='#d0ded1')
    d.rounded_rectangle((72, 360, 1208, 555), radius=18, fill='#21453a')
    d.text((110, 430), equation, font=font(37), fill='#e7ed9d')
    d.text((72, 620), 'Synthetic slides | No audio | Manually authored captions', font=font(19), fill='#9eb8a3')
    d.text((1040, 620), f'{index*5:02d}s / 60s', font=font(20), fill='#d6e5ca')
    d.rectangle((72, 680, 1208, 685), fill='#315449')
    d.rectangle((72, 680, 72 + int(1136 * (index+1)/12), 685), fill='#c8da92')
    return im

def stamp(seconds): return f'00:00:{seconds:02d},000' if seconds < 60 else '00:01:00,000'

def main():
    ASSETS.mkdir(exist_ok=True)
    (ASSETS/'demo.srt').write_text('\n\n'.join(f'{i+1}\n{stamp(i*5)} --> {stamp((i+1)*5)}\n{en}\n{zh}' for i, (_,en,zh,_) in enumerate(LESSON))+'\n', encoding='utf-8')
    frame(0).save(ASSETS/'poster.png')
    with TemporaryDirectory() as directory:
        for i in range(len(LESSON)): frame(i).save(Path(directory)/f'frame-{i:02d}.png')
        subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-framerate','1/5','-i',str(Path(directory)/'frame-%02d.png'),'-t','60','-r','24','-c:v','libx264','-preset','fast','-crf','26','-pix_fmt','yuv420p','-movflags','+faststart',str(ASSETS/'demo.mp4')], check=True)
    print('Created demo.mp4 (60 seconds, no audio), demo.srt (12 manual captions), poster.png.')

if __name__ == '__main__': main()
