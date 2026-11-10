import { gym } from './gym';

/**
 * Lock-screen notifications via Web Push.
 * iPhone rule (iOS 16.4+): only works when the app was added to the Home
 * Screen and opened from there; plain Safari tabs can't receive pushes.
 */
export type PushState = 'unsupported' | 'needs-install' | 'denied' | 'off' | 'on';

const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

function base64UrlToBytes(s: string): ArrayBuffer {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buf;
}

/** Never let a stuck browser push service hang the UI. */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error('timeout')), ms);
    p.then(
      (v) => {
        window.clearTimeout(t);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(t);
        reject(e);
      }
    );
  });
}

async function registration(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register('/gym-sw.js', { scope: '/gym' });
}

export async function getPushState(): Promise<PushState> {
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (!supported) return isIOS() && !isStandalone() ? 'needs-install' : 'unsupported';
  if (isIOS() && !isStandalone()) return 'needs-install';
  if (Notification.permission === 'denied') return 'denied';
  try {
    const reg = await registration();
    const sub = await reg.pushManager.getSubscription();
    return sub && Notification.permission === 'granted' ? 'on' : 'off';
  } catch {
    return 'unsupported';
  }
}

/** Must be called from a tap (iOS only shows the permission prompt then). */
export async function enablePush(): Promise<PushState> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';
  const reg = await registration();
  const { publicKey } = await gym.pushKey();
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await withTimeout(
      reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(publicKey) }),
      15_000
    ));
  await gym.pushSubscribe(sub.toJSON());
  return 'on';
}

export async function disablePush(): Promise<PushState> {
  const reg = await registration();
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await gym.pushUnsubscribe(sub.endpoint).catch(() => undefined);
    await sub.unsubscribe();
  }
  return 'off';
}
