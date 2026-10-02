import { MonitorSmartphone, Moon, RotateCcw, ShieldCheck, Sun, UserRound } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Platform, Share, useWindowDimensions, View } from 'react-native';
import { Pressable } from '../ui/LocalizedPressable';
import { Text, TextInput } from '../ui/LocalizedText';
import { CURRENCIES, initialState } from '../lib/data';
import { useStore } from '../lib/store';
import { LANGUAGES, useLanguage } from '../lib/i18n';
import { Avatar, Button, Card, Screen, Section, SelectionMark } from '../ui/components';
import { FeedbackControls } from '../ui/FeedbackControls';
import { ThemePreference, useTheme } from '../ui/theme';

export default function Settings() {
  const { colors: C, preference, setPreference } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { role, setRole, selectedWorkerId, setSelectedWorker, workers, shifts, currency, setCurrency, setWorkspaceName, workspaceName, punches, restoreWorker, restoreShift, reset, online, syncError, accountEmail, inviteWorker, signOut } = useStore();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= 1200;
  const [showAllCurrencies, setShowAllCurrencies] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteWorkerId, setInviteWorkerId] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteInstructions, setInviteInstructions] = useState('');
  const [name, setName] = useState(workspaceName ?? 'Tempo workspace');
  const current = workers.find(w => w.id === selectedWorkerId && !w.archived) ?? workers.find(w => !w.archived) ?? { ...initialState.workers[0], name: workspaceName || 'Tempo', initials: (workspaceName || 'Tempo').slice(0, 1).toUpperCase() };
  const confirmReset = () => {
    if (Platform.OS === 'web') { if (window.confirm(t('Reset all local demo data on this device?'))) reset(); return; }
    Alert.alert(t('Reset demo?'), t('This clears all workers, shifts, and clock events created on this device.'), [{ text: t('Cancel') }, { text: t('Reset'), style: 'destructive', onPress: reset }]);
  };
  return <Screen title="Settings" subtitle="Manage your preferences, account, and team.">
    <View style={{ flexDirection: desktop ? 'row' : 'column', alignItems: 'flex-start', gap: desktop ? 24 : 0 }}>
    <View style={{ flex: desktop ? 1 : undefined, width: desktop ? undefined : '100%', minWidth: 0 }}>
    <Card style={{ flexDirection: 'row', alignItems: 'center' }}><Avatar worker={current} size={50} /><View style={{ marginLeft: 14 }}><Text style={{ fontSize: 17, fontWeight: '500', color: C.ink }}>{role === 'admin' ? (workspaceName || 'Tempo workspace') : current.name}</Text><Text style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>{role === 'admin' ? t('Organization admin') : current.role}</Text></View></Card>
    <Section title="Appearance" />
    <Text style={{ color: C.muted, fontSize: 12, marginBottom: 11 }}>Choose how Tempo looks on this device.</Text>
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 8 }}>
      {([
        { value: 'system', label: 'System', Icon: MonitorSmartphone },
        { value: 'light', label: 'Light', Icon: Sun },
        { value: 'dark', label: 'Dark', Icon: Moon },
      ] as const).map(({ value, label, Icon }) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: preference === value }} onPress={() => setPreference(value as ThemePreference)} style={{ flex: 1, minHeight: 70, alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, borderWidth: 1, borderColor: preference === value ? C.green : C.line, backgroundColor: preference === value ? C.mint : C.surface }}><Icon size={19} color={preference === value ? C.green : C.muted} /><Text style={{ color: preference === value ? C.green : C.ink, fontSize: 12, fontWeight: preference === value ? '600' : '400' }}>{label}</Text></Pressable>)}
    </View>
    <Section title="Language" />
    <Text style={{ color: C.muted, fontSize: 12, marginBottom: 11 }}>{t('Choose your app language.')}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{LANGUAGES.map(item => <Pressable key={item.code} accessibilityRole="radio" accessibilityState={{ checked: language === item.code }} onPress={() => setLanguage(item.code)} style={{ backgroundColor: language === item.code ? C.green : C.surface, borderColor: language === item.code ? C.green : C.line, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11 }}><Text style={{ color: language === item.code ? C.onGreen : C.ink, fontWeight: '500' }}>{item.label}</Text></Pressable>)}</View>
    <FeedbackControls worker={role === 'worker'} />
    </View>
    <View style={{ flex: desktop ? 1 : undefined, width: desktop ? undefined : '100%', minWidth: 0 }}>
    {online && role === 'admin' && <><Section title="Workspace name" /><Card><TextInput accessibilityLabel={t('Workspace name')} value={name} onChangeText={setName} placeholder={t('Your organization')} placeholderTextColor={C.placeholder} style={{ borderWidth: 1, borderColor: C.line, borderRadius: 11, padding: 12, color: C.ink, backgroundColor: C.surface }} /><View style={{ marginTop: 12 }}><Button label="Save name" onPress={() => setWorkspaceName(name)} /></View></Card></>}
    {online && <><Section title="Online account" /><Card>
      <Text style={{ color: C.ink, fontWeight: '500' }}>{accountEmail}</Text>
      <Text style={{ color: C.muted, marginTop: 7, fontSize: 12 }}>{t('Changes sync between signed-in devices.')}</Text>
      {syncError && <Text style={{ color: C.red, marginTop: 10, fontSize: 12 }}>Sync error: {syncError}</Text>}
      <Pressable accessibilityRole="button" onPress={() => void signOut()} style={{ marginTop: 15, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: C.red, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: C.red, fontWeight: '500', fontSize: 15 }}>{t('Sign out')}</Text></Pressable>
    </Card></>}
    {online && role === 'admin' && <><Section title="Invite a worker" /><Card>
      <Text style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>Choose a worker profile, then save the email they will use to create an account.</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 12 }}>
        {workers.filter(w => !w.archived).map(w => <Pressable key={w.id} onPress={() => setInviteWorkerId(w.id)} style={{ backgroundColor: inviteWorkerId === w.id ? C.green : C.mint, paddingHorizontal: 11, paddingVertical: 9, borderRadius: 10 }}><Text style={{ color: inviteWorkerId === w.id ? C.onGreen : C.green, fontWeight: '500' }}>{w.name}</Text></Pressable>)}
      </View>
      <TextInput accessibilityLabel="Worker email" autoCapitalize="none" keyboardType="email-address" placeholder="worker@example.com" placeholderTextColor={C.placeholder} value={inviteEmail} onChangeText={setInviteEmail} style={{ borderWidth: 1, borderColor: C.line, borderRadius: 11, padding: 12, color: C.ink }} />
      <Pressable onPress={async () => { const email = inviteEmail.trim().toLowerCase(); const result = await inviteWorker(inviteWorkerId, email); setInviteMessage(result.message); if (result.ok) { setInviteInstructions(t(`You're invited to ${workspaceName || 'Tempo'}! Open https://tempo-workforce.vercel.app/ and choose “Join an existing team”. Create your account with ${email}, then confirm your email and sign in.`)); setInviteEmail(''); } }} style={{ backgroundColor: C.green, borderRadius: 11, padding: 12, marginTop: 11, alignItems: 'center' }}><Text style={{ color: C.onGreen, fontWeight: '500' }}>{t('Save invitation')}</Text></Pressable>
      {!!inviteMessage && <Text style={{ color: C.muted, fontSize: 12, lineHeight: 18, marginTop: 10 }}>{inviteMessage}</Text>}
      {!!inviteInstructions && <><Text selectable style={{ color: C.ink, fontSize: 12, lineHeight: 19, marginTop: 11 }}>{inviteInstructions}</Text><Pressable accessibilityRole="button" onPress={async () => { try { if (Platform.OS === 'web') { await navigator.clipboard.writeText(inviteInstructions); setInviteMessage('Join instructions copied.'); } else await Share.share({ message: inviteInstructions }); } catch { setInviteMessage('Select and copy the instructions above.'); } }} style={{ alignSelf: 'flex-start', paddingVertical: 11 }}><Text style={{ color: C.green, fontWeight: '500' }}>{Platform.OS === 'web' ? 'Copy join instructions' : 'Share join instructions'}</Text></Pressable></>}
    </Card></>}
    {!online && <><Section title="View as" /><Text style={{ color: C.muted, fontSize: 13, lineHeight: 19, marginBottom: 13 }}>{t('Switch roles to explore both sides of the workflow.')}</Text>
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <Pressable onPress={() => setRole('admin')} style={{ flex: 1 }}><Card style={{ borderColor: role === 'admin' ? C.green : C.line, backgroundColor: role === 'admin' ? C.mint : C.surface }}><ShieldCheck size={21} color={C.green} /><Text style={{ color: C.ink, fontWeight: '500', marginTop: 13 }}>{t('Admin')}</Text><Text style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>{t('Plan & oversee')}</Text></Card></Pressable>
      <Pressable onPress={() => setRole('worker')} style={{ flex: 1 }}><Card style={{ borderColor: role === 'worker' ? C.green : C.line, backgroundColor: role === 'worker' ? C.mint : C.surface }}><UserRound size={21} color={C.green} /><Text style={{ color: C.ink, fontWeight: '500', marginTop: 13 }}>{t('Worker')}</Text><Text style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>{t('Shifts & hours')}</Text></Card></Pressable>
    </View>
    {role === 'worker' && <><Section title="Demo worker" /><Card style={{ padding: 0, overflow: 'hidden' }}>{workers.filter(w => !w.archived).map((w, i) => <Pressable key={w.id} onPress={() => setSelectedWorker(w.id)} style={{ flexDirection: 'row', alignItems: 'center', padding: 13, borderTopWidth: i ? 1 : 0, borderColor: C.line }}><Avatar worker={w} size={35} /><Text style={{ flex: 1, marginLeft: 11, color: C.ink, fontWeight: '600' }}>{w.name}</Text><SelectionMark selected={selectedWorkerId === w.id} round /></Pressable>)}</Card></>}</>}
    {role === 'admin' && <><Section title="Pay currency" /><Text style={{ color: C.muted, fontSize: 12, lineHeight: 18, marginBottom: 11 }}>Set before recording time. The currency locks after the first clock event. Changing it relabels hourly rates; enter the correct rate for each worker afterward.</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{(showAllCurrencies ? CURRENCIES : [...CURRENCIES.slice(0, 4), ...CURRENCIES.filter(item => item === currency && !CURRENCIES.slice(0, 4).includes(item))]).map(item => <Pressable key={item} disabled={!!punches.length} onPress={() => setCurrency(item)} style={{ backgroundColor: currency === item ? C.green : C.surface, borderWidth: 1, borderColor: currency === item ? C.green : C.line, borderRadius: 12, minWidth: 56, alignItems: 'center', paddingHorizontal: 11, paddingVertical: 10, opacity: punches.length && currency !== item ? .45 : 1 }}><Text style={{ color: currency === item ? C.onGreen : C.ink, fontWeight: '500', fontSize: 12 }}>{item}</Text></Pressable>)}</View><Pressable onPress={() => setShowAllCurrencies(v => !v)} style={{ alignSelf: 'flex-start', paddingVertical: 10, marginTop: 3 }}><Text style={{ color: C.green, fontSize: 12, fontWeight: '500' }}>{showAllCurrencies ? 'Show fewer currencies' : `Show ${CURRENCIES.length - 4} more currencies`}</Text></Pressable></>}
    {role === 'admin' && (workers.some(w => w.archived) || shifts.some(s => s.archived)) && <><Section title="Archived records" /><Text style={{ color: C.muted, fontSize: 12, marginBottom: 11 }}>Kept for time and pay history. Restore a record to show it in active lists again.</Text><Card style={{ padding: 0, overflow: 'hidden' }}>{workers.filter(w => w.archived).map(w => <View key={w.id} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C.line }}><Text style={{ flex: 1, color: C.ink, fontWeight: '600' }}>{w.name} · worker</Text><Pressable accessibilityLabel={`Restore ${w.name}`} onPress={() => restoreWorker(w.id)}><Text style={{ color: C.green, fontWeight: '500' }}>Restore</Text></Pressable></View>)}{shifts.filter(s => s.archived).map(s => <View key={s.id} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C.line }}><Text style={{ flex: 1, color: C.ink, fontWeight: '600' }}>{s.title} · shift</Text><Pressable accessibilityLabel={`Restore ${s.title}`} onPress={() => restoreShift(s.id)}><Text style={{ color: C.green, fontWeight: '500' }}>Restore</Text></Pressable></View>)}</Card></>}
    {!online && <Pressable onPress={confirmReset} style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 27, padding: 5 }}><RotateCcw size={17} color={C.red} /><Text style={{ color: C.red, fontWeight: '500', fontSize: 13 }}>{t('Reset demo data')}</Text></Pressable>}
    </View>
    </View>
  </Screen>;
}
