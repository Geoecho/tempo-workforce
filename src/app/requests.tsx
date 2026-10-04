import { LeaveDateRange } from '../ui/LeaveDateRange';
import { useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import { useStore } from '../lib/store';
import { useWorkRequests } from '../lib/work-requests';
import { today, formatDay } from '../lib/data';
import { ChoiceChips } from '../ui/ChoiceChips';
import { Field } from '../ui/Field';
import { Text } from '../ui/LocalizedText';
import { Button, Card, Screen } from '../ui/components';
import { useTheme } from '../ui/theme';

export default function Requests() {
  const C = useTheme().colors;
  const { shiftId } = useLocalSearchParams<{ shiftId?: string }>();
  const { role, selectedWorkerId, shifts, workers, punches } = useStore();
  const { items, error, submit, review } = useWorkRequests();
  const assigned = shifts.filter(shift => shift.workerIds.includes(selectedWorkerId) && (shift.date <= today() || punches.some(punch => punch.shiftId === shift.id)));
  const [shiftQuery, setShiftQuery] = useState('');
  const [shiftLimit, setShiftLimit] = useState(8);
  const matchingShifts = assigned.filter(shift => `${shift.title} ${shift.site} ${shift.date}`.toLowerCase().includes(shiftQuery.toLowerCase())).sort((a, b) => b.date.localeCompare(a.date));
  const [kind, setKind] = useState<'leave' | 'correction'>(shiftId ? 'correction' : 'leave');
  const [selectedShift, setSelectedShift] = useState(shiftId ?? '');
  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate] = useState(today());
  const [inTime, setInTime] = useState('09:00');
  const [outTime, setOutTime] = useState('17:00');
  const [reason, setReason] = useState('');
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [limit, setLimit] = useState(10);
  const [filter, setFilter] = useState('pending');
  const visible = items.filter(item => filter === 'all' || item.status === filter);
  const perform = async (operation: () => Promise<void>, success: string) => {
    if (lock.current) return; lock.current = true; setBusy(true); setMessage('');
    try { await operation(); setMessage(success); setReviewing(null); setNote(''); setReason(''); }
    catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Could not save the request.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <Screen back focused={false} title={role === 'admin' ? 'Work requests' : 'My requests'} subtitle="Leave and attendance corrections, with a clear review history.">
    {!!error && <Text accessibilityRole="alert" style={{ color: C.red, marginBottom: 16 }}>{error}</Text>}
    {!!message && <Text accessibilityLiveRegion="polite" style={{ color: C.ink, marginBottom: 16 }}>{message}</Text>}
    {role === 'worker' && <Card style={{ padding: 20, marginBottom: 20 }}>
      <ChoiceChips label="Request type" value={kind} onChange={value => setKind(value as typeof kind)} options={[{ value: 'leave', label: 'Request leave' }, { value: 'correction', label: 'Correct attendance' }]} />
      <View style={{ marginTop: 20 }}>
        {kind === 'leave' ? <LeaveDateRange from={fromDate} through={toDate} onChange={(from, through) => { setFromDate(from); setToDate(through); }} /> : <>
          <Field label="Find your shift" value={shiftQuery} onChangeText={value => { setShiftQuery(value); setShiftLimit(8); }} placeholder="Search site, shift or date" />
          <ChoiceChips label="Shift to correct" value={selectedShift} onChange={setSelectedShift} options={matchingShifts.slice(0, shiftLimit).map(shift => ({ value: shift.id, label: `${shift.site} · ${formatDay(shift.date)} · ${shift.start}` }))} />
          {matchingShifts.length > shiftLimit && <Button label="View more shifts" small variant="outline" onPress={() => setShiftLimit(value => value + 8)} />}
          <View style={{ marginTop: 18 }}><Field label="Actual clock-in" value={inTime} onChangeText={setInTime} placeholder="HH:MM" /><Field label="Actual clock-out" value={outTime} onChangeText={setOutTime} placeholder="HH:MM" /></View>
          <Text style={{ color: C.muted, fontSize: 12, lineHeight: 18, marginBottom: 18 }}>An earlier clock-out time means the next day. Your manager reviews the change before attendance is updated.</Text>
        </>}
        <Field label="Reason" value={reason} onChangeText={setReason} placeholder="Explain what needs to change" multiline />
        <Button label={busy ? 'Sending…' : 'Send request'} disabled={busy} onPress={() => void perform(async () => {
          const shift = assigned.find(item => item.id === selectedShift);
          if (kind === 'correction' && !shift) throw new Error('Choose your shift first.');
          if (kind === 'leave' && fromDate < today()) throw new Error('Leave must start today or later.');
          await submit({ kind, fromDate: kind === 'correction' ? shift!.date : fromDate, toDate: kind === 'correction' ? shift!.date : toDate, shiftId: kind === 'correction' ? shift!.id : undefined, inTime: kind === 'correction' ? inTime : undefined, outTime: kind === 'correction' ? outTime : undefined, reason });
        }, 'Request sent for review.')} />
      </View>
    </Card>}
    <View style={{ marginBottom: 20 }}><ChoiceChips label="Filter requests" value={filter} onChange={value => { setFilter(value); setLimit(10); }} options={[{ value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }, { value: 'all', label: 'All' }]} /></View>
    {!visible.length && <Card><Text style={{ color: C.muted }}>No requests in this view.</Text></Card>}
    {visible.slice(0, limit).map(request => {
      const worker = workers.find(item => item.id === request.workerId);
      const shift = shifts.find(item => item.id === request.shiftId);
      const affected = request.kind === 'leave' ? shifts.filter(item => !item.archived && item.workerIds.includes(request.workerId) && item.date >= request.fromDate && item.date <= request.toDate).length : 0;
      return <Card key={request.id} style={{ padding: 20, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 }}><Text style={{ color: C.ink, fontWeight: '600', fontSize: 17, flexGrow: 1, flexBasis: 160, minWidth: 0 }}>{role === 'admin' ? worker?.name ?? 'Worker' : request.kind === 'leave' ? 'Leave request' : 'Attendance correction'}</Text><Text style={{ color: C.green }}>{request.status}</Text></View>
        <Text style={{ color: C.muted, lineHeight: 21, marginTop: 10 }}>{request.kind === 'leave' ? `${request.fromDate} → ${request.toDate}` : `${shift?.title ?? 'Shift'} · ${request.fromDate} · ${request.inTime}–${request.outTime}`}</Text>
        <Text style={{ color: C.ink, lineHeight: 21, marginTop: 12 }}>{request.reason}</Text>
        {!!request.reviewNote && <Text style={{ color: C.muted, lineHeight: 20, marginTop: 12 }}>{request.reviewNote}</Text>}
        {role === 'admin' && request.status === 'pending' && <View style={{ marginTop: 18 }}>
          {affected > 0 && <Text style={{ color: C.red, marginBottom: 14 }}>{affected} <Text>scheduled shifts need reassignment if leave is approved.</Text></Text>}
          {reviewing === request.id ? <><Field label="Review note" value={note} onChangeText={setNote} placeholder="Explain your decision" /><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}><Button label="Approve request" small disabled={busy} onPress={() => void perform(() => review(request.id, true, note), 'Request approved.')} /><Button label="Reject request" small variant="outline" disabled={busy} onPress={() => void perform(() => review(request.id, false, note), 'Request rejected.')} /><Button label="Cancel" small variant="outline" onPress={() => setReviewing(null)} /></View></> : <Button label="Review request" small variant="outline" onPress={() => { setReviewing(request.id); setNote(''); }} />}
        </View>}
      </Card>;
    })}
    {visible.length > limit && <Button label="View more" variant="outline" onPress={() => setLimit(value => value + 10)} />}
  </Screen>;
}
