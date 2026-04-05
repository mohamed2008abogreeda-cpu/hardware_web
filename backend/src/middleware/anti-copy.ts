import { Request, Response, NextFunction } from 'express';

/**
 * Anti-copy protection middleware.
 * Adds security headers to prevent text/image copying and right-click.
 * Per SECURITY-RULES.md spec.
 */
export function antiCopyHeaders(_req: Request, res: Response, next: NextFunction): void {
  // Prevent caching of sensitive pages
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Prevent embedding in iframes (clickjacking)
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  next();
}

/**
 * Generate a client-side anti-copy script to inject into pages.
 * Disables right-click, text selection, common keyboard shortcuts.
 */
export function getAntiCopyScript(): string {
  return `
<script>
(function() {
  // Disable right-click
  document.addEventListener('contextmenu', function(e) { e.preventDefault(); });

  // Disable text selection
  document.addEventListener('selectstart', function(e) { e.preventDefault(); });

  // Disable keyboard shortcuts
  document.addEventListener('keydown', function(e) {
    // Ctrl+C, Ctrl+U, Ctrl+S, Ctrl+A, Ctrl+Shift+I, F12
    if (
      (e.ctrlKey && ['c','u','s','a'].includes(e.key.toLowerCase())) ||
      (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i') ||
      e.key === 'F12'
    ) {
      e.preventDefault();
    }
  });

  // Disable drag
  document.addEventListener('dragstart', function(e) { e.preventDefault(); });

  // Console warning
  console.log('%c⚠️ تحذير أمني', 'color: red; font-size: 24px; font-weight: bold;');
  console.log('%cاستخدام وحدة التحكم هذه قد يعرض حسابك للخطر.', 'font-size: 14px;');
})();
</script>`;
}
