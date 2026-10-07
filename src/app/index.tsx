import { router } from 'expo-router';
import { ArrowUpRight, CalendarDays, CheckCheck, Clock3, Coffee, ListChecks, Plus, QrCode, ScanLine, UsersRound, Wallet } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, View, useWindowDimensions } from 'react-native';
import { activeBreak, formatDay, formatMoney, formatTime, localDate, payTimeLabel, shiftHasEnded, LATE_GRACE_MINUTES } from '../lib/data';
import { dashboardWeek } from '../lib/dashboard-data';
import { useStore } from '../lib/store';
import { useNow } from '../lib/use-now';
import { useExtras } from '../lib/extras';
import { useWorkRequests } from '../lib/work-requests';
import { useLanguage } from '../lib/i18n';
import { ArrivalAttention } from '../ui/ArrivalAttention';
import { TaskList } from '../ui/extras-ui';
import { Screen } from '../ui/components';
import { ShiftCard } from '../ui/ShiftCard';
import { useTheme } from '../ui/theme';
import { BrandMark } from '../ui/Brand';
import { Pressable } from '../ui/LocalizedPressable';
import { Text } from '../ui/LocalizedText';
import { BentoCard, BentoTitle, DashboardAction, DashboardMotion, MetricCard } from '../ui/dashboard/Bento';
import { ActivityChart, AttendanceRing, EarningsLine, Sparkline } from '../ui/dashboard/Charts';

