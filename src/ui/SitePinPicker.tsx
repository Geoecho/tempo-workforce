import * as Location from 'expo-location';
import { MapPin, Navigation2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { View } from 'react-native';
import { Pressable } from './LocalizedPressable';
import { Text, TextInput } from './LocalizedText';
import { openSiteMap, parseSitePin, SitePin } from '../lib/site-location';
import { C } from './theme';

export function SitePinPicker({ pin, onChange, site, location }: { pin: SitePin | null; onChange: (pin: SitePin | null) => void; site: string; location: string }) {
  const [entry, setEntry] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const setFromEntry = () => {
    const parsed = parseSitePin(entry);
    if (!parsed) { setMessage('Paste coordinates like 41.998, 21.425 or a Maps link containing coordinates.'); return; }
    onChange(parsed);
    setEntry('');
    setMessage('Site pin saved.');
  };
  const setFromDevicePosition = async () => {
    setBusy(true);
    setMessage('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error('Location permission is needed to use this device’s position.');
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      onChange({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      setMessage('Site pin saved from this device. Check it on the map before saving.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not get this device’s position.'); }
    setBusy(false);
  };
  return <View style={{ marginBottom: 21 }}>
    <Text style={{ color: C.ink, fontWeight: '500', fontSize: 13, marginBottom: 7 }}>Site pin</Text>
    <Text style={{ color: C.muted, fontSize: 12, lineHeight: 18, marginBottom: 10 }}>Optional. Set the entrance or meeting point precisely so workers can open directions.</Text>
    <TextInput accessibilityLabel="Site pin coordinates or Maps link" value={entry} onChangeText={setEntry} onSubmitEditing={setFromEntry} placeholder="Coordinates or Maps link" placeholderTextColor="#9DA9A2" autoCapitalize="none" autoCorrect={false} style={{ minHeight: 46, borderRadius: 11, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, paddingHorizontal: 13, color: C.ink }} />
    <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 9 }}>
      <Pressable accessibilityRole="button" onPress={setFromEntry} style={{ paddingVertical: 8, paddingRight: 8 }}><Text style={{ color: C.green, fontWeight: '500', fontSize: 12 }}>Set pin</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => void setFromDevicePosition()} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8 }}><Navigation2 size={14} color={C.green} /><Text style={{ color: C.green, fontWeight: '500', fontSize: 12 }}>{busy ? 'Finding position…' : 'Use my position'}</Text></Pressable>
      {!!(pin || location.trim()) && <Pressable accessibilityRole="button" onPress={() => void openSiteMap({ site, location, latitude: pin?.latitude, longitude: pin?.longitude })} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8 }}><MapPin size={14} color={C.green} /><Text style={{ color: C.green, fontWeight: '500', fontSize: 12 }}>Preview map</Text></Pressable>}
    </View>
    {pin && <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}><Text style={{ color: C.ink, fontSize: 12 }}>Pinned at {pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)}</Text><Pressable accessibilityRole="button" onPress={() => { onChange(null); setMessage('Pin removed.'); }}><Text style={{ color: C.red, fontSize: 12, fontWeight: '500' }}>Remove</Text></Pressable></View>}
    {!!message && <Text style={{ color: message.includes('saved') ? C.green : C.red, fontSize: 11, lineHeight: 17, marginTop: 5 }}>{message}</Text>}
  </View>;
}
