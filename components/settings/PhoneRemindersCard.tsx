'use client';
import { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import { PUSH_COPY, type Lang } from '@/lib/reminder-push';
import { CommunityError, communityCall } from '@/lib/community-client';

type State = 'checking' | 'unsupported' | 'iphone' | 'notReady' | 'blocked' | 'off' | 'on';

/** The public key the browser needs, from base64url text to bytes. */
function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/**
 * "Phone reminders" in Settings: turns the morning summary on or off for this phone. Each person turns it on per phone;
 * the browser asks for permission once. The server sends it (app/api/cron/reminders); nothing is sent on an empty day.
 */
export function PhoneRemindersCard({ lang }: { lang: Lang }) {
  const t = PUSH_COPY[lang];
  const [state, setState] = useState<State>('checking');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    void (async () => {
      const apple = /iPhone|iPad|iPod/.test(navigator.userAgent);
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) { setState(apple ? 'iphone' : 'unsupported'); return; }
      const registration = await navigator.serviceWorker.getRegistration();
      if (!publicKey || !registration) { setState('notReady'); return; }
      if (Notification.permission === 'denied') { setState('blocked'); return; }
      setState((await registration.pushManager.getSubscription()) ? 'on' : 'off');
    })().catch(() => setState('unsupported'));
  }, [publicKey]);

  const act = async (work: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await work(); }
    catch (e) { setError(e instanceof CommunityError && e.offline ? t.offline : t.failed); }
    finally { setBusy(false); }
  };

  const turnOn = () => act(async () => {
    if ((await Notification.requestPermission()) !== 'granted') { setState('blocked'); return; }
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey!) });
    try { await communityCall('/api/push', { method: 'POST', body: subscription.toJSON() }); }
    catch (e) { await subscription.unsubscribe(); throw e; } // not saved on the server: do not leave the phone half on
    setState('on');
  });

  const turnOff = () => act(async () => {
    const subscription = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
    if (subscription) {
      await communityCall('/api/push', { method: 'DELETE', body: { endpoint: subscription.endpoint } });
      await subscription.unsubscribe();
    }
    setState('off');
  });

  const note: Partial<Record<State, string>> = { on: t.on, off: t.off, unsupported: t.unsupported, iphone: t.iphone, notReady: t.notReady, blocked: t.blocked };

  return (
    <section aria-labelledby="push-heading" className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-sm space-y-3">
      <div className="flex items-start gap-3">
        <div className="icon-tile !h-11 !w-11"><BellRing className="h-5 w-5" /></div>
        <div>
          <h2 id="push-heading" className="text-base font-bold text-gray-900">{t.title}</h2>
          <p className="mt-0.5 text-sm text-gray-600">{t.intro}</p>
        </div>
      </div>
      {note[state] && <p role="status" className={`text-sm ${state === 'on' ? 'font-semibold text-sage' : 'text-charcoal-light'}`}>{note[state]}</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {state === 'off' && <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void turnOn()}>{busy ? t.working : t.turnOn}</button>}
      {state === 'on' && <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void turnOff()}>{busy ? t.working : t.turnOff}</button>}
    </section>
  );
}
