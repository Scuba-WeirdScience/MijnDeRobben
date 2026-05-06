import { Pipe, PipeTransform } from '@angular/core';
import data from '@emoji-mart/data';

const EMOTICON_MAP: [RegExp, string][] = [
  [/:-\)/g,  '😊'],
  [/:\)/g,   '😊'],
  [/:-D/g,   '😄'],
  [/:D/g,    '😄'],
  [/;-\)/g,  '😉'],
  [/;\)/g,   '😉'],
  [/:-P/gi,  '😛'],
  [/:P/gi,   '😛'],
  [/:-\(/g,  '😞'],
  [/:\(/g,   '😞'],
  [/:-\|/g,  '😐'],
  [/:\|/g,   '😐'],
  [/:-O/gi,  '😮'],
  [/:O/gi,   '😮'],
  [/:-\*/g,  '😘'],
  [/:\*/g,   '😘'],
  [/<3/g,    '❤️'],
  [/:-\//g,  '😕'],
  [/:\//g,   '😕'],
  [/B-\)/g,  '😎'],
  [/8-\)/g,  '😎'],
  [/O:-\)/g, '😇'],
  [/>:-\(/g, '😠'],
  [/:'[\(\)]/g, '😢'],
];

// ── Build a synchronous shortcode → native emoji map from @emoji-mart/data ──
const SHORTCODE_MAP = new Map<string, string>();
const emojiData = data as { emojis: Record<string, { skins: { native: string }[] }>; aliases: Record<string, string> };
for (const [id, emoji] of Object.entries(emojiData.emojis)) {
  SHORTCODE_MAP.set(id, emoji.skins[0].native);
}
for (const [alias, target] of Object.entries(emojiData.aliases)) {
  const native = SHORTCODE_MAP.get(target);
  if (native) SHORTCODE_MAP.set(alias, native);
}

/** Replace :shortcode: patterns with their native emoji character */
function replaceShortcodes(text: string): string {
  return text.replace(/:([a-z0-9_+-]+):/g, (match, code: string) => {
    return SHORTCODE_MAP.get(code) ?? match;
  });
}

function replaceAll(text: string): string {
  let result = replaceShortcodes(text);
  for (const [pattern, emoji] of EMOTICON_MAP) {
    result = result.replace(pattern, emoji);
  }
  return result;
}

/**
 * Converts :shortcode: emoji and ASCII emoticons to Unicode emoji.
 * Works on both plain text and HTML strings (only replaces inside text nodes).
 */
@Pipe({ name: 'emoticon', standalone: true, pure: true })
export class EmoticonPipe implements PipeTransform {
  transform(input: string | null | undefined): string {
    if (!input) return '';
    // If the string contains HTML tags, replace only inside text nodes (between > and <)
    if (/<[a-z]/i.test(input)) {
      return input.replace(/>([^<]*)</g, (_, text: string) => {
        return `>${replaceAll(text)}<`;
      });
    }
    // Plain text — replace directly
    return replaceAll(input);
  }
}
