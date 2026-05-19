import { EmoticonPipe } from './emoticon.pipe';

describe('EmoticonPipe', () => {
  let pipe: EmoticonPipe;

  beforeEach(() => { pipe = new EmoticonPipe(); });

  it('returns empty string for null', () => {
    expect(pipe.transform(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(pipe.transform(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(pipe.transform('')).toBe('');
  });

  it('returns plain text unchanged when no emoticons present', () => {
    expect(pipe.transform('Hallo wereld')).toBe('Hallo wereld');
  });

  it('converts :) to 😊', () => {
    expect(pipe.transform(':)')).toBe('😊');
  });

  it('converts :-) to 😊', () => {
    expect(pipe.transform(':-)')).toBe('😊');
  });

  it('converts :D to 😄', () => {
    expect(pipe.transform(':D')).toBe('😄');
  });

  it('converts ;) to 😉', () => {
    expect(pipe.transform(';)')).toBe('😉');
  });

  it('converts :( to 😞', () => {
    expect(pipe.transform(':(')).toBe('😞');
  });

  it('converts <3 to ❤️', () => {
    expect(pipe.transform('<3')).toBe('❤️');
  });

  it('converts :shortcode: to native emoji', () => {
    // :thumbsup: is a well-known emoji-mart shortcode
    const result = pipe.transform(':thumbsup:');
    expect(result).not.toBe(':thumbsup:');
    expect(result.length).toBeGreaterThan(0);
  });

  it('leaves unknown :shortcode: unchanged', () => {
    expect(pipe.transform(':not_a_real_code_xyz:')).toBe(':not_a_real_code_xyz:');
  });

  it('converts emoticons inside HTML text nodes only', () => {
    const input = '<p>Hallo :)</p>';
    const result = pipe.transform(input);
    expect(result).toContain('😊');
    expect(result).toContain('<p>');
    expect(result).toContain('</p>');
  });

  it('does not corrupt HTML tags', () => {
    const input = '<span class="test">:D</span>';
    const result = pipe.transform(input);
    expect(result).toContain('<span class="test">');
    expect(result).toContain('😄');
  });

  it('converts multiple emoticons in one string', () => {
    const result = pipe.transform(':) en :(');
    expect(result).toContain('😊');
    expect(result).toContain('😞');
  });
});