export default function Home() {
  const C = useTheme().colors;
  const { language, t } = useLanguage();
  const { width } = useWindowDimensions();
  const columns = Platform.OS === 'web' && width >= 1100;
  const compactMetrics = Platform.OS !== 'web' || width < 1200;
  const now = useNow();
  const day = localDate(new Date(now));
  const { role, workers, shifts, punches, breaks, toggleBreak, selectedWorkerId, currency, workspaceName } = useStore();
  const { tasks } = useExtras();
  const { items: workRequests } = useWorkRequests();
  const [breakBusy, setBreakBusy] = useState(false);
  const [breakMessage, setBreakMessage] = useState('');
  const admin = role === 'admin';
  const worker = workers.find(person => person.id === selectedWorkerId);
  const scope = useMemo(() => admin ? workers : workers.filter(person => person.id === selectedWorkerId), [workers, admin, selectedWorkerId]);
  // Reuse cached punches and the pay registry refreshed by ExtrasProvider.
  const week = dashboardWeek(punches, scope, now);
  const todayPay = week[6];
  const weeklyHours = week.reduce((sum, item) => sum + item.paidSeconds, 0);
  const weeklyPay = week.reduce((sum, item) => sum + item.earningsCents, 0);
  const activeWorkers = workers.filter(person => !person.archived);
  const todays = shifts.filter(shift => !shift.archived && shift.date === day && (admin || shift.workerIds.includes(selectedWorkerId)));
  const scheduled = shifts.filter(shift => !shift.archived && !shiftHasEnded(shift, now) && (admin || shift.workerIds.includes(selectedWorkerId))).sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  const latest = useMemo(() => new Map([...punches].sort((a, b) => a.at.localeCompare(b.at)).map(punch => [`${punch.shiftId}:${punch.workerId}`, punch])), [punches]);
  const active = [...latest.values()].find(punch => punch.workerId === selectedWorkerId && punch.type === 'in' && shifts.some(shift => shift.id === punch.shiftId && !shift.archived));
  const isIn = !!active;
  const currentShift = shifts.find(shift => shift.id === active?.shiftId) ?? scheduled[0];
  const crewIds = [...new Set(todays.flatMap(shift => shift.workerIds))].filter(id => activeWorkers.some(person => person.id === id));
  const todayShiftIds = new Set(todays.map(shift => shift.id));
  const clockedIn = new Set([...latest.values()].filter(punch => punch.type === 'in' && todayShiftIds.has(punch.shiftId) && crewIds.includes(punch.workerId)).map(punch => punch.workerId)).size;
  const arrived = crewIds.filter(id => punches.some(punch => punch.workerId === id && punch.type === 'in' && todayShiftIds.has(punch.shiftId))).length;
  const arrivalIssues = todays.filter(shift => now > new Date(`${shift.date}T${shift.start}:00`).getTime() + LATE_GRACE_MINUTES * 60000).sort((a, b) => a.start.localeCompare(b.start)).map(shift => ({ shift, workers: activeWorkers.filter(person => shift.workerIds.includes(person.id) && !punches.some(punch => punch.shiftId === shift.id && punch.workerId === person.id && punch.type === 'in')) })).filter(issue => issue.workers.length > 0);
  const notArrived = new Set(arrivalIssues.flatMap(issue => issue.workers.map(person => person.id))).size;
  const onBreak = isIn && active ? activeBreak(breaks, punches, active.shiftId, selectedWorkerId) : null;
  const pendingTasks = tasks.filter(task => !task.doneAt && (admin || task.workerId === selectedWorkerId)).length;
  const pendingRequests = workRequests.filter(request => request.status === 'pending').length;
  const changeBreak = async () => {
    if (!isIn || !active || breakBusy) return;
    setBreakBusy(true);
    try { const result = await toggleBreak(active.shiftId); setBreakMessage(result.message); }
    catch { setBreakMessage('Could not update your break. Try again.'); }
    finally { setBreakBusy(false); }
  };
  const hour = new Date(now).getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const metrics = admin ? [
    { label: 'Scheduled today', value: String(crewIds.length), detail: `${todays.length} ${t('Shifts').toLowerCase()}`, icon: <CalendarDays size={18} color={C.green} /> },
    { label: 'On the clock', value: String(clockedIn), detail: notArrived ? `${notArrived} ${t('Not arrived').toLowerCase()}` : 'Attendance at a glance', icon: <Clock3 size={18} color={C.green} /> },
    { label: 'Team members', value: String(activeWorkers.length), detail: 'Your active crew', icon: <UsersRound size={18} color={C.green} /> },
    { label: 'Estimated pay today', value: formatMoney(todayPay.earningsCents, currency), detail: `${payTimeLabel(todayPay.paidSeconds)} ${t('paid')}`, icon: <Wallet size={18} color={C.green} /> },
  ] : [
    { label: 'Paid time today', value: payTimeLabel(todayPay.paidSeconds), detail: '10h daily cap', icon: <Clock3 size={18} color={C.green} /> },
    { label: 'Paid time · 7 days', value: payTimeLabel(weeklyHours), detail: 'Your recorded hours', icon: <CheckCheck size={18} color={C.green} /> },
    { label: 'Upcoming shifts', value: String(scheduled.length), detail: 'Your next assignments', icon: <CalendarDays size={18} color={C.green} /> },
    { label: 'Pending tasks', value: String(pendingTasks), detail: 'Assigned to you', icon: <ListChecks size={18} color={C.green} /> },
  ];

  return <Screen title={`${t(greeting)}${!admin && worker ? ', ' + worker.name.split(' ')[0] : ''}.`} subtitle={new Date(now).toLocaleDateString(language, { weekday: 'long', month: 'long', day: 'numeric' })}>
    <DashboardMotion>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 16 }}><Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 1.8, color: C.muted }}>{admin ? 'WORKSPACE OVERVIEW' : 'YOUR PERSONAL OVERVIEW'}</Text><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20, backgroundColor: C.mint }}><View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.green }} /><Text style={{ color: C.green, fontSize: 10 }}>Today</Text></View></View>
      <View style={{ flexDirection: columns ? 'row' : 'column', gap: 18, alignItems: 'stretch', marginBottom: 18 }}>
        <BentoCard tone="forest" style={{ flex: columns ? 1.6 : undefined, minHeight: 268, padding: columns ? 30 : 24 }}>
          <View pointerEvents="none" style={{ position: 'absolute', right: -48, bottom: -40, opacity: .08 }}><BrandMark size={230} color="#D5EEAB" /></View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 20 }}><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#D5EEAB' }} /><Text style={{ color: '#D5EEAB', fontSize: 10, fontWeight: '600', letterSpacing: 1.4 }}>{admin ? workspaceName || 'TEMPO WORKSPACE' : onBreak ? 'PAID BREAK' : isIn ? 'ON THE CLOCK' : 'READY WHEN YOU ARE'}</Text></View>
          <Text style={{ color: '#F8FBF1', fontSize: columns ? 34 : 29, lineHeight: columns ? 40 : 35, letterSpacing: -1.25, maxWidth: 440 }}>{admin ? 'Good work starts with a clear plan.' : onBreak ? 'A moment to recharge.' : isIn ? 'You’re right on time.' : 'Your next great shift starts here.'}</Text>
          <Text style={{ color: '#BACDBB', fontSize: 13, lineHeight: 21, marginTop: 12, maxWidth: 410 }}>{admin ? 'Plan your crew, keep time clear, and make space for a smoother day.' : onBreak ? `Break started ${formatTime(onBreak.at)} · Time remains paid` : isIn && active ? `Clocked in since ${formatTime(active.at)}` : currentShift ? `${currentShift.title} · ${formatDay(currentShift.date)} · ${currentShift.start}–${currentShift.end}` : 'Your assigned shifts will appear here. Keep an eye on your schedule.'}</Text>
          {!admin && currentShift && <Text style={{ color: '#D7E4CD', fontSize: 12, lineHeight: 20, marginTop: 8 }}>{currentShift.site} · {currentShift.location}</Text>}
          {!admin && isIn && active && <Text style={{ fontSize: 30, color: '#D5EEAB', letterSpacing: -.8, marginTop: 18 }}>{payTimeLabel(Math.max(0, (now - new Date(active.at).getTime()) / 1000))}<Text style={{ fontSize: 11 }}> elapsed</Text></Text>}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 24 }}>
            {admin ? <><DashboardAction hero label="Create shift" icon={<Plus size={16} color="#183C2C" />} onPress={() => router.push('/new-shift')} /><DashboardAction hero label="Site QR" icon={<QrCode size={16} color="#183C2C" />} onPress={() => router.push('/pass')} /></> : <><DashboardAction hero label={isIn ? 'Scan to clock out' : 'Scan to clock in'} icon={<QrCode size={16} color="#183C2C" />} onPress={() => router.push('/scan')} />{isIn && <Pressable accessibilityRole="button" disabled={breakBusy} accessibilityState={{ disabled: breakBusy }} onPress={() => void changeBreak()} style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 14, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#5C7965', opacity: pressed || breakBusy ? .65 : 1 })}>{breakBusy ? <ActivityIndicator color="#D5EEAB" /> : <Coffee size={16} color="#D5EEAB" />}<Text style={{ fontSize: 12, color: '#E5F0DA' }}>{onBreak ? 'End paid break' : 'Start paid break'}</Text></Pressable>}</>}
          </View>
          {!!breakMessage && <Text accessibilityRole="alert" style={{ fontSize: 12, lineHeight: 18, color: '#E5F0DA', marginTop: 12 }}>{breakMessage}</Text>}
        </BentoCard>
        {admin ? <BentoCard delay={60} style={{ flex: columns ? 1 : undefined, minHeight: 268 }}><AttendanceRing arrived={arrived} scheduled={crewIds.length} active={clockedIn} missing={notArrived} /></BentoCard> : <BentoCard tone="mint" delay={60} style={{ flex: columns ? 1 : undefined, minHeight: 268 }}><BentoTitle title="Your earnings" detail="Estimated pay today" action="Timesheet" onAction={() => router.push('/time')} /><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.5} style={{ color: C.green, fontSize: 39, letterSpacing: -1.7 }}>{formatMoney(todayPay.earningsCents, currency)}</Text><EarningsLine days={week} /><View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, gap: 10 }}><Text style={{ color: C.muted, fontSize: 11 }}>Last 7 days</Text><Text style={{ fontSize: 12, color: C.green, fontWeight: '600' }}>{formatMoney(weeklyPay, currency)}</Text></View></BentoCard>}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 18 }}>{metrics.map((metric, index) => <View key={metric.label} style={{ flexGrow: 1, flexBasis: compactMetrics ? '46%' : '22%', minWidth: 0 }}><MetricCard {...metric} delay={90 + index * 40}>{index === 3 && admin && <Sparkline values={week.map(item => item.earningsCents)} />}</MetricCard></View>)}</View>
      {admin && <ArrivalAttention issues={arrivalIssues} now={now} />}

      <View style={{ flexDirection: columns ? 'row' : 'column', gap: 18, alignItems: 'stretch', marginBottom: 18 }}>
        <BentoCard delay={180} style={{ flex: columns ? 1.6 : undefined }}><ActivityChart days={week} currency={currency} admin={admin} /></BentoCard>
        <BentoCard delay={220} style={{ flex: columns ? 1 : undefined }}>
          <BentoTitle title={admin ? 'Keep things moving' : 'Make it a good week'} detail={admin ? 'The next steps for your team' : 'Everything you need, close at hand'} />
          <View style={{ gap: 12 }}>
            {admin ? <><DashboardAction label="Team tasks" detail={`${pendingTasks} ${t('tasks awaiting completion')}`} icon={<ListChecks size={19} color={C.green} />} onPress={() => router.push('/tasks')} /><DashboardAction label="Work requests" detail={pendingRequests ? `${pendingRequests} ${t('work requests awaiting review')}` : 'All caught up'} icon={<CheckCheck size={19} color={C.green} />} onPress={() => router.push('/requests')} /><DashboardAction label="Review time records" detail="Hours, corrections, and approvals" icon={<Clock3 size={19} color={C.green} />} onPress={() => router.push('/time')} /></> : <><DashboardAction label="Your schedule" detail={`${scheduled.length} ${t('Upcoming shifts').toLowerCase()}`} icon={<CalendarDays size={19} color={C.green} />} onPress={() => router.push('/schedule')} /><DashboardAction label="Your requests" detail="Leave, corrections, and updates" icon={<CheckCheck size={19} color={C.green} />} onPress={() => router.push('/requests')} /><DashboardAction label="Your ID" detail="Show your code to your manager" icon={<QrCode size={19} color={C.green} />} onPress={() => router.push('/my-code')} /></>}
          </View>
        </BentoCard>
      </View>

      <View style={{ flexDirection: columns ? 'row' : 'column', alignItems: 'flex-start', gap: 18 }}>
        <BentoCard delay={260} style={{ flex: columns ? 1.6 : undefined, width: columns ? undefined : '100%' }}>
          <BentoTitle title={admin ? 'Coming up next' : 'Your next shifts'} detail="A little clarity for the days ahead" action="Schedule" onAction={() => router.push('/schedule')} />
          {scheduled.length ? <View style={{ gap: 12 }}>{scheduled.slice(0, 4).map(shift => <ShiftCard key={shift.id} shift={shift} compact now={now} />)}</View> : <View style={{ paddingVertical: 20 }}><View style={{ width: 50, height: 50, borderRadius: 16, backgroundColor: C.mint, justifyContent: 'center', alignItems: 'center', marginBottom: 18 }}><CalendarDays size={23} color={C.green} /></View><Text style={{ fontSize: 19, color: C.ink, marginBottom: 9 }}>{admin ? 'Make space for great work.' : 'Your schedule is clear.'}</Text><Text style={{ color: C.muted, fontSize: 13, lineHeight: 21, marginBottom: 22 }}>{admin ? 'Create your first shift and give your team a clear plan.' : 'Your assigned shifts will appear here as your team plans ahead.'}</Text><DashboardAction label={admin ? 'Create shift' : 'View schedule'} icon={<ArrowUpRight size={17} color={C.green} />} onPress={() => router.push(admin ? '/new-shift' : '/schedule')} /></View>}
        </BentoCard>
        <View style={{ flex: columns ? 1 : undefined, width: columns ? undefined : '100%', gap: 18 }}>
          <BentoCard delay={300}>{admin ? <><BentoTitle title={activeWorkers.length ? 'Your team, connected' : 'Build your first team'} detail={activeWorkers.length ? 'People make the plan work' : 'A workspace is better with your crew'} /><Text style={{ color: C.muted, fontSize: 13, lineHeight: 21, marginBottom: 20 }}>{activeWorkers.length ? 'Reach your people or check them in when they arrive.' : 'Add a team, invite your people, and bring your first plan to life.'}</Text><View style={{ gap: 10 }}><DashboardAction label={activeWorkers.length ? 'Contact team' : 'Add your first team'} icon={<UsersRound size={19} color={C.green} />} onPress={() => router.push('/team')} /><DashboardAction label="Scan worker" icon={<ScanLine size={19} color={C.green} />} onPress={() => router.push('/scan-worker')} /></View></> : <><BentoTitle title="Your tasks" detail={pendingTasks ? `${pendingTasks} ${t('tasks awaiting completion')}` : 'A clear view of what’s next'} /><TaskList workerId={selectedWorkerId} admin={false} /></>}</BentoCard>
        </View>
      </View>
    </DashboardMotion>
  </Screen>;
}
