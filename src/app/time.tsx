import { router } from 'expo-router';
import { Disclosure } from '../ui/Disclosure';
import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Download } from 'lucide-react-native';
import React, { useState } from 'react';
import { Platform, Share, View } from 'react-native';
import { Pressable } from '../ui/LocalizedPressable';
import { Text } from '../ui/LocalizedText';
import { csvRow, downloadCsv } from '../lib/csv';
import { lateMinutes, formatDay, formatMoney, formatTime, hoursLabel, localDate, paySummary, payTimeLabel, shiftHasEnded } from '../lib/data';
import { useStore } from '../lib/store';
import { useLanguage } from '../lib/i18n';
import { useNow } from '../lib/use-now';
import { Button, Card, Empty, Pill, Screen, Section } from '../ui/components';
import { ChoiceChips } from '../ui/ChoiceChips';
import { useTheme } from '../ui/theme';

type ReviewFilter = 'pending' | 'approved' | 'all';
export default function Time() {
  const C = useTheme().colors;
  const { language, t } = useLanguage();
  const { role, punches, shifts, workers, selectedWorkerId, currency, approvals, reviewTime } = useStore();
  const now = useNow();
  const [reviewMessage, setReviewMessage] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReviewFilter>('pending');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [eventLimit, setEventLimit] = useState(10);
  const [month, setMonth] = useState(() => localDate(new Date()).slice(0, 7));
  const currentMonth = localDate(new Date(now)).slice(0, 7);
  const monthLabel = new Date(`${month}-01T12:00:00`).toLocaleDateString(language, { month: 'long', year: 'numeric' });
  const workDate = (p: typeof punches[number]) => p.workDate ?? localDate(new Date(p.at));
  const visible = punches.filter(p => (role !== 'worker' || p.workerId === selectedWorkerId) && workDate(p).startsWith(month));
  const dates = [...new Set(visible.map(workDate))].sort().reverse();
  const rows = dates.flatMap(date => workers.filter(w => visible.some(p => p.workerId === w.id && workDate(p) === date)).map(worker => {
    const events = visible.filter(p => p.workerId === worker.id && workDate(p) === date).sort((a, b) => a.at.localeCompare(b.at));
    const lastByShift = new Map(events.map(p => [p.shiftId, p]));
    const openEvents = [...lastByShift.values()].filter(p => p.type === 'in');
    const missingCheckout = openEvents.some(p => {
      const shift = shifts.find(s => s.id === p.shiftId);
      return shift ? shiftHasEnded(shift, now) : date < localDate(new Date(now));
    });
    const late = shifts.filter(sh => sh.date === date).reduce((sum, sh) => sum + lateMinutes(sh, punches, worker.id), 0);
    return { worker, date, events, late, pay: paySummary(punches, worker, date), open: openEvents.length > 0, missingCheckout, approved: approvals.some(a => a.workerId === worker.id && a.date === date) };
  }));
  const actual = rows.reduce((sum, row) => sum + row.pay.actualSeconds, 0);
  const payable = rows.reduce((sum, row) => sum + row.pay.payableSeconds, 0);
  const totalCents = rows.reduce((sum, row) => sum + row.pay.earningsCents, 0);
  const approvedRows = rows.filter(row => row.approved && !row.open);
  const approvedSeconds = approvedRows.reduce((sum, row) => sum + row.pay.payableSeconds, 0);
  const scheduledMinutes = shifts.filter(shift => !shift.archived && shift.date.startsWith(month)).reduce((sum, shift) => { const start = Number(shift.start.slice(0, 2)) * 60 + Number(shift.start.slice(3)); const end = Number(shift.end.slice(0, 2)) * 60 + Number(shift.end.slice(3)); return sum + (end - start + (end < start ? 1440 : 0)) * shift.workerIds.filter(id => role !== 'worker' || id === selectedWorkerId).length; }, 0);
  const priority = (row: typeof rows[number]) => row.missingCheckout ? 3 : row.pay.excessMinutes > 0 ? 2 : row.late ? 1 : 0;
  const filtered = rows.filter(row => role !== 'admin' || filter === 'all' || (filter === 'approved' ? row.approved : !row.approved));
  if (role === 'admin' && filter === 'pending') filtered.sort((a, b) => priority(b) - priority(a) || b.date.localeCompare(a.date));
  const changeMonth = (offset: number) => {
    const next = new Date(`${month}-01T12:00:00`);
    next.setMonth(next.getMonth() + offset);
    setMonth(localDate(next).slice(0, 7));
    setReviewMessage('');
    setExpanded(null);
  };
  const exportCsv = async () => {
    if (!approvedRows.length) { setReviewMessage('Approve time before exporting pay.'); return; }
    const csv = [csvRow(['worker', 'date', 'actual_seconds', 'payable_seconds', 'over_limit_minutes', 'estimated_pay', 'currency', 'approval']), ...approvedRows.map(row => csvRow([row.worker.name, row.date, row.pay.actualSeconds, row.pay.payableSeconds, row.pay.excessMinutes, (row.pay.earningsCents / 100).toFixed(2), currency, row.approved ? 'approved' : 'pending']))].join('\n');
    try {
      if (Platform.OS === 'web') downloadCsv(`tempo-payroll-${month}.csv`, csv);
      else await Share.share({ message: csv, title: `${monthLabel} Tempo payroll CSV` });
    } catch { setReviewMessage('Could not export. Try again.'); }
  };
  const review = async (workerId: string, date: string, approve: boolean) => {
    if (busy) return;
    setBusy(`${workerId}-${date}`);
    try { const result = await reviewTime(workerId, date, approve); setReviewMessage(result.message); }
    catch { setReviewMessage('Could not save approval. Try again.'); }
    finally { setBusy(null); }
  };
  return <Screen title={role === 'admin' ? 'Time & pay' : 'My hours & pay'} subtitle="A clear record of time worked and estimated earnings.">
    <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, marginBottom: 16 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => changeMonth(-1)} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}><ChevronLeft color={C.green} size={22} /></Pressable>
      <View style={{ flex: 1, alignItems: 'center' }}><Text style={{ color: C.muted, fontSize: 12 }}>PAY PERIOD</Text><Text style={{ fontSize: 18, fontWeight: '600', marginTop: 4 }}>{monthLabel}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Next month" accessibilityState={{ disabled: month >= currentMonth }} disabled={month >= currentMonth} onPress={() => changeMonth(1)} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', opacity: month >= currentMonth ? .4 : 1 }}><ChevronRight color={C.green} size={22} /></Pressable>
    </Card>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {[{ label: 'Estimated earnings', value: formatMoney(totalCents, currency) }, { label: 'Recorded hours', value: payTimeLabel(actual) }, { label: 'Payable hours', value: payTimeLabel(payable) }, { label: 'Scheduled hours', value: hoursLabel(scheduledMinutes) }, { label: 'Approved hours', value: payTimeLabel(approvedSeconds) }].map((stat, index) => <Card key={stat.label} style={{ flexGrow: 1, flexBasis: index === 0 ? 260 : 140, backgroundColor: index === 0 ? C.green : C.surface }}><Text style={{ fontSize: 14, color: index === 0 ? C.onGreen : C.muted }}>{stat.label}</Text><Text style={{ fontSize: 28, fontWeight: '600', color: index === 0 ? C.onGreen : C.ink, marginTop: 8 }}>{stat.value}</Text></Card>)}
    </View>
    <Text style={{ color: C.muted, fontSize: 14, lineHeight: 22, marginTop: 14 }}>Pay is capped at 10 hours per worker each day. Extra time stays in the log for manager review.</Text>
    <View style={{ marginTop: 16 }}><Button label={role === 'admin' ? 'Review work requests' : 'Request an attendance correction'} small variant="outline" onPress={() => router.push('/requests')} /></View>
    <Section title={role === 'admin' ? 'Review time' : 'Daily summaries'} />
    {role === 'admin' && <View style={{ gap: 12, marginBottom: 16 }}>
      <ChoiceChips label="Filter time records" value={filter} onChange={value => setFilter(value as ReviewFilter)} options={[{ value: 'pending', label: `${t('Needs review')} (${rows.filter(row => !row.approved).length})` }, { value: 'approved', label: `${t('Approved')} (${rows.filter(row => row.approved).length})` }, { value: 'all', label: `${t('All')} (${rows.length})` }]} />
      <Button small label="Export approved pay CSV" variant="outline" icon={<Download color={C.green} size={18} />} onPress={() => void exportCsv()} />
    </View>}
    {!!reviewMessage && <Text accessibilityLiveRegion="polite" style={{ fontSize: 14, marginBottom: 12 }}>{reviewMessage}</Text>}
    {filtered.map(row => {
      const key = `${row.worker.id}-${row.date}`;
      const isExpanded = expanded === key;
      const status = row.missingCheckout ? 'Missing clock-out' : row.approved ? 'Manager approved' : row.open ? 'Clocked in' : 'Awaiting manager approval';
      return <Card key={key} style={{ marginBottom: 12, padding: 18 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 10 }}>
          <View style={{ flex: 1, minWidth: 160 }}><Text style={{ fontSize: 16, fontWeight: '600' }}>{role === 'admin' ? row.worker.name : formatDay(row.date)}</Text><Text style={{ color: C.muted, fontSize: 14, marginTop: 5 }}>{role === 'admin' ? `${formatDay(row.date)} · ` : ''}{payTimeLabel(row.pay.payableSeconds)} {t('payable')}</Text></View>
          <Text style={{ color: C.green, fontSize: 18, fontWeight: '600' }}>{formatMoney(row.pay.earningsCents, currency)}</Text>
        </View>
        <View style={{ marginTop: 12, gap: 8 }}><Pill tone={row.missingCheckout ? 'orange' : row.approved ? 'green' : 'gray'}>{status}</Pill>
          {row.pay.excessMinutes > 0 && <Text style={{ color: C.red, fontSize: 14 }}>{hoursLabel(row.pay.excessMinutes)} · <Text>Over limit · review required</Text></Text>}
          {!!row.late && <Text style={{ color: C.warningText, fontSize: 14 }}>{row.late} <Text>min late</Text></Text>}
          {row.missingCheckout && <Text style={{ color: C.warningText, fontSize: 14, lineHeight: 22 }}>Confirm the clock-out with the site lead before approving.</Text>}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 10 }}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: isExpanded }} onPress={() => { setEventLimit(10); setExpanded(isExpanded ? null : key); }} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8 }}><Text style={{ color: C.green, fontSize: 14 }}>{isExpanded ? 'Hide clock events' : 'View clock events'}</Text><ChevronDown size={18} color={C.green} style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }} /></Pressable>
          {role === 'admin' && !row.open && <Button small disabled={!!busy} variant={row.approved ? 'outline' : 'light'} label={busy === key ? 'Saving…' : row.approved ? 'Undo approval' : 'Approve time'} icon={row.approved ? undefined : <CheckCircle2 size={16} color={C.green} />} onPress={() => void review(row.worker.id, row.date, !row.approved)} />}
        </View>
        <Disclosure open={isExpanded}><View style={{ borderTopWidth: 1, borderTopColor: C.line, marginTop: 8, paddingTop: 12, gap: 12 }}>
          <Text style={{ color: C.muted, fontSize: 13 }}>Timestamps use this device’s local time zone.</Text>
          {row.events.slice(-eventLimit).reverse().map(event => <View key={event.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}><View style={{ flex: 1 }}><Text style={{ fontSize: 14, fontWeight: '500' }}>{event.type === 'in' ? 'Clock in' : 'Clock out'}</Text><Text style={{ color: C.muted, fontSize: 14, marginTop: 3 }}>{shifts.find(s => s.id === event.shiftId)?.site}</Text></View><Text style={{ fontSize: 14 }}>{formatTime(event.at)}</Text></View>)}
          {row.events.length > eventLimit && <Button small variant="outline" label="View more" onPress={() => setEventLimit(value => value + 10)} />}
        </View></Disclosure>
      </Card>;
    })}
    {!filtered.length && <Empty title={rows.length ? 'No matching records' : 'No time logged this month'} detail={rows.length ? 'Choose another filter to see more records.' : 'Use the month controls above to review earlier time and pay.'} action={rows.length ? 'Show all records' : 'Previous month'} onAction={() => rows.length ? setFilter('all') : changeMonth(-1)} />}
  </Screen>;
}
