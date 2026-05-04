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

/**
 * Converts ASCII emoticons inside HTML text nodes to Unicode emoji.
 * Only replaces inside text nodes — not inside tag attributes — by
 * working on the raw HTML string between tags.
 */
@Pipe({ name: 'emoticon', standalone: true, pure: true })
export class EmoticonPipe implements PipeTransform {
  transform(html: string | null | undefined): string {
    if (!html) return '';
    // Replace only in text content (between > and <), not inside tag attributes
    return html.replace(/>([^<]*)</g, (match, text: string) => {
      let result = text;
      for (const [pattern, emoji] of EMOTICON_MAP) {
        result = result.replace(pattern, emoji);
      }
      return `>${result}<`;
    });
  }
}
