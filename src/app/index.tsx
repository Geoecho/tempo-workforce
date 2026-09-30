import { router } from 'expo-router';
import { Clock3, Plus, QrCode, TrendingUp, UsersRound, Wallet } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, Pressable, Text, View } from 'react-native';
import { formatMoney, formatTime, initialState, paySummary, payTimeLabel, today } from '../lib/data';
import { useStore } from '../lib/store';
import { Avatar, Button, Card, Pill, Screen, Section } from '../ui/components';
import { AppIcon } from '../ui/AppIcon';
import { ShiftCard } from '../ui/ShiftCard';
import { C } from '../ui/theme';

export default function Home() {
  const { role, workers, shifts, punches, selectedWorkerId, currency, notifications, workspaceName } = useStore();
  const unread = notifications.filter(item => !item.readAt).length;
  const [bellMotion] = useState(() => new Animated.Value(0));
  const [bellHovered, setBellHovered] = useState(false);
  useEffect(() => {
    if (!unread) return;
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (!active || reduced) return;
      const driver = Platform.OS !== 'web';
      Animated.sequence([
        Animated.timing(bellMotion, { toValue: -1, duration: 110, useNativeDriver: driver }),
        Animated.timing(bellMotion, { toValue: 1, duration: 170, useNativeDriver: driver }),
        Animated.spring(bellMotion, { toValue: 0, speed: 18, bounciness: 4, useNativeDriver: driver }),
      ]).start();
    }).catch(() => {});
    return () => { active = false; bellMotion.stopAnimation(); };
  }, [unread, bellMotion]);
  const worker = workers.find(w => w.id === selectedWorkerId && !w.archived) ?? workers.find(w => !w.archived) ?? { ...initialState.workers[0], name: workspaceName || 'Tempo', initials: (workspaceName || 'Tempo').slice(0, 1).toUpperCase() };
  const day = today();
  const todays = shifts.filter(s => !s.archived && s.date === day && (role === 'admin' || s.workerIds.includes(selectedWorkerId)));
  const scheduled = shifts.filter(s => !s.archived && s.date >= day && (role === 'admin' || s.workerIds.includes(selectedWorkerId))).sort((a, b) => a.date.localeCompare(b.date));
  const active = [...punches].reverse().find(p => p.workerId === selectedWorkerId);
  const isIn = active?.type === 'in';
  const myPay = paySummary(punches, worker, day);
  const teamPay = workers.reduce((sum, w) => sum + paySummary(punches, w, day).earningsCents, 0);
  return <Screen>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}><View style={{ flex: 1 }}><Text style={{ fontSize: 13, color: C.muted, fontWeight: '600' }}>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</Text><Text style={{ fontSize: 28, fontWeight: '700', letterSpacing: -.8, color: C.ink, marginTop: 5 }}>Good morning{role === 'worker' ? `, ${worker.name.split(' ')[0]}` : ''}<Text style={{ color: '#7EB59A' }}>.</Text></Text></View>{role === 'worker' && <Pressable accessibilityLabel={`${unread} unread notifications`} onHoverIn={() => setBellHovered(true)} onHoverOut={() => setBellHovered(false)} onPress={() => router.push('/notifications')} style={{ width: 43, height: 43, marginRight: 9, borderRadius: 13, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line }}><Animated.View style={{ transform: [{ rotate: bellMotion.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-13deg', '0deg', '13deg'] }) }] }}><AppIcon name="bell" size={21} color={C.green} playing={bellHovered} /></Animated.View>{unread > 0 && <View style={{ position: 'absolute', top: 5, right: 5, width: 9, height: 9, borderRadius: 5, backgroundColor: C.red }} />}</Pressable>}<Pressable accessibilityLabel="Workspace settings" onPress={() => router.push('/settings')}><Avatar worker={worker} size={43} /></Pressable></View>
    {role === 'admin' ? <>
      {!workers.some(w => !w.archived) && <Card style={{ marginBottom: 13, backgroundColor: '#F0F8F2', borderColor: '#CBE6D2' }}><Text style={{ color: C.ink, fontWeight: '800', fontSize: 17 }}>Set up your crew</Text><Text style={{ color: C.muted, fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 15 }}>Create a team, add people, then invite them to sign in. Once your crew is ready, schedule the first shift.</Text><Button label="Add your first team" small onPress={() => router.push('/team')} /></Card>}
      <Card style={{ backgroundColor: C.green, borderColor: C.green, padding: 22, overflow: 'hidden' }}><View style={{ position: 'absolute', width: 180, height: 180, borderRadius: 100, borderWidth: 35, borderColor: '#2B604E', right: -70, top: -75 }} /><Text style={{ color: '#C5E1D1', fontSize: 13, fontWeight: '600' }}>TODAY AT A GLANCE</Text><Text style={{ color: '#FFFFFF', fontSize: 32, fontWeight: '700', marginTop: 11, letterSpacing: -.6 }}>{todays.length} shifts today</Text><Text style={{ color: '#C5E1D1', fontSize: 13, marginTop: 5 }}>{todays.reduce((n, s) => n + s.workerIds.length, 0)} people scheduled across your sites</Text><View style={{ flexDirection: 'row', marginTop: 24, gap: 9 }}><Button label="Create shift" small variant="light" icon={<Plus size={16} color={C.green} />} onPress={() => router.push('/new-shift')} /><Button label="Site QR" small variant="outline" icon={<QrCode size={16} color={C.green} />} onPress={() => router.push('/pass')} /></View></Card>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}><Card style={{ flex: 1, padding: 17 }}><UsersRound size={19} color={C.green} /><Text style={{ fontSize: 24, color: C.ink, fontWeight: '700', marginTop: 12 }}>{workers.filter(w => !w.archived).length}</Text><Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Team members</Text></Card><Card style={{ flex: 1, padding: 17 }}><Wallet size={19} color={C.green} /><Text style={{ fontSize: 21, color: C.ink, fontWeight: '700', marginTop: 12 }}>{formatMoney(teamPay, currency)}</Text><Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Estimated pay today</Text></Card></View>
      <Section title="Upcoming shifts" action="See all" onAction={() => router.push('/schedule')} />{scheduled.slice(0, 3).map(s => <ShiftCard shift={s} key={s.id} compact />)}
      <Section title="Quick actions" /><View style={{ flexDirection: 'row', gap: 10 }}><Pressable style={{ flex: 1 }} onPress={() => router.push('/team')}><Card style={{ padding: 15 }}><UsersRound size={20} color={C.green} /><Text style={{ color: C.ink, fontSize: 14, fontWeight: '700', marginTop: 10 }}>Contact team  →</Text></Card></Pressable><Pressable style={{ flex: 1 }} onPress={() => router.push('/time')}><Card style={{ padding: 15 }}><TrendingUp size={20} color={C.green} /><Text style={{ color: C.ink, fontSize: 14, fontWeight: '700', marginTop: 10 }}>Review pay  →</Text></Card></Pressable></View>
    </> : <>
      <Card style={{ backgroundColor: C.green, borderColor: C.green, padding: 22 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#C5E1D1', fontSize: 13, fontWeight: '600' }}>YOUR STATUS</Text><Pill tone={isIn ? 'green' : 'gray'}>{isIn ? 'ON THE CLOCK' : 'OFF THE CLOCK'}</Pill></View><Text style={{ color: '#FFFFFF', fontSize: 30, fontWeight: '700', marginTop: 15 }}>{isIn ? 'You’re clocked in' : 'Ready for your shift?'}</Text><Text style={{ color: '#C5E1D1', fontSize: 13, marginTop: 6 }}>{isIn ? `Since ${formatTime(active.at)}` : 'Scan your site code when you arrive.'}</Text><View style={{ marginTop: 22 }}><Button label={isIn ? 'Scan to check out' : 'Scan to check in'} variant="light" icon={<QrCode size={17} color={C.green} />} onPress={() => router.push('/scan')} /></View></Card>
      <Section title="Your next shift" action="Schedule" onAction={() => router.push('/schedule')} />{scheduled[0] ? <ShiftCard shift={scheduled[0]} /> : <Card><Text style={{ color: C.muted }}>No upcoming shifts assigned.</Text></Card>}
      <Section title="Your pay today" action="View timesheet" onAction={() => router.push('/time')} /><Card><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><View><Text style={{ color: C.muted, fontSize: 12 }}>ESTIMATED EARNINGS</Text><Text style={{ color: C.ink, fontSize: 29, fontWeight: '700', marginTop: 7 }}>{formatMoney(myPay.earningsCents, currency)}</Text><Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{payTimeLabel(myPay.payableSeconds)} paid · 10h daily cap</Text></View><View style={{ width: 47, height: 47, borderRadius: 15, backgroundColor: C.mint, justifyContent: 'center', alignItems: 'center' }}><Clock3 color={C.green} size={22} /></View></View></Card>
    </>}
  </Screen>;
}
