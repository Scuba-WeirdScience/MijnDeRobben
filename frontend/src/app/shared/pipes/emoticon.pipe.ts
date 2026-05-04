import { Pipe, PipeTransform } from '@angular/core';

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

function replaceEmoticons(text: string): string {
  let result = text;
  for (const [pattern, emoji] of EMOTICON_MAP) {
    result = result.replace(pattern, emoji);
  }
  return result;
}

/**
 * Converts ASCII emoticons to Unicode emoji.
 * Works on both plain text and HTML strings (only replaces inside text nodes).
 */
@Pipe({ name: 'emoticon', standalone: true, pure: true })
export class EmoticonPipe implements PipeTransform {
  transform(input: string | null | undefined): string {
    if (!input) return '';
    // If the string contains HTML tags, replace only inside text nodes (between > and <)
    if (/<[a-z]/i.test(input)) {
      return input.replace(/>([^<]*)</g, (match, text: string) => {
        return `>${replaceEmoticons(text)}<`;
      });
    }
    // Plain text — replace directly
    return replaceEmoticons(input);
  }
}
