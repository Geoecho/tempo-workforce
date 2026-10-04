import { router } from 'expo-router';
import { Bell, CalendarDays, CheckCheck, ChevronRight, CheckCircle2, LogIn, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { Pressable } from '../ui/LocalizedPressable';
import { Text } from '../ui/LocalizedText';
import { useStore } from '../lib/store';
import { Language, useLanguage } from '../lib/i18n';
import { Card, Screen } from '../ui/components';
import { useTheme } from '../ui/theme';
import { NotificationTabs } from '../ui/NotificationTabs';


function dateGroup(value: string, language: Language) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(language, { month: 'long', day: 'numeric', ...(date.getFullYear() !== today.getFullYear() ? { year: 'numeric' as const } : {}) });
}

export default function Notifications() {
  const C = useTheme().colors;
  const { language, t } = useLanguage();
  const { notifications, markNotificationRead, markNotificationsRead, dismissNotification, shifts, role } = useStore();
  const operation = useRef(false);
  const navigating = useRef(false);
  const navigationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (navigationTimer.current) clearTimeout(navigationTimer.current); }, []);
  const [optimisticRead, setOptimisticRead] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<string[]>([]);
  const [marking, setMarking] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [limit, setLimit] = useState(30);
  const effective = useMemo(() => {
    const read = new Set(optimisticRead);
    return notifications.map(item => read.has(item.id) ? { ...item, readAt: item.readAt ?? 'pending' } : item);
  }, [notifications, optimisticRead]);
  const unread = useMemo(() => effective.filter(item => !item.readAt), [effective]);
  const ordered = useMemo(() => effective.filter(item => filter === 'all' || !item.readAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [effective, filter]);
  const availableShifts = useMemo(() => new Set(shifts.filter(shift => !shift.archived).map(shift => shift.id)), [shifts]);
  const groups = useMemo(() => {
    const result = new Map<string, typeof ordered>();
    for (const item of ordered.slice(0, limit)) {
      const key = new Date(item.createdAt).toDateString();
      const group = result.get(key);
      if (group) group.push(item); else result.set(key, [item]);
    }
    return [...result.values()];
  }, [ordered, limit]);
  const changeFilter = (value: 'all' | 'unread') => { setFilter(value); setLimit(30); };
  const open = async (id: string, shiftId: string) => {
    if (operation.current || navigating.current) return;
    operation.current = true;
    setPending(current => [...current, id]);
    try {
      setError('');
      if (!notifications.find(item => item.id === id)?.readAt) await markNotificationRead(id);
      if (notifications.find(item => item.id === id)?.kind === 'task-completed') { router.navigate({ pathname: '/tasks', params: { taskId: shiftId.replace(/^task:/, '') } }); }
      else if (shifts.some(shift => shift.id === shiftId && !shift.archived)) { navigating.current = true; navigationTimer.current = setTimeout(() => { navigating.current = false; }, 1000); router.navigate(`/shift/${shiftId}` as never); }
    } catch { setError('Could not open this notification. Please try again.'); }
    finally { operation.current = false; setPending(current => current.filter(item => item !== id)); }
  };
  const dismiss = async (id: string) => {
    if (operation.current) return;
    operation.current = true;
    setError('');
    setPending(current => [...current, id]);
    try { await dismissNotification(id); }
    catch { setError('Could not remove this notification. Please try again.'); }
    finally { operation.current = false; setPending(current => current.filter(item => item !== id)); }
  };
  const markAll = async () => {
    if (operation.current || !unread.length) return;
    operation.current = true;
    const ids = unread.map(item => item.id);
    setOptimisticRead(ids);
    setError('');
    setMarking(true);
    try { await markNotificationsRead(ids); }
    catch { setError('Some notifications could not be marked as read. Please try again.'); }
    finally { operation.current = false; setOptimisticRead([]); setMarking(false); }
  };
  return <Screen back focused={false} title="Notifications" subtitle={role === 'admin' ? 'Attendance and task updates from your team, in one place.' : 'Stay up to date with your shifts.'}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 24 }}>
      <NotificationTabs value={filter} unread={unread.length} onChange={changeFilter} />
      {unread.length > 0 && <Pressable accessibilityRole="button" disabled={marking || pending.length > 0} onPress={() => void markAll()} style={({ pressed }) => ({ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, opacity: marking || pressed ? .5 : 1 })}><CheckCheck size={18} color={C.green} /><Text style={{ color: C.green, fontSize: 13, fontWeight: '600' }}>{marking ? 'Marking as read…' : 'Mark all read'}</Text></Pressable>}
    </View>
    {!!error && <Text accessibilityRole="alert" style={{ color: C.red, marginBottom: 16 }}>{error}</Text>}
    <View>{groups.map(items => <View key={items[0].id} style={{ marginBottom: 24 }}>
      <Text accessibilityRole="header" style={{ color: C.muted, fontSize: 12, fontWeight: '600', marginBottom: 12 }}>{dateGroup(items[0].createdAt, language)}</Text>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {items.map((item, index) => {
          const task = item.kind === 'task-completed';
          const available = task || availableShifts.has(item.shiftId);
          const busy = marking || pending.includes(item.id);
          const Icon = task ? CheckCircle2 : item.kind === 'clocked-in' ? LogIn : item.kind === 'removed' ? Bell : CalendarDays;
          return <View key={item.id} style={{ flexDirection: 'row', alignItems: 'flex-start', borderTopWidth: index ? 1 : 0, borderColor: C.line }}>
            <Pressable accessibilityRole="button" accessibilityLabel={`${item.readAt ? '' : t('Unread.') + ' '}${t(item.title)}. ${item.body}. ${t(task ? 'View tasks' : available ? 'View shift' : 'Shift no longer available')}`} disabled={busy} onPress={() => void open(item.id, item.shiftId)} style={({ pressed }) => ({ flex: 1, minWidth: 0, flexDirection: 'row', gap: 14, padding: 18, paddingRight: 0, backgroundColor: pressed ? C.subtle : 'transparent', opacity: busy ? .5 : 1 })}>
              <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: item.readAt ? C.subtle : C.mint, alignItems: 'center', justifyContent: 'center' }}><Icon size={20} color={item.readAt ? C.muted : C.green} />{!item.readAt && <View style={{ position: 'absolute', right: -2, top: -2, width: 10, height: 10, borderRadius: 5, backgroundColor: C.green, borderWidth: 2, borderColor: C.surface }} />}</View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: C.ink, fontSize: 15, lineHeight: 21, fontWeight: item.readAt ? '500' : '700' }}>{item.title}</Text>
                <Text style={{ color: C.muted, fontSize: 13, lineHeight: 20, marginTop: 4 }}>{item.body}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 10 }}>
                  <Text style={{ color: C.muted, fontSize: 11 }}>{new Date(item.createdAt).toLocaleTimeString(language, { hour: 'numeric', minute: '2-digit' })}</Text>
                  {available ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><Text style={{ color: C.green, fontSize: 12, fontWeight: '600' }}>{task ? 'View tasks' : 'View shift'}</Text><ChevronRight size={13} color={C.green} /></View> : <Text style={{ color: C.muted, fontSize: 11 }}>Shift no longer available</Text>}
                </View>
              </View>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Dismiss notification: ${item.title}`} disabled={busy} onPress={() => void dismiss(item.id)} style={({ pressed }) => ({ width: 44, height: 44, margin: 7, marginLeft: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: pressed ? C.subtle : 'transparent', opacity: busy ? .4 : 1 })}><X size={16} color={C.muted} /></Pressable>
          </View>;
        })}
      </Card>
    </View>)}
    {!ordered.length && <Card style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 }}>
      <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>{filter === 'unread' ? <CheckCheck size={28} color={C.green} /> : <Bell size={28} color={C.green} />}</View>
      <Text style={{ color: C.ink, fontSize: 21, fontWeight: '600', textAlign: 'center' }}>{filter === 'unread' ? 'All caught up' : 'A quiet moment'}</Text>
      <Text style={{ color: C.muted, fontSize: 14, lineHeight: 22, textAlign: 'center', maxWidth: 320, marginTop: 8 }}>{filter === 'unread' ? 'You’ve read every update. Your notifications are still in All.' : role === 'admin' ? 'When your team clocks in, their updates will appear here.' : 'New assignments and shift changes will appear here.'}</Text>
      {filter === 'unread' && <Pressable accessibilityRole="button" onPress={() => changeFilter('all')} style={{ minHeight: 44, justifyContent: 'center', marginTop: 16, paddingHorizontal: 16 }}><Text style={{ color: C.green, fontWeight: '600', fontSize: 14 }}>View all notifications</Text></Pressable>}
    </Card>}
    {ordered.length > limit && <Pressable accessibilityRole="button" onPress={() => setLimit(current => current + 30)} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}><Text style={{ color: C.green, fontWeight: '600' }}>View more notifications</Text></Pressable>}
    </View>
  </Screen>;
}
