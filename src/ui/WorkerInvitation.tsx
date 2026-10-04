import { Disclosure } from './Disclosure';
import React, { useState } from 'react';
import { Platform, Share, View } from 'react-native';
import { useStore } from '../lib/store';
import { useLanguage } from '../lib/i18n';
import { Text, TextInput } from './LocalizedText';
import { Button, Card, Pill } from './components';
import { ChoiceChips } from './ChoiceChips';
import { useTheme } from './theme';

export function WorkerInvitation({ workerId, alwaysOpen = false }: { workerId?: string; alwaysOpen?: boolean }) {
  const C = useTheme().colors;
  const { t } = useLanguage();
  const { online, role, workers, inviteWorker, workspaceName } = useStore();
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState(workerId ?? '');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [instructions, setInstructions] = useState('');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  if (!online || role !== 'admin') return null;
  const people = workers.filter(w => !w.archived && w.name.toLowerCase().includes(query.toLowerCase()));
  const save = async () => {
    if (busy) return;
    if (!selected || !workers.some(w => w.id === selected && !w.archived)) return setMessage('Choose a worker first.');
    const address = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return setMessage('Enter a valid email address.');
    setBusy(true);
    setMessage('');
    setInstructions('');
    try {
      const result = await inviteWorker(selected, address);
      setMessage(result.message);
      if (result.ok) setInstructions(t(`You're invited to ${workspaceName || 'Tempo'}! Open https://tempo-workforce.vercel.app/ and choose “Join an existing team”. Create your account with ${address}, then confirm your email and sign in.`));
    } catch { setMessage('Could not save the invitation. Try again.'); }
    finally { setBusy(false); }
  };
  const share = async () => {
    try {
      if (Platform.OS === 'web') { await navigator.clipboard.writeText(instructions); setMessage('Join instructions copied.'); }
      else await Share.share({ message: instructions });
    } catch { setMessage('Select and copy the instructions below.'); }
  };
  return <View style={{ marginVertical: 12 }}>
    {!alwaysOpen && <Button label={expanded ? 'Close invitation' : 'Invite a worker'} variant="outline" onPress={() => setExpanded(value => !value)} />}
    <Disclosure open={alwaysOpen || expanded}><Card style={{ marginTop: alwaysOpen ? 0 : 12, gap: 12 }}>
      {alwaysOpen && <Text accessibilityRole="header" style={{ color: C.ink, fontSize: 19, fontWeight: '600' }}>Invite a worker</Text>}
      <Text style={{ color: C.muted, fontSize: 14, lineHeight: 22 }}>Save their sign-in email, then share the join instructions.</Text>
      {!workerId && <><TextInput accessibilityLabel="Search people" placeholder="Search people" value={query} onChangeText={setQuery} style={{ minHeight: 48, paddingHorizontal: 12, borderWidth: 1, borderColor: C.line, borderRadius: 10, fontSize: 16 }} /><ChoiceChips label="Choose a worker" options={people.map(w => ({ value: w.id, label: w.name }))} value={selected} onChange={value => { setSelected(value); setMessage(''); setInstructions(''); }} /></>}
      <Text style={{ fontSize: 14, fontWeight: '600' }}>{workers.find(w => w.id === selected)?.name ?? t('Choose a worker')}</Text>
      <TextInput accessibilityLabel="Worker email" placeholder="worker@example.com" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" value={email} onChangeText={value => { setEmail(value); setInstructions(''); setMessage(''); }} style={{ minHeight: 48, paddingHorizontal: 12, borderWidth: 1, borderColor: C.line, borderRadius: 10, fontSize: 16 }} />
      <Button label={busy ? 'Saving…' : 'Save invitation'} disabled={busy || !selected || !email.trim()} onPress={() => void save()} />
      {!!message && <Text accessibilityLiveRegion="polite" style={{ fontSize: 14, lineHeight: 22 }}>{message}</Text>}
      {!!instructions && <><Pill>Invitation saved</Pill><Text selectable style={{ fontSize: 14, lineHeight: 22 }}>{instructions}</Text><Button label={Platform.OS === 'web' ? 'Copy join instructions' : 'Share join instructions'} variant="outline" onPress={() => void share()} /></>}
    </Card></Disclosure>
  </View>;
}
