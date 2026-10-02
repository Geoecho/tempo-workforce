import * as Notifications from './notifications';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { activeBreak, formatDay, formatTime, payConfigOf, payUnitLabel, paySummary, shiftHasEnded, today } from './data';
import { useStore } from './store';
import { useExtras } from './extras';
import { workerPayload } from './worker-code';

let debugText = 'Watch sync not started';
const debugListeners = new Set<(t: string) => void>();
const setDebug = (t: string) => { debugText = t; debugListeners.forEach(l => l(t)); };
export function useWatchDebug() {
  const [text, setText] = useState(debugText);
  useEffect(() => { debugListeners.add(setText); setText(debugText); return () => { debugListeners.delete(setText); }; }, []);
  return text;
}

export const WATCH_SCAN_NOTIFICATION = 'tempo-watch-scan';

export function WatchSync() {
  const { ready, role, selectedWorkerId, shifts, punches, breaks, workers, currency } = useStore();
  useExtras();
  const latest = useRef('');
  const active = shifts.find(shift => !shift.archived && shift.date === today() && shift.workerIds.includes(selectedWorkerId)
    && punches.filter(punch => punch.shiftId === shift.id && punch.workerId === selectedWorkerId).sort((a, b) => b.at.localeCompare(a.at))[0]?.type === 'in');
  const next = shifts.filter(shift => !shift.archived && (role === 'admin' || shift.workerIds.includes(selectedWorkerId)) && !shiftHasEnded(shift))
    .sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`))[0];
  const lastCompleted = shifts.filter(shift => !shift.archived && shift.workerIds.includes(selectedWorkerId) && shift.date === today()
    && punches.some(punch => punch.shiftId === shift.id && punch.workerId === selectedWorkerId && punch.type === 'out'))[0];
  const shift = active ?? next ?? lastCompleted;
  const onBreak = active ? activeBreak(breaks, punches, active.id, selectedWorkerId) : null;
  const status = onBreak ? 'onBreak' : active ? 'onShift' : next ? 'upcoming' : lastCompleted ? 'complete' : 'none';
  const worker = workers.find(w => w.id === selectedWorkerId);
  const lastPunch = role === 'worker' ? punches.filter(p => p.workerId === selectedWorkerId).sort((a, b) => a.at.localeCompare(b.at)).at(-1) : undefined;
  const lastPunchShift = lastPunch ? shifts.find(sh => sh.id === lastPunch.shiftId) : undefined;
  const seenPunch = useRef<string | null | undefined>(undefined);
  const sendEvent = useRef<((info: Record<string, unknown>) => void) | null>(null);
  const pay = role === 'worker' && worker && (active || status === 'complete') ? paySummary(punches, worker, today()) : null;
  const qrBits = useMemo(() => {
    if (role !== 'worker' || !selectedWorkerId) return { qrSize: 0, qrBits: '' };
    try {
      const matrix = require('qrcode/lib/core/qrcode').create(workerPayload(selectedWorkerId), { errorCorrectionLevel: 'M' }).modules;
      return { qrSize: matrix.size as number, qrBits: Array.from(matrix.data as ArrayLike<number>).map(v => (v ? '1' : '0')).join('') };
    } catch { return { qrSize: 0, qrBits: '' }; }
  }, [role, selectedWorkerId]);
  const base = {
    status,
    title: shift?.title ?? 'No shifts',
    site: shift?.site ?? '',
    time: status === 'upcoming' && shift ? shift.start : '',
    note: shift ? `${formatDay(shift.date)} · ${shift.start}–${shift.end}` : '',
    running: status === 'onShift',
    rate: worker ? (payConfigOf(worker.id).type === 'hourly' ? worker.hourlyRate : payConfigOf(worker.id).amount) : 0,
    ...qrBits,
    unit: worker ? payUnitLabel(payConfigOf(worker.id).type) : 'hour',
    currency,
  };
  latest.current = JSON.stringify({ ...base, worked: pay?.actualSeconds ?? 0, earned: pay?.earningsCents ?? 0, has: !!pay, at: Date.now() });
  const key = `${JSON.stringify(base)}:${pay?.actualMinutes ?? 0}`;

  useEffect(() => {
    if (!ready) return;
    if (seenPunch.current === undefined) { seenPunch.current = lastPunch?.id ?? null; return; }
    if (!lastPunch || seenPunch.current === lastPunch.id) return;
    seenPunch.current = lastPunch.id;
    // Only react to fresh punches (not a sync of old history).
    if (Date.now() - new Date(lastPunch.at).getTime() > 2 * 60_000) return;
    sendEvent.current?.({
      event: lastPunch.type,
      eventId: lastPunch.id,
      eventTitle: lastPunch.type === 'in' ? 'Checked in' : 'Checked out',
      eventBody: `${formatTime(lastPunch.at)}${lastPunchShift ? ' · ' + lastPunchShift.title : ''}`,
    });
  }, [ready, lastPunch?.id]);

  useEffect(() => {
    if (!ready) return setDebug('Watch: app still loading');
    if (Platform.OS !== 'ios') return setDebug('Watch: iOS only');
    if (Constants.executionEnvironment === 'storeClient') return setDebug('Watch: not available in Expo Go');
    let cancelled = false;
    let removeListener: (() => void) | undefined;
    void (async () => {
      const { requireNativeModule } = await import('expo-modules-core');
      const native: any = requireNativeModule('ExpoWatchConnectivity');
      if (!native) throw new Error('native module ExpoWatchConnectivity missing from this build');
      const WatchConnectivity = {
        get isSupported(): boolean { return native.isSupported(); },
        get sessionState(): any { return native.getSessionState(); },
        activate: () => native.activate(),
        updateApplicationContext: (c: Record<string, unknown>) => native.updateApplicationContext(c),
        transferUserInfo: (c: Record<string, unknown>) => native.transferUserInfo(c),
        sendMessage: (c: Record<string, unknown>) => native.sendMessage(c),
        replyToMessage: (id: string, r: Record<string, unknown>) => native.replyToMessage(id, r),
        addActivationListener: (cb: (e: { activationState: string }) => void) => native.addListener('onActivationDidComplete', cb),
        addMessageListener: (cb: (e: { message: Record<string, unknown>; replyId?: string }) => void) => native.addListener('onMessageReceived', cb),
      };
      if (!WatchConnectivity.isSupported) return setDebug('Watch: not supported on this device');
      setDebug('Watch: module loaded, activating');
      let lastInfo = '';
      const report = (extra: string) => { try { const st = WatchConnectivity.sessionState as any; setDebug(`Watch: ${st.activationState}, paired ${st.isPaired}, app installed ${st.isWatchAppInstalled}, reachable ${st.isReachable}${extra ? ' · ' + extra : ''}`); } catch (e) { setDebug('Watch: state error ' + String(e)); } };
      const publish = () => {
        report('');
        if (!cancelled && WatchConnectivity.sessionState.activationState === 'activated') {
          const current = latest.current;
          const payload = JSON.parse(current);
          void WatchConnectivity.updateApplicationContext(payload).catch((e: any) => { console.warn('[watch] context failed', e); report('send failed: ' + String((e as Error)?.message ?? e)); });
          try { if (lastInfo !== current) { lastInfo = current; WatchConnectivity.transferUserInfo(payload); } } catch (e) { console.warn('[watch] userInfo failed', e); }
          if (WatchConnectivity.sessionState.isReachable) void WatchConnectivity.sendMessage(payload).catch(() => {});
        }
      };
      const activation = WatchConnectivity.addActivationListener(({ activationState }) => {
        if (activationState === 'activated') publish();
      });
      const subscription = WatchConnectivity.addMessageListener(({ message, replyId }) => {
        if (message.action !== 'openScanner') return;
        const reply = (text: string) => { if (replyId) WatchConnectivity.replyToMessage(replyId, { message: text }); };
        if (AppState.currentState === 'active') {
          router.push(role === 'worker' ? '/scan' : '/scan-worker');
          return reply('Scanner opened on iPhone');
        }
        if (role !== 'worker') return reply('Open Tempo on iPhone');
        void Notifications.requestPermissionsAsync().catch(() => null).then(() => Notifications.scheduleNotificationAsync({
          content: { title: 'Scan your site code', body: 'Tap to open the Tempo scanner on iPhone.', data: { kind: WATCH_SCAN_NOTIFICATION }, sound: true, interruptionLevel: 'timeSensitive' },
          trigger: null,
        })).then(() => reply('Tap the iPhone notification')).catch(() => reply('Open Tempo on iPhone to scan'));
      });
      sendEvent.current = info => {
        if (WatchConnectivity.sessionState.activationState !== 'activated') return;
        const payload = { ...JSON.parse(latest.current), ...info };
        try { WatchConnectivity.transferUserInfo(payload); } catch (e) { console.warn('[watch] event failed', e); }
        void WatchConnectivity.updateApplicationContext(JSON.parse(latest.current)).catch(() => {});
        if (WatchConnectivity.sessionState.isReachable) void WatchConnectivity.sendMessage(payload).catch(() => {});
      };
      const timer = setInterval(publish, 15000);
      removeListener = () => { sendEvent.current = null; activation.remove(); subscription.remove(); clearInterval(timer); };
      await WatchConnectivity.activate();
      publish();
    })().catch(e => { console.warn('[watch] unavailable', e); setDebug('Watch: module error ' + String((e as Error)?.message ?? e)); });
    return () => { cancelled = true; removeListener?.(); };
  }, [ready, role, key]);
  return null;
}
