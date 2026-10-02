import { ArrowDown, MoreHorizontal, Search, Send, Smile, UserRound, UsersRound, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import { useStore } from '../lib/store';
import { Pressable } from '../ui/LocalizedPressable';
import { Text } from '../ui/LocalizedText';
import { Avatar, Card, Screen } from '../ui/components';
import { useTheme } from '../ui/theme';

export default function Messages() {
  const C = useTheme().colors;
  const { messages, sendMessage, markMessageRead, role, selectedWorkerId, workers } = useStore();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= 960;
  const [text, setText] = useState('');
  const [target, setTarget] = useState<string>('all');
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const keepComposerFocus = Platform.OS === 'web' ? { onMouseDown: (event: React.MouseEvent) => event.preventDefault() } : {};
  const emojis = ['😊', '😂', '❤️', '👍', '🎉', '🙌', '👏', '🙏', '👀', '✅', '🔥', '💬'];
  const activeWorkers = workers.filter(worker => !worker.archived);
  const conversations = role === 'admin'
    ? [{ id: 'all', name: 'All team', worker: undefined }, ...activeWorkers.map(worker => ({ id: worker.id, name: worker.name, worker }))]
    : [{ id: 'all', name: 'All team', worker: undefined }, { id: 'admin', name: 'Admin', worker: undefined }];

  const getConversationMessages = useCallback((conversationId: string) => messages.filter(message => {
    if (conversationId === 'all') return message.to === 'all';
    if (role === 'admin') return (message.to === conversationId && message.from === 'admin') || (message.from === conversationId && message.to === 'admin');
    return (message.to === selectedWorkerId && message.from === 'admin') || (message.from === selectedWorkerId && message.to === 'admin');
  }).sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [messages, role, selectedWorkerId]);

  const relevantMessages = useMemo(() => getConversationMessages(target), [getConversationMessages, target]);
  const visibleMessages = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return query ? relevantMessages.filter(message => message.body.toLocaleLowerCase().includes(query)) : relevantMessages;
  }, [relevantMessages, searchQuery]);
  const ownId = role === 'admin' ? 'admin' : selectedWorkerId;
  const send = async () => {
    if (!text.trim()) return;
    const body = text;
    setText('');
    await sendMessage(target, body);
  };
  const getSenderName = (fromId: string) => fromId === 'admin' ? 'Admin' : workers.find(worker => worker.id === fromId)?.name || 'Unknown';

  useEffect(() => {
    relevantMessages.forEach(message => {
      if (!message.readAt && message.from !== ownId) void markMessageRead(message.id);
    });
  }, [relevantMessages, ownId, markMessageRead]);

  const selectConversation = (conversationId: string) => {
    setTarget(conversationId);
    setChatMenuOpen(false);
    setSearchOpen(false);
    setSearchQuery('');
    setEmojiOpen(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    return () => clearTimeout(timer);
  }, [relevantMessages.length, target]);

  const chatOptions = <View style={{ position: 'relative', zIndex: 10 }}>
    <Pressable accessibilityRole="button" accessibilityLabel="Chat options" accessibilityState={{ expanded: chatMenuOpen }} onPress={() => setChatMenuOpen(open => !open)} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
      <MoreHorizontal size={20} color={C.green} />
    </Pressable>
    {chatMenuOpen && <View style={{ position: 'absolute', top: 42, right: 0, width: 190, padding: 6, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, shadowColor: '#000', shadowOpacity: .1, shadowRadius: 12, elevation: 8 }}>
      <Pressable accessibilityRole="button" onPress={() => { setChatMenuOpen(false); setSearchOpen(true); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 8 }}><Search size={16} color={C.green} /><Text style={{ color: C.ink, fontSize: 12 }}>Search messages</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => { setChatMenuOpen(false); setSearchOpen(false); setSearchQuery(''); setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 8 }}><ArrowDown size={16} color={C.green} /><Text style={{ color: C.ink, fontSize: 12 }}>Jump to latest</Text></Pressable>
    </View>}
  </View>;

  const searchBar = searchOpen && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: desktop ? 18 : 0, paddingVertical: 10, borderBottomWidth: desktop ? 1 : 0, borderBottomColor: C.line }}>
    <Search size={17} color={C.muted} />
    <TextInput autoFocus accessibilityLabel="Search messages" value={searchQuery} onChangeText={setSearchQuery} placeholder="Search this conversation" placeholderTextColor={C.placeholder} style={{ flex: 1, minWidth: 0, height: 36, color: C.ink, fontSize: 16 }} />
    {!!searchQuery && <Text style={{ color: C.muted, fontSize: 11 }}>{visibleMessages.length} found</Text>}
    <Pressable accessibilityRole="button" accessibilityLabel="Close message search" onPress={() => { setSearchOpen(false); setSearchQuery(''); }} style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }}><X size={16} color={C.muted} /></Pressable>
  </View>;

  const renderConversationRow = (conversation: typeof conversations[number]) => {
    const active = target === conversation.id;
    const thread = getConversationMessages(conversation.id);
    const latest = thread[thread.length - 1];
    const unread = thread.filter(message => !message.readAt && message.from !== ownId).length;
    return <Pressable key={conversation.id} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => selectConversation(conversation.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, borderRadius: 13, backgroundColor: active ? C.mint : 'transparent' }}>
      {conversation.worker ? <Avatar worker={conversation.worker} size={40} /> : <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? C.green : C.bg }}><UsersRound size={18} color={active ? C.onGreen : C.green} /></View>}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ color: C.ink, fontSize: 13, fontWeight: active ? '600' : '500' }}>{conversation.name}</Text>
        <Text numberOfLines={1} style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{latest?.body || 'Start a conversation'}</Text>
      </View>
      {unread > 0 && <View style={{ minWidth: 19, height: 19, borderRadius: 10, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: C.green }}><Text style={{ color: C.onGreen, fontSize: 10, fontWeight: '600' }}>{unread}</Text></View>}
    </Pressable>;
  };

  const renderThread = (wide: boolean) => <ScrollView
    ref={scrollRef}
    keyboardShouldPersistTaps="always"
    keyboardDismissMode="none"
    showsVerticalScrollIndicator={false}
    onContentSizeChange={() => searchQuery.trim() ? scrollRef.current?.scrollTo({ y: 0, animated: false }) : scrollRef.current?.scrollToEnd({ animated: true })}
    onLayout={() => searchQuery.trim() ? scrollRef.current?.scrollTo({ y: 0, animated: false }) : scrollRef.current?.scrollToEnd({ animated: false })}
    style={{ flex: 1, minHeight: 0 }}
    contentContainerStyle={{ padding: wide ? 24 : 0, paddingBottom: 20, flexGrow: visibleMessages.length ? 0 : 1, justifyContent: visibleMessages.length ? 'flex-start' : 'center' }}
  >
    {visibleMessages.length === 0
      ? <Text style={{ color: C.muted, textAlign: 'center', marginTop: wide ? 0 : 40 }}>{searchQuery.trim() ? 'No matching messages.' : 'No messages yet. Start the conversation.'}</Text>
      : visibleMessages.map(message => {
        const isMe = message.from === ownId;
        return <View key={message.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: wide ? '72%' : '85%', marginBottom: 14 }}>
          <Text style={{ fontSize: 11, color: C.muted, marginBottom: 4, marginLeft: 4 }}>{getSenderName(message.from)}</Text>
          <Card style={{ padding: 13, backgroundColor: isMe ? C.mint : C.surface, borderColor: isMe ? C.green : C.line, borderRadius: 16, borderBottomRightRadius: isMe ? 4 : 16, borderBottomLeftRadius: isMe ? 16 : 4 }}>
            <Text style={{ color: C.ink, fontSize: 14, lineHeight: 21 }}>{message.body}</Text>
          </Card>
          <Text style={{ fontSize: 10, color: C.muted, alignSelf: 'flex-end', marginTop: 4 }}>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>;
      })}
  </ScrollView>;

  const composer = <View style={{ padding: desktop ? 16 : 0, paddingBottom: 16, borderTopWidth: desktop ? 1 : 0, borderTopColor: C.line }}>
    {emojiOpen && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, padding: 9, marginBottom: 12, borderWidth: 1, borderColor: C.line, borderRadius: 12, backgroundColor: C.bg }}>
      {emojis.map(emoji => <Pressable key={emoji} accessibilityRole="button" accessibilityLabel={`Insert ${emoji} emoji`} {...keepComposerFocus} onPress={() => { setText(current => current + emoji); inputRef.current?.focus(); }} style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}><Text style={{ fontSize: 23 }}>{emoji}</Text></Pressable>)}
    </View>}
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={emojiOpen ? 'Close emoji picker' : 'Choose emoji'} accessibilityState={{ expanded: emojiOpen }} {...keepComposerFocus} onPress={() => { setEmojiOpen(open => !open); inputRef.current?.focus(); }} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: emojiOpen ? C.mint : C.bg, alignItems: 'center', justifyContent: 'center' }}><Smile size={20} color={C.green} /></Pressable>
      <TextInput
        ref={inputRef}
        value={text}
        onChangeText={setText}
        onSubmitEditing={() => void send()}
        placeholder="Type a message..."
        placeholderTextColor={C.placeholder}
        returnKeyType="send"
        submitBehavior="submit"
        accessibilityLabel="Message"
        style={{ flex: 1, minWidth: 0, height: 48, fontSize: 16, backgroundColor: C.field, borderRadius: 24, paddingHorizontal: 17, color: C.ink, borderWidth: 1, borderColor: C.line }}
      />
      <Pressable accessibilityRole="button" accessibilityLabel="Send message" onPress={() => void send()} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' }}>
        <Send size={19} color={C.onGreen} />
      </Pressable>
    </View>
  </View>;

  return <Screen back noScroll noNav wide={desktop} title="Messages" subtitle="Chat with your team">
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0} style={{ flex: 1, minHeight: 0 }}>
      {desktop ? <View style={{ flex: 1, minHeight: 0, flexDirection: 'row', gap: 16 }}>
        <View style={{ width: 290, minWidth: 250, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 17, padding: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 7, paddingTop: 4, paddingBottom: 12 }}>
            <UsersRound size={17} color={C.green} />
            <Text style={{ color: C.ink, fontSize: 13, fontWeight: '600' }}>Conversations</Text>
            <Text style={{ color: C.muted, fontSize: 11, marginLeft: 'auto' }}>{conversations.length}</Text>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 3 }}>
            {conversations.map(renderConversationRow)}
          </ScrollView>
        </View>
        <View style={{ flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden', backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 17 }}>
          <View style={{ minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: C.line, zIndex: 10 }}>
            {conversations.find(conversation => conversation.id === target)?.worker
              ? <Avatar worker={conversations.find(conversation => conversation.id === target)!.worker!} size={38} />
              : <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: C.mint }}>{target === 'all' ? <UsersRound size={17} color={C.green} /> : <UserRound size={17} color={C.green} />}</View>}
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.ink, fontWeight: '600', fontSize: 14 }}>{conversations.find(conversation => conversation.id === target)?.name ?? 'Conversation'}</Text>
              <Text style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>{target === 'all' ? 'Team conversation' : 'Direct conversation'}</Text>
            </View>
            {chatOptions}
          </View>
          {searchBar}
          {renderThread(true)}
          {composer}
        </View>
      </View> : <View style={{ flex: 1, minHeight: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 12, zIndex: 10 }}>
          <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {conversations.map(conversation => <Pressable key={conversation.id} onPress={() => selectConversation(conversation.id)} style={{ paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: target === conversation.id ? C.green : C.surface, borderWidth: 1, borderColor: target === conversation.id ? C.green : C.line }}>
              <Text style={{ color: target === conversation.id ? C.onGreen : C.ink, fontSize: 13, fontWeight: '500' }}>{conversation.id === 'all' ? 'All Team' : conversation.name.split(' ')[0]}</Text>
            </Pressable>)}
          </View>
          {chatOptions}
        </View>
        {searchBar}
        {renderThread(false)}
        {composer}
      </View>}
    </KeyboardAvoidingView>
  </Screen>;
}
