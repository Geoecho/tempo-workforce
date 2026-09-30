import { router } from 'expo-router';
import { ArrowDownRight, ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronDown, Clock3, Globe2, QrCode, ShieldCheck, UsersRound, Wallet } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '../ui/LocalizedText';
import { Pressable } from '../ui/LocalizedPressable';
import { LANGUAGES, useLanguage } from '../lib/i18n';
import { BrandLogo } from '../ui/Brand';
import { SafeAreaView } from 'react-native-safe-area-context';

const ink = '#12291F';
const green = '#174C38';
const accent = '#C7D7C6';
const paper = '#F7F6F0';
const muted = '#617467';

export default function Welcome() {
  const { width, height } = useWindowDimensions();
  const desktop = width >= 900;
  const { language, setLanguage, t } = useLanguage();
  const scroll = useRef<ScrollView>(null);
  const positions = useRef<Record<string, number>>({});
  const [scrollY, setScrollY] = useState(0);
  const [expanded, setExpanded] = useState(0);
  const [languageMenu, setLanguageMenu] = useState(false);
  const [heroMotion] = useState(() => new Animated.Value(0));
  const [previewMotion] = useState(() => new Animated.Value(0));
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let live = true;
    let loop: Animated.CompositeAnimation | undefined;
    AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (!live) return;
      if (reduced) { heroMotion.setValue(1); previewMotion.setValue(1); return; }
      const driver = Platform.OS !== 'web';
      Animated.timing(heroMotion, { toValue: 1, duration: 630, useNativeDriver: driver }).start();
      Animated.timing(previewMotion, { toValue: 1, duration: 760, delay: 170, useNativeDriver: driver }).start();
      loop = Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1300, useNativeDriver: driver }),
        Animated.timing(pulse, { toValue: 0, duration: 1300, useNativeDriver: driver }),
      ]));
      loop.start();
    }).catch(() => { heroMotion.setValue(1); previewMotion.setValue(1); });
    return () => { live = false; loop?.stop(); };
  }, [heroMotion, previewMotion, pulse]);

  const goto = (name: string) => scroll.current?.scrollTo({ y: positions.current[name] ?? 0, animated: true });
  const begin = () => router.replace('/start?intent=admin');
  const join = () => router.replace('/start?intent=worker');
  const login = () => router.replace('/start');

  return <SafeAreaView style={{ flex: 1, backgroundColor: paper }} edges={['top']}><ScrollView ref={scroll} onScroll={event => setScrollY(event.nativeEvent.contentOffset.y)} scrollEventThrottle={32} showsVerticalScrollIndicator={false}>
    <View style={s.header}><View style={[s.wrap, s.headerInner]}>
      <Pressable accessibilityRole="link" onPress={() => scroll.current?.scrollTo({ y: 0, animated: true })}><BrandLogo size={29} /></Pressable>
      {desktop && <View style={s.nav}><Pressable onPress={() => goto('method')}><Text style={s.navText}>{t('How it works')}</Text></Pressable><Pressable onPress={() => goto('product')}><Text style={s.navText}>{t('The platform')}</Text></Pressable><Pressable onPress={() => goto('questions')}><Text style={s.navText}>{t('Questions')}</Text></Pressable></View>}
      <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: desktop ? 19 : 9 }}>
        <View style={{ zIndex: 20 }}><Pressable accessibilityRole="button" accessibilityLabel={t('Choose language')} onPress={() => setLanguageMenu(value => !value)} style={s.languageButton}><Globe2 size={15} color={green} /><Text style={s.languageButtonText}>{LANGUAGES.find(item => item.code === language)?.short}</Text><ChevronDown size={12} color={green} /></Pressable>
          {languageMenu && <View style={s.languageMenu}>{LANGUAGES.map(item => <Pressable key={item.code} accessibilityRole="radio" accessibilityState={{ checked: language === item.code }} onPress={() => { setLanguage(item.code); setLanguageMenu(false); }} style={[s.languageOption, language === item.code && s.languageOptionActive]}><Text style={s.languageOptionText}>{item.label}</Text></Pressable>)}</View>}
        </View>
        <Pressable onPress={login}><Text style={s.login}>{t('Sign in')}</Text></Pressable><Pressable onPress={begin} style={s.headerButton}><Text style={s.headerButtonText}>{desktop ? t('Start your workspace') : t('Start')}</Text><ArrowUpRight size={15} color={ink} /></Pressable>
      </View>
    </View></View>

    <View style={s.hero}><View pointerEvents="none" style={s.heroRuleOne} /><View pointerEvents="none" style={s.heroRuleTwo} />
      <View style={[s.wrap, { flexDirection: desktop ? 'row' : 'column', alignItems: 'center', paddingTop: desktop ? 93 : 53, paddingBottom: desktop ? 114 : 72, gap: desktop ? 20 : 56 }]}>
        <Animated.View style={{ flex: 1.14, width: '100%', transform: [{ translateY: heroMotion.interpolate({ inputRange: [0, 1], outputRange: [25, 0] }) }] }}>
          <View style={s.kickerRow}><View style={s.kickerLine} /><Text style={s.kicker}>{t('WORKFORCE CONTROL, WITHOUT THE NOISE')}</Text></View>
          <Text style={[s.heroTitle, { fontSize: desktop ? 79 : 50, lineHeight: desktop ? 84 : 54 }]}>{t('Every shift,')}{'\n'}<Text style={{ color: '#AFC7B2' }}>{t('in sync.')}</Text></Text>
          <Text style={[s.heroCopy, { maxWidth: desktop ? 510 : 520 }]}>{t('The clean way to plan crews, record hours, and keep pay clear. One place for the people who run the work and the people doing it.')}</Text>
          <View style={{ flexDirection: desktop ? 'row' : 'column', gap: 11, marginTop: 34 }}><Pressable onPress={begin} style={s.heroCta}><Text style={s.heroCtaText}>{t('Build your workspace')}</Text><ArrowUpRight size={19} color={ink} /></Pressable><Pressable onPress={() => goto('product')} style={s.heroGhost}><Text style={s.heroGhostText}>{t('See the platform')}</Text><ArrowDownRight size={19} color="#E4EEE5" /></Pressable></View>
          <View style={s.heroMeta}><Text style={s.heroMetaText}>{t('PLAN')}</Text><View style={s.metaDash} /><Text style={s.heroMetaText}>{t('CLOCK')}</Text><View style={s.metaDash} /><Text style={s.heroMetaText}>{t('PAY')}</Text></View>
        </Animated.View>
        <Animated.View style={[s.heroVisual, { width: desktop ? 470 : '100%', transform: [{ translateY: previewMotion.interpolate({ inputRange: [0, 1], outputRange: [42, 0] }) }, { rotate: '-2deg' }] }]}>
          <View style={s.visualIndex}><Text style={{ color: '#AFC7B2', fontSize: 11, fontWeight: '500', letterSpacing: 1.1 }}>{t('LIVE WORKSPACE')}</Text><Text style={{ color: '#91AF9A', fontSize: 11 }}>{t('YOUR OPERATIONS, LIVE')}</Text></View>
          <View style={s.appWindow}>
            <View style={s.appTop}><BrandLogo size={20} /><View style={s.appTopRight}><View style={s.liveDot} /><Text style={s.appLive}>{t('LIVE TODAY')}</Text></View></View>
            <View style={s.appBody}><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><View><Text style={s.appEyebrow}>{t('WEDNESDAY / 14 OCT')}</Text><Text style={s.appHeading}>{t('Today’s crew')}</Text></View><View style={s.appCount}><Text style={s.appCountText}>12</Text></View></View>
              <View style={s.shiftPanel}><View style={s.shiftAccent} /><View style={{ flex: 1 }}><Text style={s.shiftTag}>{t('IN PROGRESS')}</Text><Text style={s.shiftTitle}>{t('Northline Festival')}</Text><Text style={s.shiftDetail}>{t('Main stage · East gate')}</Text></View><Text style={s.shiftTime}>08:00 — 18:00</Text></View>
              <View style={s.appDivider} /><Text style={s.appSection}>{t('ON SITE NOW')}</Text>
              <View style={s.crewRow}><View style={[s.avatar, { backgroundColor: '#DBE9C8' }]}><Text style={s.avatarText}>AM</Text></View><View style={{ flex: 1 }}><Text style={s.crewName}>Alex Morgan</Text><Text style={s.crewRole}>{t('Stage crew')}</Text></View><View style={s.crewStatus}><View style={s.crewDot} /><Text style={s.crewStatusText}>{t('Checked in')}</Text></View></View>
              <View style={s.crewRow}><View style={[s.avatar, { backgroundColor: '#E6DDCD' }]}><Text style={s.avatarText}>SB</Text></View><View style={{ flex: 1 }}><Text style={s.crewName}>Samir B.</Text><Text style={s.crewRole}>{t('Logistics')}</Text></View><View style={s.crewStatus}><View style={s.crewDot} /><Text style={s.crewStatusText}>{t('Checked in')}</Text></View></View>
            </View>
          </View>
          <View style={s.qrTicket}><View style={s.qrMark}><QrCode color={ink} size={27} strokeWidth={1.6} /></View><View><Text style={s.ticketEyebrow}>{t('SITE ACCESS')}</Text><Text style={s.ticketTitle}>{t('Scan to clock in')}</Text></View><ArrowUpRight color={ink} size={17} /></View>
          <Animated.View style={[s.payTicket, { transform: [{ translateY: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] }]}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={s.payDot} /><Text style={s.payLabel}>{t('PAY UPDATED')}</Text></View><Text style={s.payAmount}>€126.00</Text></Animated.View>
        </Animated.View>
      </View>
      <View style={s.heroBottom}><View style={[s.wrap, { flexDirection: 'row', alignItems: 'center' }]}><Text style={s.heroBottomText}>{t('MADE FOR THE SHIFT, NOT THE SPREADSHEET.')}</Text><ArrowRight color="#B4C8B8" size={18} /></View></View>
    </View>

    <Reveal y={scrollY} height={height} desktop={desktop} onMeasure={top => { positions.current.method = top; }}><View style={s.method}><View style={s.wrap}>
      <View style={[s.methodTop, { flexDirection: desktop ? 'row' : 'column' }]}><Text style={s.sectionIndex}>{t('HOW IT WORKS')}</Text><Text style={[s.sectionTitle, { fontSize: desktop ? 53 : 37, maxWidth: 750 }]}>{t('From call time to')} {'\n'}<Text style={{ color: '#558067' }}>{t('clock out.')}</Text></Text></View>
      <View style={s.methodList}>{[
        { title: 'Plan', detail: 'Put the right crew on the right shift, with every location and meeting point in one place.', icon: CalendarDays },
        { title: 'Show up', detail: 'Workers see their assignments and scan a live QR code at the site.', icon: QrCode },
        { title: 'Settle up', detail: 'Hours become estimated earnings, ready for review and export.', icon: Wallet },
      ].map(({ title, detail, icon: Icon }) => <View key={title} style={[s.methodRow, { flexDirection: desktop ? 'row' : 'column', alignItems: desktop ? 'center' : 'flex-start' }]}><View style={s.methodIcon}><Icon size={27} color={green} strokeWidth={1.5} /></View><Text style={s.methodTitle}>{t(title)}</Text><Text style={[s.methodDetail, { flex: desktop ? 1 : undefined }]}>{t(detail)}</Text><ArrowUpRight size={23} color="#A8B8AA" /></View>)}</View>
    </View></View></Reveal>

    <Reveal y={scrollY} height={height} desktop={desktop} onMeasure={top => { positions.current.product = top; }}><View style={s.product}><View style={[s.wrap, { flexDirection: desktop ? 'row' : 'column', alignItems: 'center', gap: desktop ? 80 : 35 }]}>
      <View style={{ flex: 1, width: '100%' }}><Text style={s.sectionIndex}>{t('THE PLATFORM')}</Text><Text style={[s.sectionTitle, { fontSize: desktop ? 51 : 37, marginTop: 19 }]}>{t('One clear view.')} {'\n'}<Text style={{ color: '#548264' }}>{t('No guesswork.')}</Text></Text><Text style={s.productCopy}>{t('Schedules, people, attendance, and pay live together. Your team knows what happens next; managers can see what happened already.')}</Text>
        <View style={s.productPoints}><Proof icon={UsersRound} title={t('For managers')} detail={t('Assign people, call a worker, approve hours, and keep the day moving.')} /><Proof icon={Clock3} title={t('For workers')} detail={t('Find the next shift, check in, and see time and estimated earnings.')} /><Proof icon={ShieldCheck} title={t('Clear limits')} detail={t('A 10-hour daily pay cap keeps extra time visible for manager review.')} /></View>
      </View>
      <View style={[s.productBoard, { width: desktop ? 480 : '100%' }]}><View style={s.boardHeader}><View><Text style={s.boardOverline}>{t('OPERATIONS / OCTOBER')}</Text><Text style={s.boardHeading}>{t('Time & pay')}</Text></View><View style={s.boardMenu}><View style={s.boardMenuDot} /><View style={s.boardMenuDot} /><View style={s.boardMenuDot} /></View></View>
        <View style={s.boardTotal}><Text style={s.boardTotalLabel}>{t('ESTIMATED PAY')}</Text><Text style={s.boardTotalNumber}>€8,420.00</Text><View style={s.boardTotalBottom}><Clock3 size={15} color="#CBE3D0" /><Text style={s.boardTotalNote}>{t('Recorded as the work happens')}</Text></View></View>
        <View style={s.boardRow}><View style={s.boardAvatar}><Text style={s.boardAvatarText}>AM</Text></View><View style={{ flex: 1 }}><Text style={s.boardName}>Alex Morgan</Text><Text style={s.boardSub}>{t('Today · 8h 00m')}</Text></View><Text style={s.boardMoney}>€126.00</Text></View>
        <View style={s.boardRow}><View style={[s.boardAvatar, { backgroundColor: '#E9E2D3' }]}><Text style={s.boardAvatarText}>SB</Text></View><View style={{ flex: 1 }}><Text style={s.boardName}>Samir B.</Text><Text style={s.boardSub}>{t('Today · 7h 30m')}</Text></View><Text style={s.boardMoney}>€112.50</Text></View>
        <View style={s.boardFoot}><Check size={15} color={green} /><Text style={s.boardFootText}>{t('Ready for manager review')}</Text></View>
      </View>
    </View></View></Reveal>

    <View style={s.industries}><View style={[s.wrap, { flexDirection: desktop ? 'row' : 'column', alignItems: desktop ? 'center' : 'flex-start', gap: 16 }]}><Text style={s.industriesTitle}>{t('Where work happens, Tempo works.')}</Text><View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: desktop ? 'flex-end' : 'flex-start', gap: 8 }}>{['Events', 'Factories', 'Hospitality', 'Field teams'].map(item => <View key={item} style={s.industryChip}><Text style={s.industryText}>{t(item)}</Text></View>)}</View></View></View>

    <Reveal y={scrollY} height={height} desktop={desktop} onMeasure={top => { positions.current.questions = top; }}><View style={s.questions}><View style={s.wrap}><View style={[s.questionsLayout, { flexDirection: desktop ? 'row' : 'column' }]}><View style={{ flex: 1 }}><Text style={s.sectionIndex}>{t('GOOD TO KNOW')}</Text><Text style={[s.sectionTitle, { fontSize: desktop ? 49 : 37, marginTop: 18 }]}>{t('Good questions.')} {'\n'}{t('Clear answers.')}</Text><Text style={s.questionsAside}>{t('A few things teams usually want to know before the first shift.')}</Text></View><View style={{ flex: 1.2 }}>{[
      ['Can this work outside events?', 'Yes. Tempo is built for any team scheduling people across locations, including factories, hospitality, and field operations.'],
      ['How do workers check in?', 'An assigned worker scans the live QR code at the site. Their clock record appears in the shared workspace.'],
      ['Can I review pay before exporting?', 'Yes. Managers can review recorded time and estimated earnings, approve daily records, and export CSV.'],
      ['Which languages can our team use?', 'English (US), Macedonian, and Albanian are available. Each person can choose their own language.'],
    ].map(([question, answer], index) => <Pressable key={question} accessibilityRole="button" accessibilityState={{ expanded: expanded === index }} onPress={() => setExpanded(expanded === index ? -1 : index)} style={s.question}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}><Text style={s.questionTitle}>{t(question)}</Text><ChevronDown color={green} size={18} style={{ transform: [{ rotate: expanded === index ? '180deg' : '0deg' }] }} /></View>{expanded === index && <Text style={s.answer}>{t(answer)}</Text>}</Pressable>)}</View></View></View></View></Reveal>

    <View style={s.close}><View style={s.wrap}><View style={s.closeRule} /><Text style={s.closeKicker}>{t('WHEN THE TEAM MOVES, STAY TOGETHER.')}</Text><View style={[s.closeMain, { flexDirection: desktop ? 'row' : 'column', alignItems: desktop ? 'flex-end' : 'flex-start' }]}><Text style={[s.closeTitle, { fontSize: desktop ? 68 : 44, lineHeight: desktop ? 74 : 49 }]}>{t('Make work flow.')}{'\n'}<Text style={{ color: '#5F936C' }}>{t('Make time count.')}</Text></Text><View style={{ alignItems: 'flex-start', maxWidth: 330 }}><Text style={s.closeCopy}>{t('Bring your crew into one workspace. Set up the first shift in minutes.')}</Text><Pressable onPress={begin} style={s.closeButton}><Text style={s.closeButtonText}>{t('Start your workspace')}</Text><ArrowUpRight size={19} color={ink} /></Pressable></View></View></View></View>

    <View style={s.footer}><View style={[s.wrap, { flexDirection: desktop ? 'row' : 'column', alignItems: desktop ? 'center' : 'flex-start', gap: 21 }]}><BrandLogo size={29} color="#FFFFFF" /><Text style={s.footerLine}>{t('The operating space for teams in motion.')}</Text><View style={{ flex: 1 }} /><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>{LANGUAGES.map(item => <Pressable key={item.code} accessibilityRole="radio" accessibilityState={{ checked: language === item.code }} onPress={() => setLanguage(item.code)} style={[s.footerLanguage, language === item.code && s.footerLanguageActive]}><Text style={s.footerLanguageText}>{item.short}</Text></Pressable>)}</View><Pressable onPress={join}><Text style={s.footerLink}>{t('Join a team')} ↗</Text></Pressable></View></View>
  </ScrollView></SafeAreaView>;
}

