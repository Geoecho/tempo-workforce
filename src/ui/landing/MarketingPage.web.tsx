import React, { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { AnimatePresence, motion, MotionConfig, useReducedMotion, useScroll, useSpring } from 'motion/react';
import { LANGUAGES, Language, useLanguage } from '../../lib/i18n';
import { landingText } from './copy';
import { landingStyles } from './styles';

type IconName = 'arrow' | 'down' | 'check' | 'clock' | 'people' | 'globe' | 'calendar' | 'plus';
function Icon({ name = 'arrow', size = 20 }: { name?: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    down: <path d="m6 9 6 6 6-6" />,
    check: <path d="m5 12 4 4L19 6" />,
    clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></>,
    people: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2m1-15a3 3 0 0 1 0 6m2 3a6 6 0 0 1 3 5" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18" /></>,
    calendar: <><rect x="4" y="5" width="16" height="16" rx="3" /><path d="M8 3v4m8-4v4M4 11h16" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Mark() { return <span className="tempo-mark" aria-hidden="true"><i /><i /><i /></span>; }
function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={{ y: reduced ? 0 : 28 }} whileInView={{ y: 0 }} viewport={{ once: true, amount: .16 }} transition={{ duration: .8, ease: [.22, 1, .36, 1] }}>{children}</motion.div>;
}

const stories = [
  { tab: 'Plan', title: 'A place for every person.', body: 'Put the right people in the right place. Everyone knows when to arrive and what comes next.', icon: 'calendar' as const },
  { tab: 'Check in', title: 'Be there. Be counted.', body: 'A quick scan connects the person, the place, and the time. No chasing messages at the end of the day.', icon: 'clock' as const },
  { tab: 'Time & pay', title: 'Time that adds up.', body: 'See recorded hours become estimated earnings. Review, approve, and export when you are ready.', icon: 'check' as const },
];
const questions = [
  ['Can this work outside events?', 'Yes. Tempo is built for any team scheduling people across locations, including factories, hospitality, and field operations.'],
  ['How do workers check in?', 'An assigned worker scans the live QR code at the site. Their clock record appears in the shared workspace.'],
  ['Can I review pay before exporting?', 'Yes. Managers can review recorded time and estimated earnings, approve daily records, and export CSV.'],
  ['Which languages can our team use?', 'English (US), Macedonian, and Albanian are available. Each person can choose their own language.'],
];

export default function MarketingPage() {
  const { language, setLanguage } = useLanguage();
  const t = (text: string) => landingText(text, language);
  const reduced = useReducedMotion();
  const page = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [question, setQuestion] = useState<number | null>(null);
  const { scrollYProgress } = useScroll({ container: page });
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 28 });
  const begin = () => router.replace('/start?intent=admin');
  const jump = (id: string) => page.current?.querySelector(`#${id}`)?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' });

  useEffect(() => {
    const previous = document.title;
    document.title = `Tempo — ${landingText('A better rhythm for work.', language)}`;
    return () => { document.title = previous; };
  }, [language]);

  return <MotionConfig reducedMotion="user"><div className="tempo-site" ref={page} lang={language}>
    <style>{landingStyles}</style>
    <a className="tempo-skip" href="#platform">{t('Explore the platform')}</a>
    <header className="tempo-header"><div className="tempo-container tempo-header-inner">
      <button className="tempo-brand" onClick={() => page.current?.scrollTo({ top: 0, behavior: reduced ? 'instant' : 'smooth' })} aria-label={t('Back to top')}><Mark />tempo</button>
      <nav className="tempo-nav" aria-label={t('The platform')}><button onClick={() => jump('platform')}>{t('The platform')}</button><button onClick={() => jump('people')}>{t('For your team')}</button><button onClick={() => jump('questions')}>{t('Questions')}</button></nav>
      <div className="tempo-header-actions"><label className="tempo-language"><Icon name="globe" size={16} /><select aria-label={t('Choose language')} value={language} onChange={e => setLanguage(e.target.value as Language)}>{LANGUAGES.map(item => <option key={item.code} value={item.code}>{item.short}</option>)}</select><Icon name="down" size={12} /></label><button className="tempo-signin" onClick={() => router.replace('/start')}>{t('Sign in')}</button><button className="tempo-button small" onClick={begin}><span>{t('Get started')}</span><Icon size={16} /></button></div>
    </div><motion.div className="tempo-progress" style={{ scaleX: reduced ? scrollYProgress : progress }} /></header>

    <main>
      <section className="tempo-hero tempo-container">
        <motion.div initial={{ y: reduced ? 0 : 20 }} animate={{ y: 0 }} transition={{ duration: .9, ease: [.22, 1, .36, 1] }}>
          <p className="tempo-eyebrow"><span className="tempo-status-dot" />{t('People. Time. In sync.')}</p>
          <h1>{t('Every shift,')}<br /><span>{t('in sync.')}</span></h1>
          <div className="tempo-hero-side">
          <p>{t('Your team has enough to do. Give them one simple place for shifts, hours, and pay.')}</p>
          <button className="tempo-button" onClick={begin}>{t('Start your workspace')}<Icon /></button>
          <button className="tempo-text-link" onClick={() => jump('platform')}>{t('Explore the platform')}<Icon name="down" size={17} /></button>
          </div>
        </motion.div>
        <motion.div className="tempo-hero-preview" initial={{ y: reduced ? 0 : 24 }} animate={{ y: 0 }} transition={{ duration: .7, delay: .1, ease: [.22, 1, .36, 1] }}>
          <div className="tempo-hero-preview-label"><span className="tempo-status-dot" />{t('Interactive preview')}</div>
          <SchedulePreview t={t} />
          <div className="tempo-hero-workflow">{stories.map((story, index) => <button key={story.tab} onClick={() => { setStep(index); jump('platform'); }}><Icon name={story.icon} size={18} /><span>{t(story.tab)}</span><Icon size={14} /></button>)}</div>
        </motion.div>
      </section>

      <section className="tempo-theatre tempo-container" id="platform" aria-label={t('Interactive preview')}>
        <div className="tempo-stage-top"><span><span className="tempo-status-dot" />{t('Everything moves together.')}</span><span className="tempo-demo-label">{t('Interactive preview')}</span></div>
        <div className="tempo-stage"><div className="tempo-stage-copy">
          <div className="tempo-tabs" role="tablist" aria-label={t('Try the workflow')}>{stories.map((story, index) => <button key={story.tab} id={`tempo-tab-${index}`} aria-controls="tempo-story-panel" role="tab" aria-selected={step === index} tabIndex={step === index ? 0 : -1} onKeyDown={event => { if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return; event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (step + (event.key === 'ArrowRight' ? 1 : 2)) % 3; setStep(next); document.getElementById(`tempo-tab-${next}`)?.focus(); }} onClick={() => setStep(index)}>{step === index && <motion.span layoutId="tempo-active-tab" className="tempo-tab-active" transition={{ type: 'spring', stiffness: 360, damping: 34 }} />}<span>{t(story.tab)}</span></button>)}</div>
          <AnimatePresence mode="wait" initial={false}><motion.div key={step} id="tempo-story-panel" role="tabpanel" aria-labelledby={`tempo-tab-${step}`} initial={{ y: reduced ? 0 : 14, opacity: .5 }} animate={{ y: 0, opacity: 1 }} exit={{ y: reduced ? 0 : -8, opacity: 0 }} transition={{ duration: .25 }}><h2>{t(stories[step].title)}</h2><p>{t(stories[step].body)}</p></motion.div></AnimatePresence>
          <div className="tempo-stage-bottom"><Mark /><span>tempo / {t(stories[step].tab)}</span></div>
        </div><div className="tempo-stage-visual"><div className="tempo-orbit" aria-hidden="true" /><AnimatePresence mode="wait" initial={false}><motion.div className="tempo-preview-shell" key={step} initial={{ y: reduced ? 0 : 28, scale: reduced ? 1 : .97, opacity: .5 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: reduced ? 0 : -15, opacity: 0 }} transition={{ duration: .4, ease: [.22, 1, .36, 1] }}>{step === 0 ? <SchedulePreview t={t} /> : step === 1 ? <ClockPreview t={t} /> : <PayPreview t={t} language={language} />}</motion.div></AnimatePresence></div></div>
        <div className="tempo-industries"><span>{t('Work happens everywhere.')}</span><div>{['Events', 'Factories', 'Hospitality', 'Field teams'].map(item => <span key={item}>{t(item)}</span>)}</div></div>
      </section>

      <section className="tempo-people tempo-container" id="people"><Reveal className="tempo-section-intro"><p className="tempo-eyebrow">{t('For your team')}</p><h2>{t('Keep everyone in the picture.')}</h2><p>{t('From the first shift to the last check-out, the details stay connected.')}</p></Reveal>
        <div className="tempo-details">{[
          { icon: 'people' as const, title: 'One team. Two clear views.', body: 'Managers plan and review. Workers see their shifts, log their time, and know what they have earned.' },
          { icon: 'clock' as const, title: 'Clear hours. Clear boundaries.', body: 'Set hourly rates and currencies. Review daily records with a 10-hour pay cap and keep overtime visible.' },
          { icon: 'globe' as const, title: 'Speak your team’s language.', body: 'English, Macedonian, and Albanian. Each person chooses the language that feels natural to them.' },
        ].map(item => <Reveal key={item.title} className="tempo-detail"><div className="tempo-detail-icon"><Icon name={item.icon} size={25} /></div><h3>{t(item.title)}</h3><p>{t(item.body)}</p></Reveal>)}</div>
      </section>

      <section className="tempo-questions tempo-container" id="questions"><Reveal><p className="tempo-eyebrow">{t('Good to know')}</p><h2>{t('Good questions.')}<br /><span>{t('Clear answers.')}</span></h2></Reveal><div className="tempo-faq-list">{questions.map(([title, answer], index) => <div className="tempo-faq" key={title}><button aria-expanded={question === index} aria-controls={`tempo-answer-${index}`} onClick={() => setQuestion(question === index ? null : index)}>{t(title)}<motion.span animate={{ rotate: question === index ? 45 : 0 }} transition={{ duration: .2 }}><Icon name="plus" size={21} /></motion.span></button><AnimatePresence initial={false}>{question === index && <motion.div id={`tempo-answer-${index}`} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: .25 }}><p>{t(answer)}</p></motion.div>}</AnimatePresence></div>)}</div></section>

      <section className="tempo-closing"><div className="tempo-container"><Reveal><Mark /><p className="tempo-eyebrow">{t('A better rhythm for work.')}</p><h2>{t('Make work flow.')}<br /><span>{t('Make time count.')}</span></h2><p className="tempo-closing-copy">{t('Bring your people together. Give every shift a little more clarity.')}</p><button className="tempo-button light" onClick={begin}>{t('Start your workspace')}<Icon /></button></Reveal><div className="tempo-closing-lines" aria-hidden="true"><i /><i /><i /><i /></div></div></section>
    </main>
    <footer className="tempo-footer tempo-container"><div><span className="tempo-brand"><Mark />tempo</span><p>{t('The operating space for teams in motion.')}</p></div><div className="tempo-footer-links"><button onClick={() => router.replace('/start?intent=worker')}>{t('Join a team')}<Icon size={16} /></button><button onClick={() => router.replace('/start')}>{t('Sign in')}</button><span>© {new Date().getFullYear()} Tempo</span></div></footer>
  </div></MotionConfig>;
}

