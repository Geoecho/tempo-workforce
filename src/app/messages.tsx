import { router } from 'expo-router';
import { Send } from 'lucide-react-native';
import React, { useState } from 'react';
import { View, TextInput, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { Pressable } from '../ui/LocalizedPressable';
import { Text } from '../ui/LocalizedText';
import { useStore } from '../lib/store';
import { Card, Screen } from '../ui/components';
import { useTheme } from '../ui/theme';

export default function Messages() {
  const C = useTheme().colors;
  const { messages, sendMessage, markMessageRead, role, selectedWorkerId, workers } = useStore();
  const [text, setText] = useState('');
  const [target, setTarget] = useState<string>('all');
  
  const relevantMessages = messages.filter(m => {
    if (role === 'admin') {
      if (target === 'all') return true;
      return m.to === target || m.from === target || m.to === 'all';
    }
    return m.to === 'all' || m.to === selectedWorkerId || m.from === selectedWorkerId;
  }).sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const send = async () => {
    if (!text.trim()) return;
    const body = text;
    setText('');
    await sendMessage(role === 'admin' ? target : 'admin', body);
  };

  const getSenderName = (fromId: string) => {
    if (fromId === 'admin') return 'Admin';
    return workers.find(w => w.id === fromId)?.name || 'Unknown';
  };

  React.useEffect(() => {
    relevantMessages.forEach(m => {
      if (!m.readAt && m.from !== (role === 'admin' ? 'admin' : selectedWorkerId)) {
        markMessageRead(m.id);
      }
    });
  }, [relevantMessages, role, selectedWorkerId, markMessageRead]);

  return <Screen back noScroll title="Messages" subtitle={role === 'admin' ? 'Broadcast to team or message individuals' : 'Messages from admin'}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <View style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {role === 'admin' && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            <Pressable onPress={() => setTarget('all')} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: target === 'all' ? C.green : C.surface, borderWidth: 1, borderColor: target === 'all' ? C.green : C.line }}>
              <Text style={{ color: target === 'all' ? C.onGreen : C.ink, fontSize: 13, fontWeight: '500' }}>All Team</Text>
            </Pressable>
            {workers.filter(w => !w.archived).map(w => (
              <Pressable key={w.id} onPress={() => setTarget(w.id)} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: target === w.id ? C.green : C.surface, borderWidth: 1, borderColor: target === w.id ? C.green : C.line }}>
                <Text style={{ color: target === w.id ? C.onGreen : C.ink, fontSize: 13, fontWeight: '500' }}>{w.name.split(' ')[0]}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <ScrollView style={{ flex: 1, marginBottom: 16 }} contentContainerStyle={{ paddingBottom: 20 }}>
          {relevantMessages.length === 0 ? (
            <Text style={{ color: C.muted, textAlign: 'center', marginTop: 40 }}>No messages yet.</Text>
          ) : (
            relevantMessages.map(m => {
              const isMe = m.from === (role === 'admin' ? 'admin' : selectedWorkerId);
              return (
                <View key={m.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%', marginBottom: 12 }}>
                  <Text style={{ fontSize: 11, color: C.muted, marginBottom: 4, marginLeft: 4 }}>{getSenderName(m.from)}</Text>
                  <Card style={{ padding: 12, backgroundColor: isMe ? C.mint : C.surface, borderColor: isMe ? C.green : C.line, borderRadius: 16, borderBottomRightRadius: isMe ? 4 : 16, borderBottomLeftRadius: isMe ? 16 : 4 }}>
                    <Text style={{ color: C.ink, fontSize: 14 }}>{m.body}</Text>
                  </Card>
                  <Text style={{ fontSize: 10, color: C.muted, alignSelf: 'flex-end', marginTop: 4 }}>
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              );
            })
          )}
        </ScrollView>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 16 }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor={C.placeholder}
            style={{ flex: 1, height: 48, backgroundColor: C.field, borderRadius: 24, paddingHorizontal: 16, color: C.ink, borderWidth: 1, borderColor: C.line }}
          />
          <Pressable onPress={send} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' }}>
            <Send size={20} color={C.onGreen} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  </Screen>;
}
