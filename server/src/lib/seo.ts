/**
 * Per-route <head> tags for the single-page app. Link previews (WhatsApp,
 * iMessage, X, Facebook) and search crawlers read the raw HTML without
 * running JavaScript, so route-specific titles/images and `noindex` must be
 * in the HTML the server sends.
 */

const ORIGIN = 'https://goalforge.top';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

interface Meta {
  title: string;
  description: string;
  path: string;
  image: string;
  imageAlt: string;
  siteName: string;
  index: boolean;
  lang?: string;
  extra?: string;
}

function headFor(m: Meta): string {
  const url = `${ORIGIN}${m.path}`;
  const img = `${ORIGIN}${m.image}`;
  return [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta name="robots" content="${m.index ? 'index, follow, max-image-preview:large' : 'noindex, nofollow'}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${esc(m.siteName)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${esc(m.title)}" />`,
    `<meta property="og:description" content="${esc(m.description)}" />`,
    `<meta property="og:image" content="${img}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${esc(m.imageAlt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(m.title)}" />`,
    `<meta name="twitter:description" content="${esc(m.description)}" />`,
    `<meta name="twitter:image" content="${img}" />`,
    m.extra ?? '',
  ]
    .filter(Boolean)
    .join('\n    ');
}

/** Instant first paint for the gym app (and its iPhone home-screen launch). */
const GYM_SPLASH =
  '<div style="min-height:100vh;min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:#0a0b0d;color:#fff;font-family:-apple-system,system-ui,sans-serif">' +
  '<div style="width:72px;height:72px;border-radius:22px;background:#d4ff3a;display:flex;align-items:center;justify-content:center;outline:10px solid rgba(212,255,58,.08);outline-offset:6px">' +
  '<svg width="44" height="44" viewBox="20 20 60 60" aria-hidden="true"><g fill="#0a0b0d"><rect x="28" y="47" width="44" height="6" rx="2"/><rect x="30" y="35" width="6" height="30" rx="2.5"/><rect x="64" y="35" width="6" height="30" rx="2.5"/><rect x="22.5" y="40" width="5.5" height="20" rx="2.5"/><rect x="72" y="40" width="5.5" height="20" rx="2.5"/></g></svg></div>' +
  '<span dir="ltr" style="font-size:22px;font-weight:900;letter-spacing:-0.5px">GYM<span style="color:#d4ff3a">·</span>LOG</span></div>';

const GYM: Meta = {
  title: 'GYM·LOG — מעקב אימונים לחבר׳ה',
  description: 'תוכניות A/B משותפות, כל סט וכל משקל, מה עשית בפעם הקודמת וטיימר מנוחה — מותאם לאייפון.',
  path: '/gym',
  image: '/og-gym.jpg',
  imageAlt: 'GYM·LOG — כל סט. כל משקל. ביחד.',
  siteName: 'GYM·LOG',
  index: false,
  lang: 'he',
  // Read when adding to the iPhone home screen — must be in the served HTML.
  extra: [
    '<link rel="manifest" href="/gym.webmanifest" />',
    '<link rel="apple-touch-icon" href="/gym-icon-180.png" />',
    '<meta name="apple-mobile-web-app-capable" content="yes" />',
    '<meta name="mobile-web-app-capable" content="yes" />',
    '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
    '<meta name="apple-mobile-web-app-title" content="Gym" />',
  ].join('\n    '),
};

/** Routes that must never appear in search results. */
const PRIVATE = [/^\/app(\/|$)/, /^\/admin(\/|$)/, /^\/users(\/|$)/, /^\/expenses(\/|$)/, /^\/gym(\/|$)/];

export function isPrivatePath(path: string): boolean {
  return PRIVATE.some((r) => r.test(path));
}

/** Returns the HTML to serve for `path`, given the built index.html. */
export function renderIndex(html: string, path: string): string {
  const start = html.indexOf('<!--seo:start-->');
  const end = html.indexOf('<!--seo:end-->');
  if (start === -1 || end === -1) return html;

  if (/^\/gym(\/|$)/.test(path)) {
    const out = (html.slice(0, start) + headFor(GYM) + html.slice(end + '<!--seo:end-->'.length))
      .replace('<html lang="en" class="dark">', '<html lang="he" dir="rtl" class="dark">')
      .replace('<meta name="theme-color" content="#050914" />', '<meta name="theme-color" content="#0a0b0d" />')
      .replace('<body style="margin:0;background:#050914">', '<body style="margin:0;background:#0a0b0d">');
    const s0 = out.indexOf('<!--splash:start-->');
    const s1 = out.indexOf('<!--splash:end-->');
    return s0 === -1 || s1 === -1 ? out : out.slice(0, s0) + GYM_SPLASH + out.slice(s1 + '<!--splash:end-->'.length);
  }
  if (isPrivatePath(path)) {
    return html.replace(
      '<meta name="robots" content="index, follow, max-image-preview:large" />',
      '<meta name="robots" content="noindex, nofollow" />'
    );
  }
  return html;
}