type Translate = (text: string) => string;
function PreviewHeader({ title, t }: { title: string; t: Translate }) { return <div className="tempo-preview-header"><span className="tempo-preview-brand"><Mark />tempo</span><span>{t(title)}</span><span className="tempo-mini-avatar">JD</span></div>; }

function SchedulePreview({ t }: { t: Translate }) {
  return <div className="tempo-schedule"><PreviewHeader title="Workspace" t={t} /><div className="tempo-preview-body"><div className="tempo-preview-title"><div><span className="tempo-mini-label">{t('Week overview')}</span><h3>{t('Today’s crew')}</h3></div><span className="tempo-count"><Icon name="people" size={15} />12</span></div><div className="tempo-week">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, index) => <div className={index === 2 ? 'selected' : ''} key={day}><span>{t(day)}</span><strong>{12 + index}</strong><i /></div>)}</div><div className="tempo-timeline"><div className="tempo-time-labels"><span>08:00</span><span>12:00</span><span>18:00</span></div>{[{ title: 'Stage crew', start: '08:00', end: '18:00', width: '100%', offset: '0%', initials: ['AM', 'SB', '+4'] }, { title: 'Production', start: '10:00', end: '16:00', width: '62%', offset: '20%', initials: ['JK', '+2'] }, { title: 'Security', start: '12:00', end: '18:00', width: '60%', offset: '40%', initials: ['EL', '+2'] }].map((row, index) => <motion.div key={row.title} className={`tempo-shift-block tone-${index}`} style={{ width: row.width, marginLeft: row.offset }} initial={{ scaleX: .9 }} whileInView={{ scaleX: 1 }} transition={{ duration: .7, delay: index * .12 }}><div><strong>{t(row.title)}</strong><span>{row.start} – {row.end}</span></div><div className="tempo-avatar-group">{row.initials.map(initial => <i key={initial}>{initial}</i>)}</div></motion.div>)}</div><div className="tempo-preview-footer"><span className="tempo-tick"><Icon name="check" size={13} /></span><span>{t('Everyone knows where to be.')}</span></div></div></div>;
}

