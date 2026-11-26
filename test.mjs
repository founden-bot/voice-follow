import { test } from "node:test";
import assert from "node:assert/strict";
import { parseScript, spokenWords, followVoice, sameWord, normalizeWord } from "./dist/voice-follow.js";

const { words } = parseScript("When I pause, the text waits for me.\n\nWhen I skip a line, it catches up.");

test("normalizes punctuation, case and accents", () => {
  assert.equal(normalizeWord("Don't,"), "dont");
  assert.equal(normalizeWord("Café"), "cafe");
});

test("tolerates small recognition errors", () => {
  assert.ok(sameWord("catches", "catch"));
  assert.ok(sameWord("teleprompter", "teleprompters"));
  assert.ok(!sameWord("pause", "line"));
});

test("moves to the word after what was heard", () => {
  assert.equal(followVoice(spokenWords("when I pause the text"), words, 0), 5);
});

test("waits when what was heard is not in the script", () => {
  assert.equal(followVoice(spokenWords("hold on a second"), words, 5), null);
});

test("catches up when a line is skipped", () => {
  assert.equal(followVoice(spokenWords("skip a line it"), words, 5), 14);
});

test("a repeated word does not pull the text backwards", () => {
  assert.equal(followVoice(spokenWords("when"), words, 10), null);
});
