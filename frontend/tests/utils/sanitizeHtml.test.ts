import { sanitizeHtml } from '../../utils/sanitizeHtml';

describe('sanitizeHtml', () => {
  it('returns empty string for empty input', () => {
    expect(sanitizeHtml('')).toBe('');
  });

  it('returns empty string for falsy input', () => {
    // @ts-expect-error Testing falsy input
    expect(sanitizeHtml(null)).toBe('');
    // @ts-expect-error Testing falsy input
    expect(sanitizeHtml(undefined)).toBe('');
  });

  it('keeps allowed tags', () => {
    expect(sanitizeHtml('<b>bold</b>')).toBe('<b>bold</b>');
    expect(sanitizeHtml('<strong>strong</strong>')).toBe(
      '<strong>strong</strong>',
    );
    expect(sanitizeHtml('<i>italic</i>')).toBe('<i>italic</i>');
    expect(sanitizeHtml('<em>emphasis</em>')).toBe('<em>emphasis</em>');
    expect(sanitizeHtml('line1<br>line2')).toBe('line1<br>line2');
  });

  it('strips disallowed tags', () => {
    expect(sanitizeHtml('<script>alert("xss")</script>')).toBe('');
    expect(sanitizeHtml('<div>content</div>')).toBe('content');
    expect(sanitizeHtml('<a href="http://evil.com">click</a>')).toBe('click');
  });

  it('strips all attributes', () => {
    expect(sanitizeHtml('<b class="red" style="color:red">bold</b>')).toBe(
      '<b>bold</b>',
    );
  });

  it('preserves plain text', () => {
    expect(sanitizeHtml('just plain text')).toBe('just plain text');
  });
});