function ClockPreview({ t }: { t: Translate }) {
  const [checked, setChecked] = useState(false);
  return <div className="tempo-clock-preview"><div className="tempo-phone"><div className="tempo-phone-island" /><span className="tempo-mini-label">{t('Northline Festival')}</span><h3>{t(checked ? 'Check-in recorded' : 'Scan to clock in')}</h3><div className={`tempo-scan-window ${checked ? 'checked' : ''}`}><AnimatePresence mode="wait" initial={false}>{checked ? <motion.div className="tempo-check-circle" key="check" initial={{ scale: .6 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 14 }}><Icon name="check" size={48} /></motion.div> : <motion.svg key="code" viewBox="0 0 120 120" className="tempo-qr" aria-label={t('Sample site code')}><g fill="currentColor">{[[8, 8], [78, 8], [8, 78]].map(([x, y]) => <g key={`${x}-${y}`}><path fillRule="evenodd" d={`M${x} ${y}h34v34H${x}z m6 6v22h22V${y + 6}z`} /><rect x={x + 11} y={y + 11} width="12" height="12" /></g>)}{Array.from({ length: 12 }, (_, row) => Array.from({ length: 12 }, (_, col) => ((row * 7 + col * 11 + row * col) % 5 < 2 && !((row < 5 && col < 5) || (row < 5 && col > 7) || (row > 7 && col < 5))) ? <rect key={`${row}-${col}`} x={8 + col * 8} y={8 + row * 8} width="6" height="6" /> : null))}</g></motion.svg>}</AnimatePresence>{!checked && <div className="tempo-scan-line" />}</div><p>{t(checked ? 'You’re on the clock.' : 'Main stage · East gate')}</p><button className="tempo-button" onClick={() => setChecked(!checked)}>{t(checked ? 'Try again' : 'Preview check-in')}<Icon name={checked ? 'check' : 'arrow'} size={17} /></button></div><div className="tempo-clock-caption"><span className="tempo-status-dot" />{t('Interactive preview')}</div></div>;
}

