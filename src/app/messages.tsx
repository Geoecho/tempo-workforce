import { router } from 'expo-router';
import { Send } from 'lucide-react-native';
import React, { useState } from 'react';
import { View, TextInput, ScrollView, StyleSheet } from 'react-native';
import { Pressable } from '../ui/LocalizedPressable';
import { Text } from '../ui/LocalizedText';
import { useStore } from '../lib/store';
import { Card, Screen } from '../ui/components';
import { useTheme } from '../ui/theme';

export default function Messages() {
  const C = useTheme().colors;
  const { messages, sendMessage, markMessageRead, role, selectedWorkerId, workers } = useStore();
  const [text, setText] = useState('');
  
  const relevantMessages = messages.filter(m => 
    role === 'admin' ? true : m.to === 'all' || m.to === selectedWorkerId || m.from === selectedWorkerId
  ).sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const send = async () => {
    if (!text.trim()) return;
    await sendMessage(role === 'admin' ? 'all' : 'admin', text);
    setText('');
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
  }, [relevantMessages, role, selectedWorkerId]);

  return <Screen back title="Messages" subtitle={role === 'admin' ? 'Broadcast to team' : 'Messages from admin'}>
    <View style={{ flex: 1, minHeight: 400 }}>
      <ScrollView style={{ flex: 1, marginBottom: 16 }}>
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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
  </Screen>;
}
