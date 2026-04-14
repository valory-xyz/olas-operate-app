/**
 *  HTML sanitization utility using DOMPurify
 **/
import DOMPurify from 'dompurify';

export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    // Allow styling tags
    ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'br'],
    ALLOWED_ATTR: [],
  });
}

export function sanitizeReleaseNotes(dirty: string): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'h1',
      'h2',
      'h3',
      'p',
      'ul',
      'ol',
      'li',
      'strong',
      'em',
      'b',
      'i',
      'a',
      'br',
      'code',
    ],
    ALLOWED_ATTR: ['href', 'target'],
  });
}
