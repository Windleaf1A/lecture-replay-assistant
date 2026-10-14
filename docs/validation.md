# Verification record

Verified on 2026-10-14 using the included demonstration lesson in a Chromium browser.

## Automated tests

Five tests pass with `node --test tests/core.test.mjs`:

1. Caption count, timestamps and intervals within the sample duration.
2. English case handling, Chinese matching, empty queries and unmatched queries.
3. BOM and CRLF handling, multiline captions, sequence numbers and chronological ordering.
4. Rejection of invalid timestamps, reversed intervals, empty files and missing text.
5. Caption boundaries and time formatting.

Both application modules also pass `node --check`.

## Browser verification

| Operation | Result |
| --- | --- |
| Load sample lesson | 12 bilingual captions and a 60-second video |
| Playback controls | Play and pause states verified |
| Caption navigation | 00:00, 00:25 and 00:50 checked |
| Search `span` | 5 results; 00:20 navigation displays the matching slide |
| Search `VECTOR` and `vector` | 9 results for both queries |
| Search `向量` | 9 results |
| Unmatched query | Clear empty-state message |
| Clear query | Complete transcript restored |
| Invalid SRT import | Existing captions retained and an explanatory error shown |

## Media and HTTP checks

The sample uses H.264 video at 1280×720 for 60 seconds. Captions are manually authored and aligned to the illustrated slides; the sample has no audio.

The player exposes a seekable 0-60 second interval. The local server returns HTTP 206 for valid byte ranges and HTTP 416 for an out-of-bounds range. HTML, JavaScript, SRT and MP4 resources return appropriate content types. Cancelled transfers are handled without interrupting the server.

## Coverage

These checks cover the included sample, transcript search, timestamp navigation and invalid-SRT recovery. Additional browser combinations, large lecture files and local media formats require further compatibility testing. Recognition accuracy, learning outcomes and GPU performance belong to the planned model and hardware evaluations.
