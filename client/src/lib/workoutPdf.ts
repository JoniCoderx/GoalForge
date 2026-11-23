/**
 * Workout summary → PDF, entirely in the browser.
 * Pages are drawn on a canvas (so Hebrew/RTL renders exactly like the app)
 * and embedded as JPEG images in a tiny hand-written PDF — no libraries.
 */
import { fmtDate, fmtDuration, fmtKg, fmtTime, gym, type Session, type SessionItem } from './gym';

const W = 1240; // A4 at 150 dpi
const H = 1754;
const M = 80;
const LIME = '#d4ff3a';
const FONT = "'Rubik Variable', 'Rubik', -apple-system, system-ui, sans-serif";

interface Data {
  session: Session;
  items: SessionItem[];
}

function newPage() {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  g.fillStyle = '#0a0b0d';
  g.fillRect(0, 0, W, H);
  g.direction = 'rtl';
  g.textBaseline = 'alphabetic';
  return { c, g };
}

function text(g: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string, weight = 700, align: CanvasTextAlign = 'right') {
  g.font = `${weight} ${size}px ${FONT}`;
  g.fillStyle = color;
  g.textAlign = align;
  g.fillText(s, x, y);
}

function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fillStyle = fill;
  g.fill();
}

const done = (it: SessionItem) => it.sets.filter((s) => s.done || (s.weight != null && s.reps != null));

/** Draws all pages; returns JPEG data for each. */
async function drawPages({ session, items }: Data, memberName: string): Promise<Uint8Array[]> {
  await document.fonts.ready;
  const pages: HTMLCanvasElement[] = [];
  let { c, g } = newPage();
  let y = 0;

  // Header
  rr(g, 0, 0, W, 300, 0, '#121418');
  g.save();
  g.direction = 'ltr';
  text(g, 'GYM·LOG', M, 120, 64, '#fff', 900, 'left');
  g.restore();
  text(g, session.planName || `אימון ${session.planKey}`, W - M, 120, 64, LIME, 900);
  text(g, `${memberName} · ${fmtDate(session.startedAt)} · ${fmtTime(session.startedAt)}`, W - M, 190, 34, 'rgba(255,255,255,0.65)', 500);

  const logged = items.map(done);
  const sets = logged.reduce((a, s) => a + s.length, 0);
  const volume = Math.round(logged.flat().reduce((a, s) => a + (s.weight ?? 0) * (s.reps ?? 0), 0));
  const stats: [string, string][] = [
    [session.endedAt ? fmtDuration(session.startedAt, session.endedAt) : '—', 'משך'],
    [String(items.filter((_, i) => logged[i].length).length), 'תרגילים'],
    [String(sets), 'סטים'],
    [`${volume.toLocaleString('en-US')} ק״ג`, 'נפח כולל'],
  ];
  const bw = (W - 2 * M - 3 * 24) / 4;
  stats.forEach(([v, l], i) => {
    const x = W - M - (i + 1) * bw - i * 24;
    rr(g, x, 330, bw, 150, 28, '#16181c');
    text(g, v, x + bw / 2, 405, 44, '#fff', 900, 'center');
    text(g, l, x + bw / 2, 455, 26, 'rgba(255,255,255,0.5)', 600, 'center');
  });
  y = 540;

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const s = logged[i];
    if (!s.length) continue;
    const rows = Math.ceil(s.length / 3);
    const h = 110 + rows * 120;
    if (y + h > H - 120) {
      pages.push(c);
      ({ c, g } = newPage());
      y = M;
    }
    rr(g, M, y, W - 2 * M, h, 32, '#16181c');
    text(g, it.name, W - M - 40, y + 70, 42, '#fff', 800);
    const best = Math.max(...s.map((x) => x.weight ?? 0));
    if (best > 0) {
      g.save();
      g.direction = 'ltr';
      text(g, `${fmtKg(best)} kg max`, M + 40, y + 70, 30, LIME, 700, 'left');
      g.restore();
    }
    const cw = (W - 2 * M - 80 - 2 * 16) / 3;
    s.forEach((set, j) => {
      const col = j % 3;
      const row = Math.floor(j / 3);
      const x = W - M - 40 - (col + 1) * cw - col * 16;
      const yy = y + 100 + row * 120;
      rr(g, x, yy, cw, 104, 20, '#0f1013');
      text(g, `סט ${j + 1}`, x + cw - 22, yy + 38, 24, 'rgba(255,255,255,0.45)', 600);
      g.save();
      g.direction = 'ltr';
      text(g, `${set.weight != null ? fmtKg(set.weight) : '–'} kg × ${set.reps ?? '–'}`, x + cw / 2, yy + 84, 38, '#fff', 800, 'center');
      g.restore();
    });
    y += h + 24;
  }
  pages.push(c);

  // Footer on every page
  pages.forEach((p, i) => {
    const pg = p.getContext('2d')!;
    pg.direction = 'rtl';
    text(pg, 'נוצר ב-GYM·LOG · goalforge.top/gym', W - M, H - 50, 24, 'rgba(255,255,255,0.35)', 500);
    if (pages.length > 1) text(pg, `${i + 1}/${pages.length}`, M, H - 50, 24, 'rgba(255,255,255,0.35)', 500, 'left');
  });

  return Promise.all(
    pages.map(
      (p) =>
        new Promise<Uint8Array>((res, rej) =>
          p.toBlob((b) => (b ? b.arrayBuffer().then((a) => res(new Uint8Array(a))) : rej(new Error('canvas'))), 'image/jpeg', 0.9)
        )
    )
  );
}

