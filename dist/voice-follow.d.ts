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
export type ScriptWord = {
    text: string;
    key: string;
};
export type ScriptParagraph = {
    words: {
        word: ScriptWord;
        index: number;
    }[];
};
/** Lowercase, accents and punctuation removed: "Don't," and "dont" are the same word to the matcher. */
export declare function normalizeWord(word: string): string;
/** The script as paragraphs of words, each word carrying its position in the whole script. */
export declare function parseScript(script: string): {
    paragraphs: ScriptParagraph[];
    words: ScriptWord[];
};
/** The words of a recognizer's transcript, normalized, empty ones dropped. */
export declare function spokenWords(transcript: string): string[];
/** Heard and written count as the same word when equal, one a long prefix of the other, or one letter apart. */
export declare function sameWord(heard: string, written: string): boolean;
/**
 * The next word to read after what was heard, or null when it places the reader nowhere with confidence.
 * `position` is the index of the next word the reader is expected to say.
 */
export declare function followVoice(heard: string[], script: ScriptWord[], position: number): number | null;
