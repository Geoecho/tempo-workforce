import { ArrowDown, Search, Send, UserRound, UsersRound, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Platform, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import { useStore } from '../lib/store';
import { Pressable } from '../ui/LocalizedPressable';
import { Text } from '../ui/LocalizedText';
import { Avatar, Card, Screen } from '../ui/components';
import { RevealPanel } from '../ui/RevealPanel';
import { useTheme } from '../ui/theme';

export default function Messages() {
  const C = useTheme().colors;
  const { messages, sendMessage, markMessageRead, role, selectedWorkerId, workers } = useStore();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= 960;
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sendErrors, setSendErrors] = useState<Record<string, string>>({});
  const [inputHeight, setInputHeight] = useState(48);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const stickToBottom = useRef(true);
  const reading = useRef(new Set<string>());
  const [target, setTarget] = useState<string>('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const text = drafts[target] ?? '';
  const setText = (value: string) => setDrafts(current => ({ ...current, [target]: value }));
  const scrollRef = useRef<ScrollView>(null);
  const searchRef = useRef<TextInput>(null);
  const inputRef = useRef<TextInput>(null);
  const keepComposerFocus = Platform.OS === 'web' ? { onMouseDown: (event: React.MouseEvent) => event.preventDefault() } : {};
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
    if (!text.trim() || sendingRef.current) return;
    const conversation = target;
    const body = text;
    sendingRef.current = true;
    setSending(true);
    setSendErrors(current => ({ ...current, [conversation]: '' }));
    inputRef.current?.focus();
    try {
      const result = await sendMessage(conversation, body);
      if (!result.ok) throw new Error(result.message);
      setDrafts(current => current[conversation] === body ? { ...current, [conversation]: '' } : current);
      stickToBottom.current = true;
    } catch (error) {
      setSendErrors(current => ({ ...current, [conversation]: error instanceof Error ? error.message : 'Message was not sent. Try again.' }));
    } finally { sendingRef.current = false; setSending(false); }
  };
  const getSenderName = (fromId: string) => fromId === 'admin' ? 'Admin' : workers.find(worker => worker.id === fromId)?.name || 'Unknown';

  useEffect(() => {
    relevantMessages.forEach(message => {
      if (!message.readAt && message.from !== ownId && !reading.current.has(message.id)) {
        reading.current.add(message.id);
        void markMessageRead(message.id).catch(() => reading.current.delete(message.id));
      }
    });
  }, [relevantMessages, ownId, markMessageRead]);

  const selectConversation = (conversationId: string) => {
    if (conversationId === target) return;
    stickToBottom.current = true;
    if (searchOpen) { searchRef.current?.blur(); Keyboard.dismiss(); }
    setInputHeight(48);
    setTarget(conversationId);
    setSearchOpen(false);
    setSearchQuery('');
  };

  const closeSearch = () => { searchRef.current?.blur(); Keyboard.dismiss(); setSearchOpen(false); setSearchQuery(''); stickToBottom.current = true; };
  const openSearch = () => { inputRef.current?.blur(); Keyboard.dismiss(); setSearchQuery(''); setSearchOpen(true); };
  const chatOptions = <View style={{ flexDirection: 'row', gap: 4, flexShrink: 0 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={searchOpen ? 'Close message search' : 'Search messages'} accessibilityState={{ expanded: searchOpen }} onPress={searchOpen ? closeSearch : openSearch} style={{ paddingHorizontal: 14, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: searchOpen ? C.green : C.line, backgroundColor: searchOpen ? C.mint : C.surface, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' }}><Search size={17} color={searchOpen ? C.green : C.ink} /><Text style={{ color: searchOpen ? C.green : C.ink, fontSize: 13, fontWeight: '600' }}>Search</Text></Pressable>
    {!searchOpen && <Pressable accessibilityRole="button" accessibilityLabel="Jump to latest message" onPress={() => { stickToBottom.current = true; scrollRef.current?.scrollToEnd({ animated: false }); }} style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line, backgroundColor: C.surface }}><ArrowDown size={20} color={C.green} /></Pressable>}
  </View>;

  const searchBar = searchOpen && <View style={{ padding: 12, marginBottom: desktop ? 0 : 10, backgroundColor: C.mint, borderBottomWidth: 1, borderBottomColor: C.line, gap: 10 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12 }}>
      <Search size={18} color={C.green} />
      <TextInput ref={searchRef} autoFocus accessibilityLabel="Search this conversation" value={searchQuery} onChangeText={setSearchQuery} placeholder="Find a message..." placeholderTextColor={C.placeholder} returnKeyType="search" autoCorrect={false} style={{ flex: 1, minWidth: 0, height: 48, color: C.ink, fontSize: 16 }} />
      {!!searchQuery && <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => { setSearchQuery(''); searchRef.current?.focus(); }} style={{ width: 36, height: 44, alignItems: 'center', justifyContent: 'center' }}><X size={17} color={C.muted} /></Pressable>}
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={{ color: C.green, fontSize: 12 }}>{searchQuery.trim() ? `${visibleMessages.length} results` : 'Search messages'}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Close search" onPress={closeSearch} style={{ paddingHorizontal: 10, paddingVertical: 5 }}><Text style={{ color: C.green, fontSize: 13, fontWeight: '600' }}>Done</Text></Pressable>
    </View>
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
    key={target}
    ref={scrollRef}
    keyboardShouldPersistTaps="handled"
    keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
    showsVerticalScrollIndicator={false}
    onContentSizeChange={() => searchQuery.trim() ? scrollRef.current?.scrollTo({ y: 0, animated: false }) : stickToBottom.current && scrollRef.current?.scrollToEnd({ animated: false })}
    onLayout={() => searchQuery.trim() ? scrollRef.current?.scrollTo({ y: 0, animated: false }) : scrollRef.current?.scrollToEnd({ animated: false })}
    onScroll={event => { const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent; stickToBottom.current = contentSize.height - contentOffset.y - layoutMeasurement.height < 80; }}
    scrollEventThrottle={32}
    style={{ flex: 1, minHeight: 0 }}
    contentContainerStyle={{ padding: wide ? 24 : 0, paddingBottom: 20, flexGrow: 1, justifyContent: visibleMessages.length ? (searchOpen ? 'flex-start' : 'flex-end') : 'center' }}
  >
    {visibleMessages.length === 0
      ? <Text style={{ color: C.muted, textAlign: 'center', marginTop: wide ? 0 : 40 }}>{searchQuery.trim() ? 'No matching messages.' : 'No messages yet. Start the conversation.'}</Text>
      : visibleMessages.map((message, index) => {
        const isMe = message.from === ownId;
        const date = new Date(message.createdAt).toLocaleDateString();
        const previousDate = index > 0 ? new Date(visibleMessages[index - 1].createdAt).toLocaleDateString() : null;
        return <React.Fragment key={message.id}>
          {date !== previousDate && <Text style={{ textAlign: 'center', color: C.muted, fontSize: 11, marginVertical: 12 }}>{new Date(message.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</Text>}
          <View style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: wide ? '72%' : '85%', marginBottom: 14 }}>
            {!isMe && <Text style={{ fontSize: 11, color: C.muted, marginBottom: 4, marginLeft: 34 }}>{getSenderName(message.from)}</Text>}
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
              {!isMe && (message.from === 'admin' ? <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.line, alignItems: 'center', justifyContent: 'center' }}><UserRound size={14} color={C.muted} /></View> : <View style={{ paddingBottom: 1 }}><Avatar worker={workers.find(w => w.id === message.from) || workers[0]} size={26} /></View>)}
              <Card style={{ flexShrink: 1, padding: 13, backgroundColor: isMe ? C.green : C.bg, borderColor: isMe ? C.green : C.bg, borderRadius: 16, borderBottomRightRadius: isMe ? 4 : 16, borderBottomLeftRadius: isMe ? 16 : 4 }}>
                <Text selectable style={{ color: isMe ? C.onGreen : C.ink, fontSize: 14, lineHeight: 21 }}>{message.body}</Text>
              </Card>
            </View>
            <Text style={{ fontSize: 10, color: C.muted, alignSelf: isMe ? 'flex-end' : 'flex-start', marginLeft: isMe ? 0 : 34, marginTop: 4 }}>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </View></React.Fragment>;
      })}
  </ScrollView>;

  const composer = <View style={{ padding: desktop ? 16 : 0, paddingBottom: 12, backgroundColor: C.surface, borderTopWidth: desktop ? 1 : 0, borderTopColor: C.line }}>
    {!!sendErrors[target] && <Text accessibilityRole="alert" style={{ color: C.red, fontSize: 12, marginBottom: 8 }}>{sendErrors[target]} Your message is still here. Tap send to retry.</Text>}
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 9 }}>
      <TextInput
        ref={inputRef}
        value={text}
        onChangeText={setText}
        onContentSizeChange={event => setInputHeight(Math.max(48, Math.min(120, event.nativeEvent.contentSize.height)))}
        onSubmitEditing={() => void send()}
        placeholder="Type a message..."
        placeholderTextColor={C.placeholder}
        multiline
        returnKeyType="default"
        submitBehavior="newline"
        onFocus={() => { stickToBottom.current = true; requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: false })); }}
        accessibilityLabel="Message"
        style={{ flex: 1, minWidth: 0, height: inputHeight, minHeight: 48, maxHeight: 120, fontSize: 16, lineHeight: 22, paddingVertical: 12, textAlignVertical: 'top', backgroundColor: C.bg, borderRadius: 16, paddingHorizontal: 17, color: C.ink, borderWidth: 1, borderColor: C.line }}
      />
      <Pressable accessibilityRole="button" accessibilityLabel={sending ? 'Sending message' : 'Send message'} accessibilityState={{ disabled: !text.trim() || sending, busy: sending }} disabled={!text.trim() || sending} {...keepComposerFocus} onPress={() => void send()} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: C.green, opacity: !text.trim() || sending ? .5 : 1, alignItems: 'center', justifyContent: 'center' }}>
        {sending ? <ActivityIndicator color={C.onGreen} /> : <Send size={19} color={C.onGreen} />}
      </Pressable>
    </View>
  </View>;

  return <Screen back chat noScroll noNav wide={desktop} title="Messages">
    <View style={{ flex: 1, minHeight: 0 }}>
      {desktop ? <View style={{ flex: 1, minHeight: 0, flexDirection: 'row', gap: 16 }}>
        <View style={{ width: 272, minWidth: 240, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 17, padding: 12 }}>
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
          {!searchOpen && composer}
        </View>
      </View> : <View style={{ flex: 1, minHeight: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 12, zIndex: 10 }}>
          <ScrollView horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
            {conversations.map(conversation => <Pressable key={conversation.id} accessibilityRole="tab" accessibilityState={{ selected: target === conversation.id }} accessibilityLabel={conversation.name} onPress={() => selectConversation(conversation.id)} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: target === conversation.id ? C.green : C.surface, borderWidth: 1, borderColor: target === conversation.id ? C.green : C.line }}>
              <Text style={{ color: target === conversation.id ? C.onGreen : C.ink, fontSize: 13, fontWeight: '500' }}>{conversation.id === 'all' ? 'All Team' : conversation.name}</Text>
            </Pressable>)}
          </ScrollView>
          {chatOptions}
        </View>
        {searchBar}
        {renderThread(false)}
        {!searchOpen && composer}
      </View>}
    </View>
  </Screen>;
}
