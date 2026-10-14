"""Local static server with single HTTP byte ranges for reliable video seeking."""
import argparse
import os
from pathlib import Path
import re
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = Path(__file__).resolve().parents[1]

class RangeHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        self.range_length = None
        path = self.translate_path(self.path)
        if not os.path.isfile(path): return super().send_head()
        stream = open(path, 'rb')
        size = os.fstat(stream.fileno()).st_size
        header = self.headers.get('Range')
        start, end = 0, size - 1
        if header:
            match = re.fullmatch(r'bytes=(\d*)-(\d*)', header.strip())
            if not match or not any(match.groups()): return self.bad_range(stream, size)
            first, last = match.groups()
            if first:
                start = int(first); end = min(int(last), end) if last else end
            else:
                length = int(last)
                if length <= 0: return self.bad_range(stream, size)
                start = max(0, size - length)
            if start >= size or start > end: return self.bad_range(stream, size)
            self.send_response(206)
            self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
            self.range_length = end - start + 1
            stream.seek(start)
        else:
            self.send_response(200)
        self.send_header('Content-Type', self.guess_type(path))
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Content-Length', str(end - start + 1))
        self.end_headers()
        return stream

    def bad_range(self, stream, size):
        stream.close()
        self.send_response(416)
        self.send_header('Content-Range', f'bytes */{size}')
        self.send_header('Content-Length', '0')
        self.end_headers()
        return None

    def copyfile(self, source, outputfile):
        try:
            if self.range_length is None: return super().copyfile(source, outputfile)
            remaining = self.range_length
            while remaining:
                data = source.read(min(65536, remaining))
                if not data: break
                outputfile.write(data); remaining -= len(data)
        except (BrokenPipeError, ConnectionResetError):
            # Browsers can cancel a transfer when seeking or closing the page.
            pass

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8000)
    args = parser.parse_args()
    handler = lambda *a, **kw: RangeHandler(*a, directory=str(ROOT), **kw)
    with ThreadingHTTPServer(('127.0.0.1', args.port), handler) as server:
        print(f'Lecture Replay: http://127.0.0.1:{args.port}', flush=True)
        try: server.serve_forever()
        except KeyboardInterrupt: pass

if __name__ == '__main__': main()