/** Minimal valid PDF: one full-page JPEG per page. */
function jpegsToPdf(jpegs: Uint8Array[]): Blob {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let len = 0;
  const push = (b: Uint8Array | string) => {
    const u = typeof b === 'string' ? enc.encode(b) : b;
    parts.push(u);
    len += u.length;
  };
  const obj = (n: number, body: string | (() => void)) => {
    offsets[n] = len;
    push(`${n} 0 obj\n`);
    if (typeof body === 'string') push(body);
    else body();
    push('\nendobj\n');
  };
  const pw = 595.28;
  const ph = 841.89; // A4 in points
  const n = jpegs.length;
  // 1 catalog, 2 pages, then per page: page, image, content
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  const kids = jpegs.map((_, i) => `${3 + i * 3} 0 R`).join(' ');
  obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${n} >>`);
  jpegs.forEach((jpg, i) => {
    const p = 3 + i * 3;
    obj(p, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im0 ${p + 1} 0 R >> >> /Contents ${p + 2} 0 R >>`);
    obj(p + 1, () => {
      push(`<< /Type /XObject /Subtype /Image /Width ${W} /Height ${H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`);
      push(jpg);
      push('\nendstream');
    });
    const cs = `q ${pw} 0 0 ${ph} 0 0 cm /Im0 Do Q`;
    obj(p + 2, `<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`);
  });
  const xref = len;
  const total = 3 + n * 3;
  let x = `xref\n0 ${total}\n0000000000 65535 f \n`;
  for (let i = 1; i < total; i++) x += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  push(x);
  push(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts as BlobPart[], { type: 'application/pdf' });
}

/** Builds the PDF for a session (call ahead of time; sharing must follow a tap directly). */
export async function buildWorkoutPdf(sessionId: string, memberName: string): Promise<File> {
  const data = await gym.session(sessionId);
  const jpegs = await drawPages(data, memberName);
  const d = new Date(data.session.startedAt);
  const name = `GYM-LOG ${data.session.planKey} ${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}.pdf`;
  return new File([jpegsToPdf(jpegs)], name, { type: 'application/pdf' });
}

/** Opens the iPhone share sheet (WhatsApp, Mail, Files…); falls back to a download. */
export async function sharePdf(file: File): Promise<'shared' | 'downloaded' | 'cancelled'> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}
