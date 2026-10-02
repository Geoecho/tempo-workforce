import { router } from 'expo-router';
import { Clock3, IdCard, Plus, QrCode, ScanLine, TrendingUp, UsersRound, Wallet } from 'lucide-react-native';
import React, { useState } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';
import { Pressable } from '../ui/LocalizedPressable';
import { Text } from '../ui/LocalizedText';
import { activeBreak, formatDay, formatMoney, formatTime, initialState, paySummary, payTimeLabel, today } from '../lib/data';
import { useStore } from '../lib/store';
import { TaskList } from '../ui/extras-ui';
import { useLanguage } from '../lib/i18n';
import { Button, Card, Empty, Pill, Screen, Section } from '../ui/components';
import { ShiftCard } from '../ui/ShiftCard';
import { ContentGrid } from '../ui/ContentGrid';
import { useTheme } from '../ui/theme';
import { BrandMark } from '../ui/Brand';

export default function Home() {
  const C = useTheme().colors;
  const { language, t } = useLanguage();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= 1200;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const { role, workers, shifts, punches, breaks, toggleBreak, selectedWorkerId, currency, workspaceName } = useStore();
  const [breakBusy, setBreakBusy] = useState(false);
  const [breakMessage, setBreakMessage] = useState('');
  const worker = workers.find(w => w.id === selectedWorkerId && !w.archived) ?? workers.find(w => !w.archived) ?? { ...initialState.workers[0], name: workspaceName || 'Tempo', initials: (workspaceName || 'Tempo').slice(0, 1).toUpperCase() };
  const day = today();
  const todays = shifts.filter(s => !s.archived && s.date === day && (role === 'admin' || s.workerIds.includes(selectedWorkerId)));
  const scheduled = shifts.filter(s => !s.archived && s.date >= day && (role === 'admin' || s.workerIds.includes(selectedWorkerId))).sort((a, b) => a.date.localeCompare(b.date));
  const active = [...punches].reverse().find(p => p.workerId === selectedWorkerId);
  const isIn = active?.type === 'in' && shifts.some(shift => shift.id === active.shiftId && shift.date === day && !shift.archived);
  const onBreak = isIn && active ? activeBreak(breaks, punches, active.shiftId, selectedWorkerId) : null;
  const changeBreak = async () => {
    if (!isIn || !active || breakBusy) return;
    setBreakBusy(true);
    const result = await toggleBreak(active.shiftId);
    setBreakMessage(result.message);
    setBreakBusy(false);
  };
  const myPay = paySummary(punches, worker, day);
  const teamPay = workers.reduce((sum, w) => sum + paySummary(punches, w, day).earningsCents, 0);
  const quickActions = <Card style={{ minHeight: desktop ? 220 : undefined, padding: 0, overflow: 'hidden' }}><View style={{ paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.line }}><Text style={{ color: C.ink, fontSize: 16, fontWeight: '500' }}>{t('Quick actions')}</Text></View><Pressable onPress={() => router.push('/team')} style={{ paddingHorizontal: 20, paddingVertical: 17, flexDirection: 'row', alignItems: 'center', gap: 13, borderBottomWidth: 1, borderBottomColor: C.line }}><UsersRound size={19} color={C.green} /><Text style={{ color: C.ink, fontSize: 14, flex: 1 }}>Contact team</Text><Text style={{ color: C.muted }}>→</Text></Pressable><Pressable onPress={() => router.push('/time')} style={{ paddingHorizontal: 20, paddingVertical: 17, flexDirection: 'row', alignItems: 'center', gap: 13 }}><TrendingUp size={19} color={C.green} /><Text style={{ color: C.ink, fontSize: 14, flex: 1 }}>Review pay</Text><Text style={{ color: C.muted }}>→</Text></Pressable></Card>;
  return <Screen title={`${t(greeting)}${role === 'worker' ? ', ' + worker.name.split(' ')[0] : ''}.`} subtitle={new Date().toLocaleDateString(language, { weekday: 'long', month: 'long', day: 'numeric' })}>
    {role === 'admin' ? <>
      <Card style={{ backgroundColor: C.green, borderColor: C.green, padding: desktop ? 30 : 24, marginBottom: 20, overflow: 'hidden' }}>
        <View pointerEvents="none" style={{ position: 'absolute', right: -20, top: -10, opacity: .08 }}><Wallet size={170} color={C.onGreen} /></View>
        <Text style={{ color: C.onGreen, fontSize: 12, opacity: .85 }}>{t('Estimated pay today')}</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} style={{ color: C.onGreen, fontSize: desktop ? 48 : 40, letterSpacing: -1.4, marginTop: 8 }}>{formatMoney(teamPay, currency)}</Text>
        <Text style={{ color: C.onGreen, fontSize: 12, opacity: .85, marginTop: 10 }}>{todays.length} {t('scheduled today').toLowerCase()} · {workers.filter(w => !w.archived).length} {t('Team members').toLowerCase()}</Text>
      </Card>
      <View style={{ flexDirection: desktop ? 'row' : 'column', gap: desktop ? 20 : 0, alignItems: 'stretch' }}><View style={{ flex: desktop ? 1.5 : undefined, minWidth: 0 }}><Card style={{ minHeight: desktop ? 220 : undefined, backgroundColor: C.mint, borderColor: C.line, padding: desktop ? 28 : 23, overflow: 'hidden' }}><View pointerEvents="none" style={{ position: 'absolute', opacity: .06, right: -13, top: -15 }}><BrandMark size={200} /></View><View style={{ maxWidth: 460 }}><Text style={{ color: C.green, fontSize: 25, letterSpacing: -.8 }}>{t('Keep the day moving.')}</Text><Text style={{ color: C.muted, fontSize: 13, lineHeight: 21, marginTop: 9 }}>{t('Plan the next shift or open the site code for your crew.')}</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 23, alignSelf: 'stretch' }}><View style={{ flexGrow: 1, flexBasis: 140 }}><Button label="Create shift" small icon={<Plus size={16} color={C.onGreen} />} onPress={() => router.push('/new-shift')} /></View><View style={{ flexGrow: 1, flexBasis: 140 }}><Button label="Site QR" small variant="outline" icon={<QrCode size={16} color={C.green} />} onPress={() => router.push('/pass')} /></View><View style={{ flexGrow: 1, flexBasis: 140 }}><Button label="Scan worker" small variant="outline" icon={<ScanLine size={16} color={C.green} />} onPress={() => router.push('/scan-worker')} /></View></View></View></Card></View>{desktop && <View style={{ flex: 1, minWidth: 0 }}>{quickActions}</View>}</View>
      {!workers.some(w => !w.archived) && <Card style={{ marginTop: 15 }}><Text style={{ color: C.ink, fontSize: 17 }}>{t('Set up your crew')}</Text><Text style={{ color: C.muted, fontSize: 13, lineHeight: 21, marginTop: 8, marginBottom: 18 }}>Create a team, add people, then invite them to sign in. Once your crew is ready, schedule the first shift.</Text><Button label="Add your first team" small onPress={() => router.push('/team')} /></Card>}
      <Section title="Upcoming shifts" action="See all" onAction={() => router.push('/schedule')} />
      {scheduled.length ? [...new Set(scheduled.map(s => s.date))].slice(0, 4).map(d => { const list = scheduled.filter(s => s.date === d).sort((a, b) => a.start.localeCompare(b.start)); const tm = new Date(); tm.setDate(tm.getDate() + 1); const tomorrow = `${tm.getFullYear()}-${String(tm.getMonth() + 1).padStart(2, '0')}-${String(tm.getDate()).padStart(2, '0')}`; return <View key={d} style={{ marginBottom: 8 }}><View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 6, marginBottom: 10 }}><Text style={{ color: C.ink, fontSize: 15, fontWeight: '600' }}>{d === day ? t('Today') : d === tomorrow ? t('Tomorrow') : formatDay(d)}</Text><Text style={{ color: C.muted, fontSize: 12 }}>{list.length} {t('Shifts').toLowerCase()}</Text></View><ContentGrid>{list.map(sh => <ShiftCard key={sh.id} shift={sh} compact />)}</ContentGrid></View>; }) : <Empty title="No upcoming shifts" detail="Create your first shift to start planning." />}
      {!desktop && <View style={{ marginTop: 18 }}>{quickActions}</View>}
    </> : <>
      <Card style={{ backgroundColor: C.mint, borderColor: C.line, padding: desktop ? 30 : 24, marginBottom: 14 }}>
        <Text style={{ color: C.muted, fontSize: 12, lineHeight: 17, flexShrink: 1 }}>{t('Estimated earnings')} · {t('Your pay today').toLowerCase()}</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} style={{ color: C.green, fontSize: desktop ? 48 : 40, letterSpacing: -1.4, marginTop: 8 }}>{formatMoney(myPay.earningsCents, currency)}</Text>
        <View style={{ marginTop: 14, gap: 10 }}><View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 7 }}><Clock3 color={C.green} size={16} style={{ marginTop: 1 }} /><Text style={{ color: C.muted, fontSize: 12, lineHeight: 17, flex: 1, flexShrink: 1 }}>{payTimeLabel(myPay.payableSeconds)} {t('paid')} · {t('10h daily cap')}</Text></View><Pressable accessibilityRole="button" onPress={() => router.push('/time')} style={{ alignSelf: 'flex-start', minHeight: 36, justifyContent: 'center' }}><Text style={{ color: C.green, fontSize: 13, fontWeight: '500', flexShrink: 1 }}>{t('View timesheet')} →</Text></Pressable></View>
      </Card>
      <Card style={{ backgroundColor: C.green, borderColor: C.green, padding: desktop ? 30 : 24, overflow: 'hidden' }}><View pointerEvents="none" style={{ position: 'absolute', right: -25, top: 45, opacity: .08 }}><BrandMark size={185} color={C.onGreen} /></View><View style={{ alignItems: 'flex-start' }}><Pill tone={isIn ? 'green' : 'gray'}>{t(onBreak ? 'PAID BREAK' : isIn ? 'ON THE CLOCK' : 'OFF THE CLOCK')}</Pill></View><Text style={{ color: C.onGreen, fontSize: 30, fontWeight: '400', letterSpacing: -.9, marginTop: 23 }}>{t(onBreak ? 'Take your break.' : isIn ? 'You’re clocked in' : 'Ready for your shift?')}</Text><Text style={{ color: C.onGreen, fontSize: 13, lineHeight: 21, marginTop: 10 }}>{onBreak ? 'Break started ' + formatTime(onBreak.at) + ' · Time remains paid' : isIn && active ? 'Since ' + formatTime(active.at) : t('Scan your site code when you arrive.')}</Text><View style={{ marginTop: 26 }}><Button label={isIn ? 'Scan to check out' : 'Scan to check in'} variant="light" icon={<QrCode size={17} color={C.green} />} onPress={() => router.push('/scan')} /></View><Pressable accessibilityRole="button" onPress={() => router.push('/my-code')} style={{ alignItems: 'center', paddingVertical: 12, marginTop: 4, flexDirection: 'row', justifyContent: 'center', gap: 7 }}><IdCard size={15} color={C.onGreen} /><Text style={{ color: C.onGreen, fontSize: 13 }}>{t('Show my ID code')}</Text></Pressable>{isIn && <Pressable accessibilityRole="button" disabled={breakBusy} onPress={() => void changeBreak()} style={{ alignItems: 'center', paddingVertical: 14, marginTop: 8 }}><Text style={{ color: C.onGreen, fontSize: 13 }}>{t(breakBusy ? 'Saving…' : onBreak ? 'End paid break' : 'Start paid break')}</Text></Pressable>}{!!breakMessage && <Text style={{ color: C.onGreen, fontSize: 11, textAlign: 'center' }}>{breakMessage}</Text>}</Card>
      <View style={{ flexDirection: desktop ? 'row' : 'column', gap: desktop ? 25 : 0 }}><View style={{ flex: 1 }}><Section title="Your next shift" action="Schedule" onAction={() => router.push('/schedule')} />{scheduled[0] ? <ShiftCard shift={scheduled[0]} /> : <Card><Text style={{ color: C.muted }}>{t('No upcoming shifts assigned.')}</Text></Card>}</View><View style={{ flex: 1 }}><Section title="Your tasks" /><TaskList workerId={selectedWorkerId} admin={false} /></View></View>
    </>}
  </Screen>;
}
