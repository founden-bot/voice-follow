/**
 * voice-follow: where in a script a reader is, from what speech recognition heard. The engine behind the free web
 * teleprompter at https://yapcam.cc/teleprompter, which scrolls a script as you speak and waits when you pause.
 *
 * Pure functions, no DOM, so the matcher can be tested on its own. Feed it the newest words the recognizer heard
 * (interim results included, so the text moves while a sentence is still being spoken) and the reader's current
 * position; it answers the next word to read, or null when what was heard does not place the reader anywhere with
 * confidence (an ad-lib, a cough, a misheard word), in which case the text should wait.
 *
 * How it places the reader: the newest heard word must match a script word near the current position, and the
 * words heard before it must match the script words before that one, allowing one missed or extra word at each
 * step. The best-scoring place within a window (a few words back, up to 40 ahead) wins, with a small cost for
 * distance so a repeated phrase resolves to the nearer copy. A jump back needs a strong match, so a word that
 * also appeared earlier in the script never pulls the text backwards.
 *
 * MIT License. Copyright (c) 2026 O-mega Enterprise, Inc. (YapCam).
 */

export type ScriptWord = { text: string; key: string };
export type ScriptParagraph = { words: { word: ScriptWord; index: number }[] };

/** Lowercase, accents and punctuation removed: "Don't," and "dont" are the same word to the matcher. */
export function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

/** The script as paragraphs of words, each word carrying its position in the whole script. */
export function parseScript(script: string): { paragraphs: ScriptParagraph[]; words: ScriptWord[] } {
  const words: ScriptWord[] = [];
  const paragraphs: ScriptParagraph[] = [];
  for (const block of script.split(/\n\s*\n|\r\n\s*\r\n/)) {
    const tokens = block.split(/\s+/).filter(Boolean);
    if (!tokens.length) continue;
    paragraphs.push({
      words: tokens.map((text) => {
        const word = { text, key: normalizeWord(text) };
        words.push(word);
        return { word, index: words.length - 1 };
      }),
    });
  }
  return { paragraphs, words };
}

/** The words of a recognizer's transcript, normalized, empty ones dropped. */
export function spokenWords(transcript: string): string[] {
  return transcript.split(/\s+/).map(normalizeWord).filter(Boolean);
}

function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/** Heard and written count as the same word when equal, one a long prefix of the other, or one letter apart. */
export function sameWord(heard: string, written: string): boolean {
  if (!heard || !written) return false;
  if (heard === written) return true;
  if (heard.length >= 4 && written.length >= 4 && (heard.startsWith(written) || written.startsWith(heard))) return true;
  return heard.length >= 5 && written.length >= 5 && withinOneEdit(heard, written);
}

const weight = (word: string) => (word.length <= 2 ? 0.5 : 1);

const TAIL = 6;
const BACK = 6;
const AHEAD = 40;

/**
 * The next word to read after what was heard, or null when it places the reader nowhere with confidence.
 * `position` is the index of the next word the reader is expected to say.
 */
export function followVoice(heard: string[], script: ScriptWord[], position: number): number | null {
  const tail = heard.slice(-TAIL);
  if (!tail.length || !script.length) return null;
  const from = Math.max(0, position - BACK);
  const to = Math.min(script.length - 1, position + AHEAD);
  let best = -1;
  let bestAdjusted = 0;
  let bestScore = 0;
  for (let end = from; end <= to; end++) {
    let score = 0;
    let at = end;
    for (let t = tail.length - 1; t >= 0 && at >= 0 && at > end - 12; t--) {
      if (sameWord(tail[t], script[at].key)) {
        score += weight(tail[t]);
        at -= 1;
      } else if (at - 1 >= 0 && sameWord(tail[t], script[at - 1].key)) {
        score += weight(tail[t]) * 0.8;
        at -= 2;
      } else if (t === tail.length - 1) {
        break;
      }
    }
    if (score === 0) continue;
    const distance = end + 1 - position;
    const adjusted = score - (distance > 0 ? distance * 0.03 : -distance * 0.2);
    if (adjusted > bestAdjusted) {
      bestAdjusted = adjusted;
      best = end;
      bestScore = score;
    }
  }
  if (best < 0) return null;
  const next = best + 1;
  const near = next - position >= 0 && next - position <= 3;
  // Two words in order place the reader anywhere in the window; a single word only moves the text on by a few
  // words, and a single short word ("a", "to") only when it is the very next word of the script.
  const confident = bestScore >= 2 || (near && bestScore >= 1) || (next - position === 1 && bestScore >= 0.5);
  if (!confident) return null;
  if (next < position && bestScore < 3) return null;
  return next;
}
