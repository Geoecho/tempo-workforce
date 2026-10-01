import { router } from 'expo-router';
import { Send } from 'lucide-react-native';
import React, { useState, useRef } from 'react';
import { View, TextInput, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { Pressable } from '../ui/LocalizedPressable';
import { Text } from '../ui/LocalizedText';
import { useStore } from '../lib/store';
import { Card, Screen } from '../ui/components';
import { useTheme } from '../ui/theme';

export default function Messages() {
  const C = useTheme().colors;
  const { messages, sendMessage, markMessageRead, role, selectedWorkerId, workers, workspaceName } = useStore();
  const [text, setText] = useState('');
  const [target, setTarget] = useState<string>('all');
  const scrollRef = useRef<ScrollView>(null);
  
  const relevantMessages = messages.filter(m => {
    if (target === 'all') return m.to === 'all';
    
    if (role === 'admin') {
      return (m.to === target && m.from === 'admin') || (m.from === target && m.to === 'admin');
    } else {
      return (m.to === selectedWorkerId && m.from === 'admin') || (m.from === selectedWorkerId && m.to === 'admin');
    }
  }).sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const send = async () => {
    if (!text.trim()) return;
    const body = text;
    setText('');
    await sendMessage(target, body);
  };

  const getSenderName = (fromId: string) => {
    if (fromId === 'admin') return workspaceName || 'Admin';
    return workers.find(w => w.id === fromId)?.name || 'Unknown';
  };

  React.useEffect(() => {
    relevantMessages.forEach(m => {
      if (!m.readAt && m.from !== (role === 'admin' ? 'admin' : selectedWorkerId)) {
        markMessageRead(m.id);
      }
    });
  }, [relevantMessages, role, selectedWorkerId, markMessageRead]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [relevantMessages.length]);

  return <Screen back noScroll title="Messages" subtitle="Chat with your team">
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0} style={{ flex: 1 }}>
      <View style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          <Pressable onPress={() => setTarget('all')} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: target === 'all' ? C.green : C.surface, borderWidth: 1, borderColor: target === 'all' ? C.green : C.line }}>
            <Text style={{ color: target === 'all' ? C.onGreen : C.ink, fontSize: 13, fontWeight: '500' }}>All Team</Text>
          </Pressable>
          
          {role === 'admin' ? (
            workers.filter(w => !w.archived).map(w => (
              <Pressable key={w.id} onPress={() => setTarget(w.id)} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: target === w.id ? C.green : C.surface, borderWidth: 1, borderColor: target === w.id ? C.green : C.line }}>
                <Text style={{ color: target === w.id ? C.onGreen : C.ink, fontSize: 13, fontWeight: '500' }}>{w.name.split(' ')[0]}</Text>
              </Pressable>
            ))
          ) : (
            <Pressable onPress={() => setTarget('admin')} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: target === 'admin' ? C.green : C.surface, borderWidth: 1, borderColor: target === 'admin' ? C.green : C.line }}>
              <Text style={{ color: target === 'admin' ? C.onGreen : C.ink, fontSize: 13, fontWeight: '500' }}>{workspaceName || 'Admin'}</Text>
            </Pressable>
          )}
        </View>

        <ScrollView 
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => scrollRef.current?.scrollToEnd({ animated: false })}
          style={{ flex: 1, marginBottom: 16 }} 
          contentContainerStyle={{ paddingBottom: 20 }}
        >
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