function Proof({ icon: Icon, title, detail }: { icon: typeof UsersRound; title: string; detail: string }) { return <View style={s.proof}><View style={s.proofIcon}><Icon size={19} color={green} strokeWidth={1.7} /></View><View style={{ flex: 1 }}><Text style={s.proofTitle}>{title}</Text><Text style={s.proofDetail}>{detail}</Text></View></View>; }

function Reveal({ children, y, height, desktop, onMeasure }: { children: React.ReactNode; y: number; height: number; desktop: boolean; onMeasure?: (top: number) => void }) {
  const [top, setTop] = useState<number | null>(null);
  const [motion] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (top === null || y + height * .88 < top) return;
    AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (reduced) motion.setValue(1);
      else Animated.timing(motion, { toValue: 1, duration: 600, useNativeDriver: Platform.OS !== 'web' }).start();
    }).catch(() => motion.setValue(1));
  }, [top, y, height, motion]);
  return <View onLayout={event => { setTop(event.nativeEvent.layout.y); onMeasure?.(event.nativeEvent.layout.y); }}><Animated.View style={{ transform: [{ translateY: motion.interpolate({ inputRange: [0, 1], outputRange: [desktop ? 26 : 15, 0] }) }] }}>{children}</Animated.View></View>;
}

const s = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 1190, alignSelf: 'center', paddingHorizontal: 26 },
  languageButton: { minHeight: 36, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 7, borderWidth: 1, borderColor: '#D9E3D7' },
  languageButtonText: { color: green, fontSize: 11, fontWeight: '500' },
  languageMenu: { position: 'absolute', right: 0, top: 42, width: 152, padding: 5, borderRadius: 9, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DAE5D8', shadowColor: '#163A26', shadowOpacity: .12, shadowRadius: 12, elevation: 8 },
  languageOption: { paddingHorizontal: 10, paddingVertical: 10, borderRadius: 6 },
  languageOptionActive: { backgroundColor: '#EAF1E8' },
  languageOptionText: { fontSize: 12, color: ink, fontWeight: '600' },
  header: { position: 'relative', zIndex: 30, backgroundColor: paper, borderBottomWidth: 1, borderBottomColor: '#DFE5D8' }, headerInner: { height: 75, flexDirection: 'row', alignItems: 'center' }, brand: { fontSize: 29, fontWeight: '600', letterSpacing: -1.9, color: ink }, nav: { flexDirection: 'row', gap: 32, marginLeft: 92 }, navText: { fontSize: 12, fontWeight: '600', color: '#486255' }, login: { fontSize: 14, fontWeight: '500', fontFamily: Platform.OS === 'web' ? 'Arial' : undefined, color: ink }, headerButton: { minHeight: 40, borderRadius: 7, backgroundColor: accent, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 8 }, headerButtonText: { fontSize: 14, fontWeight: '500', fontFamily: Platform.OS === 'web' ? 'Arial' : undefined, color: ink },
  hero: { backgroundColor: ink, overflow: 'hidden' }, heroRuleOne: { position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, backgroundColor: '#285240' }, heroRuleTwo: { position: 'absolute', top: 0, bottom: 0, left: '87%', width: 1, backgroundColor: '#285240' }, kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 11 }, kickerLine: { width: 26, height: 1, backgroundColor: accent }, kicker: { color: '#BDD1BD', fontSize: 10, fontWeight: '600', letterSpacing: 2 }, heroTitle: { color: '#F9F9EF', fontWeight: '600', letterSpacing: -3.2, marginTop: 30 }, heroCopy: { color: '#C4D7C8', fontSize: 17, lineHeight: 27, marginTop: 26 }, heroCta: { minHeight: 54, borderRadius: 8, backgroundColor: accent, paddingHorizontal: 21, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28 }, heroCtaText: { color: ink, fontSize: 14, fontWeight: '500' }, heroGhost: { minHeight: 54, borderRadius: 8, borderWidth: 1, borderColor: '#678A72', paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 17 }, heroGhostText: { color: '#F0F5EC', fontSize: 14, fontWeight: '600' }, heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 13, marginTop: 46 }, heroMetaText: { color: '#86A591', fontSize: 10, letterSpacing: 1.3, fontWeight: '600' }, metaDash: { width: 25, height: 1, backgroundColor: '#47725C' }, heroVisual: { height: 504, justifyContent: 'center', marginRight: 12 }, visualIndex: { position: 'absolute', top: 0, left: 30, right: 20, flexDirection: 'row', justifyContent: 'space-between' }, appWindow: { backgroundColor: '#F8F9F4', borderRadius: 14, marginTop: 30, marginLeft: 33, width: '90%', overflow: 'hidden', shadowColor: '#000', shadowOpacity: .24, shadowRadius: 28, shadowOffset: { width: 0, height: 20 }, elevation: 12 }, appTop: { height: 56, borderBottomWidth: 1, borderBottomColor: '#E6EBE4', paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, appLogo: { color: ink, fontSize: 20, fontWeight: '600', letterSpacing: -1 }, appTopRight: { flexDirection: 'row', alignItems: 'center', gap: 6 }, liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4A9C59' }, appLive: { fontSize: 9, fontWeight: '600', color: '#558364', letterSpacing: .6 }, appBody: { padding: 22 }, appEyebrow: { fontSize: 9, letterSpacing: 1.1, fontWeight: '600', color: '#8A9B8B' }, appHeading: { color: ink, fontSize: 23, fontWeight: '600', letterSpacing: -.6, marginTop: 6 }, appCount: { backgroundColor: '#E8F0E4', width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, appCountText: { color: green, fontSize: 18, fontWeight: '600' }, shiftPanel: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#EFF2E9', borderRadius: 10, marginTop: 20, padding: 14, overflow: 'hidden' }, shiftAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: '#79A27A' }, shiftTag: { fontSize: 8, fontWeight: '600', color: '#4E8461', letterSpacing: .7 }, shiftTitle: { color: ink, fontSize: 14, fontWeight: '600', marginTop: 3 }, shiftDetail: { color: '#6E8273', fontSize: 10, marginTop: 5 }, shiftTime: { color: '#456655', fontSize: 9, fontWeight: '600' }, appDivider: { height: 1, backgroundColor: '#E9EEE6', marginTop: 21, marginBottom: 17 }, appSection: { color: '#698171', fontSize: 9, fontWeight: '600', letterSpacing: 1.1, marginBottom: 4 }, crewRow: { minHeight: 51, flexDirection: 'row', alignItems: 'center', gap: 10 }, avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, avatarText: { fontSize: 9, fontWeight: '600', color: green }, crewName: { fontSize: 11, fontWeight: '600', color: ink }, crewRole: { fontSize: 9, color: '#8A9B8A', marginTop: 2 }, crewStatus: { flexDirection: 'row', alignItems: 'center', gap: 4 }, crewDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#5AA56F' }, crewStatusText: { color: '#4D8660', fontSize: 9, fontWeight: '500' }, qrTicket: { position: 'absolute', left: 0, bottom: 3, minHeight: 77, width: 258, borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: accent, shadowColor: '#000', shadowOpacity: .23, shadowRadius: 12, elevation: 10 }, qrMark: { backgroundColor: '#E8EFE6', borderRadius: 6, width: 47, height: 47, alignItems: 'center', justifyContent: 'center' }, ticketEyebrow: { color: '#567044', fontSize: 8, fontWeight: '600', letterSpacing: 1 }, ticketTitle: { color: ink, fontSize: 11, fontWeight: '600', marginTop: 3 }, payTicket: { position: 'absolute', right: -7, top: 24, backgroundColor: '#F9F9F2', borderRadius: 9, padding: 13, shadowColor: '#000', shadowOpacity: .2, shadowRadius: 12, elevation: 9 }, payDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#5AA56F' }, payLabel: { color: '#658169', fontSize: 8, fontWeight: '600', letterSpacing: .6 }, payAmount: { color: ink, fontSize: 19, fontWeight: '600', marginTop: 4 }, heroBottom: { borderTopWidth: 1, borderTopColor: '#315640', height: 56, justifyContent: 'center' }, heroBottomText: { color: '#9AB7A0', fontSize: 10, fontWeight: '600', letterSpacing: 2, flex: 1 },
  method: { backgroundColor: paper, paddingVertical: 105 }, sectionIndex: { color: '#658172', fontSize: 10, fontWeight: '600', letterSpacing: 2 }, methodTop: { justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 46 }, sectionTitle: { color: ink, fontWeight: '600', letterSpacing: -2.2, lineHeight: 58 }, methodList: { borderTopWidth: 1, borderTopColor: '#CFD9CE' }, methodRow: { paddingVertical: 27, gap: 24, borderBottomWidth: 1, borderBottomColor: '#CFD9CE' }, methodIcon: { width: 46, height: 46, borderRadius: 9, backgroundColor: '#E5EEE0', alignItems: 'center', justifyContent: 'center' }, methodTitle: { color: ink, width: 165, fontSize: 24, fontWeight: '600', letterSpacing: -.7 }, methodDetail: { color: muted, fontSize: 14, lineHeight: 22, maxWidth: 530 },
  product: { backgroundColor: '#EAF0E6', paddingVertical: 110 }, productCopy: { color: '#607866', fontSize: 16, lineHeight: 25, maxWidth: 470, marginTop: 22 }, productPoints: { marginTop: 35, borderTopWidth: 1, borderTopColor: '#C7D8C7' }, proof: { flexDirection: 'row', gap: 14, paddingVertical: 19, borderBottomWidth: 1, borderBottomColor: '#C7D8C7' }, proofIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#D9E8D6', alignItems: 'center', justifyContent: 'center' }, proofTitle: { color: ink, fontSize: 14, fontWeight: '600' }, proofDetail: { color: '#6D8371', fontSize: 12, lineHeight: 18, marginTop: 4 }, productBoard: { backgroundColor: '#FCFDF9', borderRadius: 14, padding: 25, shadowColor: '#4B7253', shadowOpacity: .13, shadowRadius: 28, shadowOffset: { width: 0, height: 15 }, elevation: 7 }, boardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, boardOverline: { color: '#8FA293', fontSize: 9, fontWeight: '600', letterSpacing: 1 }, boardHeading: { color: ink, fontSize: 25, fontWeight: '600', marginTop: 6 }, boardMenu: { flexDirection: 'row', gap: 3 }, boardMenuDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#A2B3A4' }, boardTotal: { backgroundColor: green, borderRadius: 10, padding: 23, marginTop: 24, marginBottom: 12 }, boardTotalLabel: { color: '#B8D6BC', fontSize: 9, fontWeight: '600', letterSpacing: 1 }, boardTotalNumber: { color: '#fff', fontSize: 38, fontWeight: '600', letterSpacing: -1.3, marginTop: 10 }, boardTotalBottom: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }, boardTotalNote: { color: '#CBE3D0', fontSize: 11 }, boardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#EBEEE7' }, boardAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#D9E7D4', alignItems: 'center', justifyContent: 'center' }, boardAvatarText: { color: green, fontSize: 9, fontWeight: '600' }, boardName: { color: ink, fontSize: 12, fontWeight: '600' }, boardSub: { color: '#8D9D90', fontSize: 10, marginTop: 2 }, boardMoney: { color: green, fontSize: 12, fontWeight: '600' }, boardFoot: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 18 }, boardFootText: { color: green, fontSize: 11, fontWeight: '600' },
  industries: { backgroundColor: accent, paddingVertical: 30 }, industriesTitle: { color: ink, fontSize: 17, fontWeight: '600' }, industryChip: { borderWidth: 1, borderColor: '#A4B9A4', borderRadius: 40, paddingHorizontal: 16, paddingVertical: 8 }, industryText: { color: ink, fontSize: 12, fontWeight: '600' },
  questions: { backgroundColor: paper, paddingVertical: 105 }, questionsLayout: { gap: 60 }, questionsAside: { color: muted, fontSize: 14, lineHeight: 23, marginTop: 22, maxWidth: 340 }, question: { borderBottomWidth: 1, borderBottomColor: '#CAD8CC', paddingVertical: 23 }, questionTitle: { color: ink, fontSize: 15, fontWeight: '600', flex: 1 }, answer: { color: muted, fontSize: 13, lineHeight: 21, marginTop: 15, marginLeft: 32 },
  close: { backgroundColor: '#ECF2E7', paddingVertical: 74 }, closeRule: { height: 1, backgroundColor: '#C2D1C1', marginBottom: 28 }, closeKicker: { color: '#67836F', fontSize: 10, fontWeight: '600', letterSpacing: 1.9 }, closeMain: { justifyContent: 'space-between', gap: 25, marginTop: 19 }, closeTitle: { color: ink, fontWeight: '600', letterSpacing: -2.5 }, closeCopy: { color: muted, fontSize: 14, lineHeight: 23 }, closeButton: { backgroundColor: accent, borderRadius: 8, minHeight: 51, flexDirection: 'row', alignItems: 'center', gap: 24, paddingHorizontal: 20, marginTop: 21 }, closeButtonText: { color: ink, fontSize: 14, fontWeight: '500' }, footer: { backgroundColor: ink, paddingVertical: 30 }, footerLine: { color: '#ABC0AE', fontSize: 11 }, footerLanguage: { paddingHorizontal: 9, paddingVertical: 7, borderRadius: 6 }, footerLanguageActive: { backgroundColor: '#315B41' }, footerLanguageText: { color: '#D6E6D6', fontSize: 10, fontWeight: '600' }, footerLink: { color: '#E8F1E5', fontSize: 11, fontWeight: '600' },
});