function PayPreview({ t, language }: { t: Translate; language: Language }) {
  const money = (value: number) => new Intl.NumberFormat(language, { style: 'currency', currency: 'EUR' }).format(value);
  return <div className="tempo-pay-preview"><PreviewHeader title="Time & pay" t={t} /><div className="tempo-preview-body"><span className="tempo-mini-label">{t('A working day, accounted for.')}</span><div className="tempo-pay-person"><span className="tempo-person-avatar">AM</span><div><h3>Alex Morgan</h3><p>{t('Stage crew')}</p></div><span className="tempo-verified"><Icon name="check" size={14} />{t('Checked out')}</span></div><div className="tempo-pay-total"><span>{t('Estimated earnings')}</span><strong>{money(120)}</strong><div className="tempo-pay-bars" aria-hidden="true">{[36, 51, 44, 66, 60, 79, 72, 94, 85, 100].map((height, index) => <motion.i key={index} initial={{ scaleY: .1 }} whileInView={{ scaleY: 1 }} style={{ height: `${height}%` }} transition={{ duration: .6, delay: index * .04 }} />)}</div></div><div className="tempo-pay-breakdown"><div><span>{t('Recorded hours')}</span><strong>8h 00m</strong></div><div><span>{t('Hourly rate')}</span><strong>{money(15)}</strong></div></div><div className="tempo-preview-footer"><span className="tempo-tick"><Icon name="check" size={13} /></span>{t('Review before you pay.')}</div></div></div>;
}
