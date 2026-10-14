export function parseSRT(source) {
  if (typeof source !== 'string' || !source.trim()) throw new Error('The subtitle file is empty. Choose a valid UTF-8 SRT file.');
  const normalized = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
  const blocks = normalized.split(/\n[ \t]*\n+/);
  const timestamp = value => {
    const match = /^(\d{2,}):(\d{2}):(\d{2})[,.](\d{3})$/.exec(value);
    if (!match || Number(match[2]) > 59 || Number(match[3]) > 59) throw new Error('Invalid SRT timestamp. Expected HH:MM:SS,mmm.');
    return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000;
  };
  const cues = blocks.map((block, index) => {
    const lines = block.split('\n');
    if (/^\d+$/.test(lines[0].trim())) lines.shift();
    const times = /^(\S+)\s*-->\s*(\S+)\s*$/.exec(lines.shift()?.trim() || '');
    if (!times) throw new Error(`Subtitle entry ${index + 1} has no valid timestamp line.`);
    const start = timestamp(times[1]), end = timestamp(times[2]);
    const text = lines.join('\n').trim();
    if (end <= start || !text) throw new Error(`Subtitle entry ${index + 1} has invalid timing or no text.`);
    return { id: index, start, end, text };
  });
  return cues.sort((a, b) => a.start - b.start || a.id - b.id);
}
export function searchCues(cues, query) {
  const term = query.trim().toLocaleLowerCase();
  return term ? cues.filter(cue => cue.text.toLocaleLowerCase().includes(term)) : cues;
}
export function formatTime(seconds) {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(value / 3600), m = Math.floor(value / 60) % 60, s = value % 60;
  return (h ? `${String(h).padStart(2, '0')}:` : '') + `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
export function activeCue(cues, time) { return cues.find(cue => cue.start <= time && time < cue.end); }
