import { describe, expect, it } from 'vitest';
import { isPrivatePath, renderIndex } from '../lib/seo.js';

const html = `<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta name="theme-color" content="#050914" />
    <!--seo:start-->
    <title>GoalForge AI</title>
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <!--seo:end-->
  </head>
  <body style="margin:0;background:#050914">
    <div id="root"><!--splash:start--><div>GoalForge</div><!--splash:end--></div>
  </body>
</html>`;

describe('renderIndex', () => {
  it('serves the public page untouched (indexable)', () => {
    expect(renderIndex(html, '/')).toBe(html);
  });

  it('marks private app routes noindex', () => {
    for (const p of ['/app', '/app/videos', '/admin', '/users', '/expenses']) {
      expect(isPrivatePath(p)).toBe(true);
      expect(renderIndex(html, p)).toContain('content="noindex, nofollow"');
    }
    expect(isPrivatePath('/application')).toBe(false);
    expect(isPrivatePath('/login')).toBe(false);
  });

  it('gives /gym its own Hebrew preview, noindex, home-screen tags and splash', () => {
    const out = renderIndex(html, '/gym');
    expect(out).toContain('<html lang="he" dir="rtl" class="dark">');
    expect(out).toContain('og:image" content="https://goalforge.top/og-gym.jpg"');
    expect(out).toContain('content="noindex, nofollow"');
    expect(out).toContain('<link rel="manifest" href="/gym.webmanifest" />');
    expect(out).toContain('GYM<span');
    expect(out).not.toContain('<div>GoalForge</div>');
    expect(out).not.toContain('<title>GoalForge AI</title>');
  });
});
