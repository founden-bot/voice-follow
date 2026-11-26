# voice-follow

A voice-activated teleprompter engine for the web. Give it your script and what the browser's speech recognition heard, and it tells you which word the reader is on, so the text scrolls as you speak, waits when you pause and catches up when you skip a line.

It is the engine behind the free web teleprompter at [yapcam.cc/teleprompter](https://yapcam.cc/teleprompter), made by the team behind [YapCam](https://yapcam.cc), an iPhone camera whose teleprompter follows your voice.

- No dependencies, no DOM: about 130 lines of TypeScript, built to ES2022 in `dist/`.
- Works with any recognizer that gives you words: the Web Speech API in Chrome, Edge and Safari, or your own.
- Tolerant of what recognizers get wrong: one missed or extra word at each step, plurals and near misses, accents and punctuation.
- Never jumps backwards on a word that merely appears earlier in the script.

## Try it

Open [the live teleprompter](https://yapcam.cc/teleprompter), or clone this repository, serve the folder (for example `npx serve .`) and open `demo.html`: paste a script, press Start listening and read aloud.

## Use it

```js
import { parseScript, spokenWords, followVoice } from "./dist/voice-follow.js";

const { words } = parseScript(scriptText); // paragraphs split on empty lines
let position = 0; // the index of the next word to read

recognition.onresult = (event) => {
  let transcript = "";
  for (let i = event.resultIndex; i < event.results.length; i++) transcript += " " + event.results[i][0].transcript;
  const next = followVoice(spokenWords(transcript), words, position);
  if (next !== null) position = next; // null means: what was heard places the reader nowhere, so wait
};
```

Feed it interim results too: the text then moves while a sentence is still being spoken.

## How it places the reader

The newest heard word must match a script word near the current position, and the words heard before it must match the script words before that one, allowing one missed or extra word at each step. The best-scoring place within a window (a few words back, up to 40 ahead) wins, with a small cost for distance, so a repeated phrase resolves to the nearer copy. A single short word only moves the text when it is the very next word, and a jump back needs a strong match.

Words are compared after lowercasing and removing accents and punctuation. Two words count as the same when they are equal, when one is a long prefix of the other ("catch" and "catches"), or when long words are one letter apart.

## Develop

```sh
npm run build   # src/voice-follow.ts to dist/
npm test        # node --test
```

## License

MIT
