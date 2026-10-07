import React, { useState } from 'react';
import { Animated, Platform, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { formatMoney, payTimeLabel } from '../../lib/data';
import type { Currency } from '../../lib/data';
import type { DashboardDay } from '../../lib/dashboard-data';
import { useLanguage } from '../../lib/i18n';
import { Text } from '../LocalizedText';
import { Pressable } from '../LocalizedPressable';
import { useTheme } from '../theme';
import { BentoTitle, useDashboardEntrance } from './Bento';

export function Sparkline({ values, color, width = 82, height = 28 }: { values: number[]; color?: string; width?: number; height?: number }) {
  const C = useTheme().colors;
  const max = Math.max(1, ...values);
  const points = values.map((value, i) => `${3 + i * (width - 6) / Math.max(1, values.length - 1)},${height - 3 - value / max * (height - 6)}`).join(' ');
  return <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} accessible={Platform.OS === 'web' ? undefined : false} aria-hidden={true}><Polyline points={points} fill="none" stroke={color ?? C.green} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

export function ActivityChart({ days, currency, admin }: { days: DashboardDay[]; currency: Currency; admin: boolean }) {
  const C = useTheme().colors;
  const { language, t } = useLanguage();
  const [metric, setMetric] = useState<'hours' | 'pay'>('hours');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const selected = days.find(day => day.date === selectedDate) ?? days[days.length - 1];
  const progress = useDashboardEntrance(150, false, metric);
  const values = days.map(day => metric === 'hours' ? day.paidSeconds / 3600 : day.earningsCents / 100);
  const max = Math.max(1, ...values);
  const ceiling = metric === 'hours' ? Math.ceil(max) : max;
  const totalSeconds = days.reduce((sum, day) => sum + day.paidSeconds, 0);
  const totalPay = days.reduce((sum, day) => sum + day.earningsCents, 0);
  const hasData = values.some(value => value > 0);
  const selectedLabel = new Date(`${selected.date}T12:00:00`).toLocaleDateString(language, { weekday: 'long', month: 'short', day: 'numeric' });
  return <View>
    <BentoTitle title={admin ? 'Team activity' : 'Your working rhythm'} detail="Last 7 days" />
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
      <View><Text style={{ fontSize: 30, lineHeight: 36, letterSpacing: -1.2, color: C.ink }}>{metric === 'hours' ? payTimeLabel(totalSeconds) : formatMoney(totalPay, currency)}</Text><Text style={{ color: C.muted, fontSize: 11, marginTop: 5 }}>{metric === 'hours' ? 'Paid time recorded' : 'Estimated earnings'}</Text></View>
      <View style={{ flexDirection: 'row', padding: 4, borderRadius: 12, backgroundColor: C.subtle }}>{(['hours', 'pay'] as const).map(item => <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: metric === item }} accessibilityLabel={item === 'hours' ? t('Hours') : t('Estimated earnings')} onPress={() => setMetric(item)} style={{ minHeight: 40, paddingHorizontal: 13, justifyContent: 'center', borderRadius: 9, backgroundColor: metric === item ? C.surface : 'transparent' }}><Text style={{ color: metric === item ? C.green : C.muted, fontSize: 12, fontWeight: '500' }}>{item === 'hours' ? 'Hours' : 'Pay'}</Text></Pressable>)}</View>
    </View>
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <View style={{ width: metric === 'hours' ? 24 : 56, height: 144, justifyContent: 'space-between', alignItems: 'flex-end' }}>{[ceiling, ceiling / 2, 0].map((tick, i) => <Text key={i} numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 10, color: C.muted }}>{metric === 'hours' ? `${Number(tick.toFixed(1))}h` : new Intl.NumberFormat(language, { notation: 'compact', maximumFractionDigits: 1 }).format(tick)}</Text>)}</View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 144, justifyContent: 'space-between' }}>{[0, 1, 2].map(i => <View key={i} style={{ borderTopWidth: 1, borderTopColor: C.line, opacity: .7 }} />)}</View>
        <View style={{ flexDirection: 'row', gap: 8 }}>{days.map((day, i) => {
          const isSelected = day.date === selected.date;
          const height = values[i] > 0 ? Math.max(5, values[i] / ceiling * 138) : 2;
          const weekday = new Date(`${day.date}T12:00:00`).toLocaleDateString(language, { weekday: 'short' });
          return <Pressable key={day.date} accessibilityRole="button" accessibilityState={{ selected: isSelected }} accessibilityLabel={`${new Date(`${day.date}T12:00:00`).toLocaleDateString(language, { weekday: 'long', month: 'short', day: 'numeric' })}: ${metric === 'hours' ? payTimeLabel(day.paidSeconds) : formatMoney(day.earningsCents, currency)}`} onPress={() => setSelectedDate(day.date)} style={({ pressed }) => ({ flex: 1, minWidth: 0, opacity: pressed ? .65 : 1 })}>
            <View style={{ height: 144, justifyContent: 'flex-end', paddingHorizontal: 3 }}><Animated.View style={{ height: progress.interpolate({ inputRange: [0, 1], outputRange: [2, height] }), borderTopLeftRadius: 7, borderTopRightRadius: 7, backgroundColor: values[i] === 0 ? C.line : isSelected ? C.green : C.accent }} /></View><Text numberOfLines={1} adjustsFontSizeToFit style={{ color: isSelected ? C.green : C.muted, fontSize: 10, fontWeight: isSelected ? '600' : '400', textAlign: 'center', marginTop: 11 }}>{weekday}</Text>
          </Pressable>;
        })}</View>
      </View>
    </View>
    <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingTop: 17, marginTop: 18, borderTopWidth: 1, borderTopColor: C.line }}><Text style={{ color: C.muted, fontSize: 11, flex: 1 }}>{hasData ? selectedLabel : 'Your activity appears after clocking in.'}</Text><Text style={{ color: C.green, fontSize: 12, fontWeight: '600' }}>{metric === 'hours' ? payTimeLabel(selected.paidSeconds) : formatMoney(selected.earningsCents, currency)}</Text></View>
  </View>;
}

