import { describe, test, expect } from '@jest/globals';
import { sanitizeHtml, sanitizeUrl, sanitizeFileName } from '../src/utils/sanitize.js';

describe('Input sanitization', () => {
  test('HTML escaping encodes all dangerous characters', () => {
    expect(sanitizeHtml(`<script>alert("x") & 'y'</script>`))
      .toBe('&lt;script&gt;alert(&quot;x&quot;) &amp; &#39;y&#39;&lt;/script&gt;');
  });

  test('URL sanitizer accepts only HTTP(S)', () => {
    expect(sanitizeUrl('https://example.com/a')).toBe('https://example.com/a');
    expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
  });

  test('filename sanitizer blocks path traversal', () => {
    expect(sanitizeFileName('../../../secret.jpg')).toBe('.._.._.._secret.jpg');
    expect(sanitizeFileName('normal-image.jpg')).toBe('normal-image.jpg');
  });
});
