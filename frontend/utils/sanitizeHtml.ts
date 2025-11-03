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