export function AttendanceRing({ arrived, scheduled, active, missing }: { arrived: number; scheduled: number; active: number; missing: number }) {
  const C = useTheme().colors;
  const percent = scheduled > 0 ? Math.min(1, arrived / scheduled) : 0;
  const circumference = 2 * Math.PI * 54;
  return <View>
    <BentoTitle title="Attendance today" detail={scheduled ? 'Check-ins across today’s crew' : 'Your crew’s day starts here'} />
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
      <View accessible accessibilityLabel={`${arrived} of ${scheduled} scheduled people have checked in`} style={{ width: 132, height: 132 }}><Svg width={132} height={132} viewBox="0 0 132 132" accessible={Platform.OS === 'web' ? undefined : false} aria-hidden={true}><Circle cx={66} cy={66} r={54} stroke={C.mint} strokeWidth={10} fill="none" /><Circle cx={66} cy={66} r={54} stroke={C.green} strokeWidth={10} fill="none" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * (1 - percent)} strokeLinecap={percent ? 'round' : 'butt'} transform="rotate(-90 66 66)" /></Svg><View pointerEvents="none" style={{ position: 'absolute', inset: 0, justifyContent: 'center', alignItems: 'center' }}><Text style={{ fontSize: 29, letterSpacing: -1, color: C.ink }}>{scheduled ? `${Math.round(percent * 100)}%` : '—'}</Text><Text style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>checked in</Text></View></View>
      <View style={{ gap: 15, minWidth: 112 }}>{[{ label: 'Arrived', value: arrived, color: C.green }, { label: 'On the clock', value: active, color: C.muted }, { label: 'Not arrived', value: missing, color: missing ? C.warningText : C.muted }].map(item => <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: item.color }} /><Text style={{ fontSize: 11, color: C.muted, flex: 1 }}>{item.label}</Text><Text style={{ fontSize: 13, fontWeight: '600', color: item.color }}>{item.value}</Text></View>)}</View>
    </View>
  </View>;
}

export function EarningsLine({ days }: { days: DashboardDay[] }) {
  const C = useTheme().colors;
  const max = Math.max(1, ...days.map(day => day.earningsCents));
  const points = days.map((day, i) => `${12 + i * 276 / 6},${76 - day.earningsCents / max * 58}`).join(' ');
  return <View style={{ height: 90, marginTop: 20 }}><Svg width="100%" height="100%" viewBox="0 0 300 90" preserveAspectRatio="none" accessible={Platform.OS === 'web' ? undefined : false} aria-hidden={true}>{[18, 47, 76].map(y => <Line key={y} x1={0} y1={y} x2={300} y2={y} stroke={C.line} strokeWidth={1} />)}<Polyline points={points} fill="none" stroke={C.green} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />{days.map((day, i) => <Circle key={day.date} cx={12 + i * 276 / 6} cy={76 - day.earningsCents / max * 58} r={i === 6 ? 5 : 3} fill={C.green} />)}</Svg></View>;
}
