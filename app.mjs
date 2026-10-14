import { parseSRT, searchCues, formatTime, activeCue } from './core.mjs';
const $ = id => document.getElementById(id);
const video = $('video'), search = $('search'), transcript = $('transcript');
let cues = [], objectURL = null, pendingSeek = null, revision = 0;
const status = (message, error = false) => { $('status').textContent = message; $('status').classList.toggle('error', error); };

function highlight(container, text, query) {
  const term = query.trim().toLocaleLowerCase();
  if (!term) { container.textContent = text; return; }
  const lower = text.toLocaleLowerCase();
  let position = 0, match;
  while ((match = lower.indexOf(term, position)) !== -1) {
    container.append(document.createTextNode(text.slice(position, match)));
    const mark = document.createElement('mark'); mark.textContent = text.slice(match, match + term.length); container.append(mark);
    position = match + term.length;
  }
  container.append(document.createTextNode(text.slice(position)));
}
function sync() {
  const current = activeCue(cues, video.currentTime);
  $('current-caption').textContent = current?.text || 'No caption at this moment.';
  for (const row of transcript.querySelectorAll('.cue')) {
    const active = Number(row.dataset.cueId) === current?.id;
    row.classList.toggle('active', active);
    if (active) row.setAttribute('aria-current', 'true'); else row.removeAttribute('aria-current');
  }
}
function seek(time) {
  if (video.error) { status('This video could not be played. Choose another video or reload the sample lesson.', true); return; }
  if (!Number.isFinite(video.duration)) { pendingSeek = time; status('Waiting for video metadata before jumping…'); return; }
  if (time >= video.duration) { status('This subtitle timestamp is outside the video. Choose matching subtitles.', true); return; }
  video.currentTime = time;
  sync(); status(`Jumped to ${formatTime(time)}. Press Play to continue.`);
}
function render() {
  transcript.replaceChildren();
  const results = searchCues(cues, search.value);
  $('count').textContent = search.value.trim() ? `${results.length} / ${cues.length} entries` : `${cues.length} entries`;
  if (!results.length) {
    const empty = document.createElement('p'); empty.className = 'empty';
    empty.textContent = cues.length ? 'No matching captions. Try another keyword or clear the search.' : 'Load a sample lesson or a valid SRT file to see captions.';
    transcript.append(empty);
  }
  for (const cue of results) {
    const row = document.createElement('button'); row.type = 'button'; row.className = 'cue'; row.dataset.cueId = cue.id;
    row.setAttribute('aria-label', `Jump to ${formatTime(cue.start)}: ${cue.text}`);
    const stamp = document.createElement('time'); stamp.textContent = formatTime(cue.start);
    const text = document.createElement('span'); text.className = 'cue-text'; highlight(text, cue.text, search.value);
    row.append(stamp, text); row.addEventListener('click', () => seek(cue.start)); transcript.append(row);
  }
  sync();
}
function changeVideo(url, name, sample) {
  video.pause(); pendingSeek = null;
  video.src = url; video.poster = sample ? 'assets/poster.png' : ''; video.load();
  if (objectURL && objectURL !== url) URL.revokeObjectURL(objectURL);
  objectURL = url.startsWith('blob:') ? url : null;
  $('video-name').textContent = name;
  $('media-note').textContent = sample ? 'Synthetic teaching slides with no audio. The supplied English / Chinese captions are manually authored, not speech recognition results.' : 'Local video selected. Choose its matching SRT file; existing captions remain until you load another file.';
}
async function loadDemo() {
  const currentRevision = ++revision;
  $('load-demo').disabled = true;
  status('Loading the sample lesson…');
  try {
    const response = await fetch('assets/demo.srt');
    if (!response.ok) throw new Error(`Sample subtitles could not be loaded (${response.status}).`);
    const parsed = parseSRT(await response.text());
    if (currentRevision !== revision) return;
    cues = parsed; search.value = '';
    $('video-file').value = ''; $('subtitle-file').value = '';
    changeVideo('assets/demo.mp4', 'demo.mp4 · synthetic slides', true); render();
    status('Sample lesson ready. Try “span”, “VECTOR” or “向量”.');
  } catch (error) { if (currentRevision === revision) status(`${error.message} Start a local HTTP server as described in the README.`, true); }
  finally { $('load-demo').disabled = false; }
}
$('load-demo').addEventListener('click', loadDemo);
search.addEventListener('input', render);
$('clear-search').addEventListener('click', () => { search.value = ''; render(); search.focus(); });
video.addEventListener('timeupdate', sync); video.addEventListener('seeked', sync);
video.addEventListener('loadedmetadata', () => { if (pendingSeek !== null) { const time = pendingSeek; pendingSeek = null; seek(time); } });
video.addEventListener('error', () => status('Video failed to load or its format is unsupported. Choose another video or reload the sample lesson.', true));
$('video-file').addEventListener('change', event => {
  const file = event.target.files[0]; if (!file) return;
  revision++; changeVideo(URL.createObjectURL(file), file.name, false); sync();
  status('Local video selected. Load its matching SRT file.');
});
$('subtitle-file').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  const currentRevision = ++revision;
  try {
    if (file.size > 2 * 1024 * 1024) throw new Error('Subtitle file exceeds the prototype limit of 2 MB.');
    const parsed = parseSRT(await file.text());
    if (currentRevision !== revision) return;
    cues = parsed; search.value = ''; render(); status(`Loaded ${cues.length} captions from ${file.name}.`);
  } catch (error) { if (currentRevision === revision) status(`${error.message} Previous captions are still available.`, true); }
  finally { event.target.value = ''; }
});
window.addEventListener('pagehide', () => { if (objectURL) URL.revokeObjectURL(objectURL); });
loadDemo();
