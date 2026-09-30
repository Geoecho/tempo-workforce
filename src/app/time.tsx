import { CheckCircle2, ChevronLeft, ChevronRight, Download, LogIn, LogOut, Wallet } from 'lucide-react-native';
import React, { useState } from 'react';
import { Platform, Share, View } from 'react-native';
import { Pressable } from '../ui/LocalizedPressable';
import { Text } from '../ui/LocalizedText';
import { csvRow, downloadCsv } from '../lib/csv';
import { formatDay, formatMoney, formatTime, hoursLabel, localDate, paySummary, payTimeLabel } from '../lib/data';
import { useStore } from '../lib/store';
import { useLanguage } from '../lib/i18n';
import { Button, Card, Empty, Screen, Section } from '../ui/components';
import { C } from '../ui/theme';

export default function Time() {
  const { language, t } = useLanguage();
  const { role, punches, shifts, workers, selectedWorkerId, currency, approvals, reviewTime } = useStore();
  const [reviewMessage, setReviewMessage] = useState('');
  const [month, setMonth] = useState(() => localDate(new Date()).slice(0, 7));
  const currentMonth = localDate(new Date()).slice(0, 7);
  const monthDate = new Date(`${month}-01T12:00:00`);
  const monthLabel = monthDate.toLocaleDateString(language, { month: 'long', year: 'numeric' });
  const workDate = (p: typeof punches[number]) => p.workDate ?? localDate(new Date(p.at));
  const visible = punches.filter(p => (role !== 'worker' || p.workerId === selectedWorkerId) && workDate(p).startsWith(month));
  const entries = [...visible].sort((a, b) => b.at.localeCompare(a.at));
  const dates = [...new Set(visible.map(workDate))].sort().reverse();
  const rows = dates.flatMap(date => workers.filter(w => visible.some(p => p.workerId === w.id && workDate(p) === date)).map(worker => {
    const events = visible.filter(p => p.workerId === worker.id && workDate(p) === date);
    const open = shifts.some(shift => [...events].reverse().find(p => p.shiftId === shift.id)?.type === 'in');
    return { worker, date, pay: paySummary(punches, worker, date), open, approved: approvals.some(a => a.workerId === worker.id && a.date === date) };
  }));
  const actual = rows.reduce((sum, row) => sum + row.pay.actualSeconds, 0);
  const payable = rows.reduce((sum, row) => sum + row.pay.payableSeconds, 0);
  const totalCents = rows.reduce((sum, row) => sum + row.pay.earningsCents, 0);
  const changeMonth = (offset: number) => {
    const next = new Date(`${month}-01T12:00:00`);
    next.setMonth(next.getMonth() + offset);
    setMonth(localDate(next).slice(0, 7));
    setReviewMessage('');
  };
  const exportCsv = async () => {
    const csv = [csvRow(['worker', 'date', 'actual_seconds', 'payable_seconds', 'over_limit_minutes', 'estimated_pay', 'currency', 'approval']), ...rows.map(row => csvRow([row.worker.name, row.date, row.pay.actualSeconds, row.pay.payableSeconds, row.pay.excessMinutes, (row.pay.earningsCents / 100).toFixed(2), currency, row.approved ? 'approved' : 'pending']))].join('\n');
    if (Platform.OS === 'web') downloadCsv(`tempo-payroll-${month}.csv`, csv);
    else await Share.share({ message: csv, title: `${monthLabel} Tempo payroll CSV` });
  };
  const review = async (workerId: string, date: string, approve: boolean) => {
    const result = await reviewTime(workerId, date, approve);
    setReviewMessage(result.message);
  };
  return <Screen title={role === 'admin' ? 'Time & pay' : 'My hours & pay'} subtitle="A clear record of time worked and estimated earnings.">
    <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11, padding: 12 }}><Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => changeMonth(-1)} style={{ width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.mint }}><ChevronLeft color={C.green} size={20} /></Pressable><View style={{ alignItems: 'center' }}><Text style={{ color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>{t('PAY PERIOD')}</Text><Text style={{ color: C.ink, fontSize: 17, fontWeight: '700', marginTop: 2 }}>{monthLabel}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Next month" accessibilityState={{ disabled: month >= currentMonth }} disabled={month >= currentMonth} onPress={() => changeMonth(1)} style={{ width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: month >= currentMonth ? C.bg : C.mint }}><ChevronRight color={month >= currentMonth ? C.muted : C.green} size={20} /></Pressable></Card>
    <Card style={{ backgroundColor: C.green, borderColor: C.green, padding: 22 }}><Text style={{ color: '#C5E1D1', fontSize: 12, fontWeight: '700' }}>ESTIMATED PAY · {monthLabel.toUpperCase()}</Text><Text style={{ color: '#FFFFFF', fontSize: 37, fontWeight: '700', letterSpacing: -.8, marginTop: 10 }}>{formatMoney(totalCents, currency)}</Text><Text style={{ color: '#C5E1D1', fontSize: 13, marginTop: 3 }}>{payTimeLabel(payable)} payable of {payTimeLabel(actual)} recorded</Text></Card>
    <Card style={{ flexDirection: 'row', alignItems: 'center', marginTop: 11 }}><View style={{ width: 39, height: 39, borderRadius: 12, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' }}><Wallet color={C.green} size={19} /></View><Text style={{ flex: 1, color: C.muted, fontSize: 12, lineHeight: 18, marginLeft: 12 }}>{t('Pay is capped at 10 hours per worker each day. Extra time stays in the log for manager review.')}</Text></Card>
    {role === 'admin' && <View style={{ marginTop: 12 }}><Button label={`Download ${monthLabel} CSV`} variant="outline" icon={<Download color={C.green} size={17} />} onPress={exportCsv} /></View>}
    <Section title="Daily summaries" />
    {!!reviewMessage && <Text style={{ color: C.green, fontSize: 12, marginBottom: 10 }}>{reviewMessage}</Text>}
    {rows.length ? rows.map(row => <Card key={`${row.worker.id}-${row.date}`} style={{ marginBottom: 9, padding: 16 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><View><Text style={{ color: C.ink, fontWeight: '700', fontSize: 14 }}>{role === 'admin' ? row.worker.name : formatDay(row.date)}</Text><Text style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>{role === 'admin' ? `${formatDay(row.date)} · ` : ''}{payTimeLabel(row.pay.payableSeconds)} payable</Text></View><Text style={{ color: C.green, fontWeight: '700', fontSize: 15 }}>{formatMoney(row.pay.earningsCents, currency)}</Text></View><View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 10 }}><Text style={{ flex: 1, minWidth: 150, color: row.approved ? C.green : C.muted, fontSize: 12, fontWeight: '700' }}>{row.approved ? '✓ Manager approved' : row.open ? 'Clocked in · approval pending' : 'Awaiting manager approval'}</Text>{role === 'admin' && !row.open && <Button small variant={row.approved ? 'outline' : 'light'} label={row.approved ? 'Undo approval' : 'Approve time'} icon={row.approved ? undefined : <CheckCircle2 size={15} color={C.green} />} onPress={() => void review(row.worker.id, row.date, !row.approved)} />}</View>{row.pay.excessMinutes > 0 && <Text style={{ color: C.red, fontSize: 11, marginTop: 9 }}>{hoursLabel(row.pay.excessMinutes)} over limit · review required</Text>}</Card>) : <Empty title="No time logged this month" detail="Use the month controls above to review earlier time and pay." />}
    <Section title="Clock events" /><Text style={{ color: C.muted, fontSize: 12, marginBottom: 13 }}>{t('Timestamps use this device’s local time zone.')}</Text>
    {!!entries.length && <Card style={{ padding: 0, overflow: 'hidden' }}>{entries.map((p, i) => { const worker = workers.find(w => w.id === p.workerId); const shift = shifts.find(s => s.id === p.shiftId); return <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}><View style={{ backgroundColor: p.type === 'in' ? C.mint : '#F4EDE5', width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>{p.type === 'in' ? <LogIn size={18} color={C.green} /> : <LogOut size={18} color="#A47443" />}</View><View style={{ flex: 1, marginLeft: 12 }}><Text style={{ color: C.ink, fontWeight: '700', fontSize: 13 }}>{worker?.name} checked {p.type}</Text><Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{shift?.site}</Text></View><Text style={{ color: C.muted, fontSize: 12 }}>{formatTime(p.at)}</Text></View>; })}</Card>}
  </Screen>;
}
