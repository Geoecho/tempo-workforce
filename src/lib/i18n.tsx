import { getCurrentLanguage, setActiveLanguage } from './locale';
import { planningTranslations, planningPatterns } from './planning-translations';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import generatedTranslations from './translations.generated.json';
import { brandTranslations } from './brand-translations';
import { reviewedTranslations } from './reviewed-translations';
import { featurePatterns, featureTranslations } from './feature-translations';

export type Language = 'en-US' | 'mk-MK' | 'sq-AL';
export const LANGUAGES: { code: Language; label: string; short: string }[] = [
  { code: 'en-US', label: 'English (US)', short: 'EN' },
  { code: 'mk-MK', label: 'Македонски', short: 'МК' },
  { code: 'sq-AL', label: 'Shqip', short: 'SQ' },
];

const translations: Record<Exclude<Language, 'en-US'>, Record<string, string>> = {
  'mk-MK': {
    Home: 'Почетна', Shifts: 'Смени', Team: 'Тим', Time: 'Време', More: 'Повеќе', Scan: 'Скенирај', Hours: 'Часови',
    Workspace: 'Работен простор', 'People & teams': 'Луѓе и тимови', 'Time & pay': 'Време и исплата', 'My hours & pay': 'Мои часови и исплата',
    'Scan site code': 'Скенирај код на локацијата', Notifications: 'Известувања', 'Create a shift': 'Создај смена', 'Edit shift': 'Уреди смена',
    'Add team member': 'Додај член на тимот', 'Worker profile': 'Профил на работник', 'Site check-in code': 'Код за пријава на локација',
    'Organize your crew and reach them quickly.': 'Организирајте го тимот и контактирајте ги брзо.',
    'A clear record of time worked and estimated earnings.': 'Јасен преглед на работните часови и проценетата заработка.',
    'Scan the live QR code shown by your site lead.': 'Скенирајте го QR-кодот што го покажува раководителот.',
    'Shared across your team.': 'Споделено со вашиот тим.', 'Settings for this prototype.': 'Поставки за овој прототип.',
    'Language': 'Јазик', 'Choose your app language.': 'Изберете јазик за апликацијата.',
    'Workspace name': 'Име на работниот простор', 'Online account': 'Онлајн сметка', 'Invite a worker': 'Покани работник',
    'View as': 'Прикажи како', 'Demo worker': 'Демо работник', 'Pay currency': 'Валута за исплата', 'Archived records': 'Архивирани записи',
    'Organization admin': 'Администратор', 'Save name': 'Зачувај име', 'Sign out': 'Одјави се', 'Save invitation': 'Зачувај покана',
    Admin: 'Администратор', Worker: 'Работник', 'Plan & oversee': 'Планирај и надгледувај', 'Shifts & hours': 'Смени и часови',
    'Show fewer currencies': 'Прикажи помалку валути', Restore: 'Врати', 'Reset demo data': 'Ресетирај демо податоци',
    'Upcoming shifts': 'Претстојни смени', 'Quick actions': 'Брзи дејства', 'Your next shift': 'Вашата следна смена',
    'Your pay today': 'Денешна исплата', 'Daily summaries': 'Дневни прегледи', 'Clock events': 'Евиденција на време',
    'Welcome back.': 'Добредојдовте повторно.', 'Sign in to Tempo': 'Најавете се во Tempo', 'Email address': 'Е-пошта', Password: 'Лозинка',
    'Sign in': 'Најави се', 'Create account': 'Создај сметка', 'Send reset link': 'Испрати врска за ресетирање',
    'Forgot password?': 'Ја заборавивте лозинката?', 'New to Tempo?': 'Нови сте во Tempo?',
    'Set up a workspace': 'Постави работен простор', 'Join an existing team': 'Приклучи се на постоечки тим',
    'For admins planning shifts': 'За администратори што планираат смени', 'For invited workers': 'За поканети работници',
    'Your shifts, people, and hours in one place.': 'Вашите смени, луѓе и часови на едно место.',
    'Create your account': 'Создајте сметка', 'Recover your account': 'Вратете ја сметката',
    'Lead your team.': 'Водете го вашиот тим.', 'Join your team.': 'Приклучете се на тимот.', 'Reset your password.': 'Ресетирајте ја лозинката.',
    'Continue': 'Продолжи', 'Back to sign in': 'Назад кон најавата', 'Enter your password': 'Внесете ја лозинката', 'At least 8 characters': 'Најмалку 8 знаци',
    'My shifts': 'Мои смени', 'Plan work and review completed shifts.': 'Планирајте работа и прегледајте завршени смени.', 'Your next shifts and recorded history.': 'Вашите следни смени и евидентирана историја.',
    Upcoming: 'Претстојни', History: 'Историја', 'Export CSV': 'Извези CSV', 'New shift': 'Нова смена',
    'No shift history yet': 'Сè уште нема историја на смени', 'Nothing on the calendar': 'Нема ништо во календарот',
    'Finished shifts and their clock records will appear here.': 'Завршените смени и временските записи ќе се појават тука.',
    "New assignments will appear here when they're scheduled.": 'Новите задачи ќе се појават тука кога ќе бидат закажани.',
    'Search people or teams': 'Пребарај луѓе или тимови', 'Add team': 'Додај тим', 'Add person': 'Додај лице', 'New team': 'Нов тим',
    'Create the team now, then add people to it.': 'Создајте го тимот, па додајте луѓе.', Cancel: 'Откажи', 'Create team': 'Создај тим',
    'No people in this team yet.': 'Сè уште нема луѓе во овој тим.', 'No people or teams match your search.': 'Нема резултати за вашето пребарување.', 'Create a team to get started.': 'Создајте тим за да започнете.',
    'PAY PERIOD': 'ПЕРИОД НА ИСПЛАТА', 'ESTIMATED PAY': 'ПРОЦЕНЕТА ИСПЛАТА',
    'Pay is capped at 10 hours per worker each day. Extra time stays in the log for manager review.': 'Исплатата е ограничена на 10 часа по работник дневно. Дополнителното време останува во евиденцијата за преглед.',
    'No time logged this month': 'Нема евидентирано време овој месец', 'Use the month controls above to review earlier time and pay.': 'Изберете претходен месец за да ги видите времето и исплатата.',
    'Timestamps use this device’s local time zone.': 'Временските ознаки ја користат локалната временска зона на уредот.',
    'Approve time': 'Одобри време', 'Undo approval': 'Повлечи одобрение',
    'See all': 'Види ги сите', 'Contact team': 'Контактирај тим', 'Review pay': 'Прегледај исплата', 'Schedule': 'Распоред', 'View timesheet': 'Види евиденција',
    'Ready to check out': 'Подготвени за одјава', 'Ready to check in': 'Подготвени за пријава', 'Ready to scan': 'Подготвени за скенирање',
    'Shift complete': 'Смената е завршена', 'You’re checked in': 'Пријавени сте', 'Could not scan': 'Скенирањето не успеа',
    Done: 'Готово', 'Try again': 'Обиди се повторно', 'Allow camera': 'Дозволи камера', 'Open camera settings': 'Отвори поставки за камера',
    'Camera access is needed to scan': 'Потребна е камера за скенирање', 'Checking code…': 'Кодот се проверува…',
    'Hold the QR code inside the frame. It scans automatically.': 'Држете го QR-кодот во рамката. Скенирањето е автоматско.',
    'Try it on this device': 'Пробајте на овој уред', 'No shifts assigned today.': 'Денес немате доделени смени.',
    'Good morning': 'Добро утро', 'Set up your crew': 'Поставете го тимот', 'Add your first team': 'Додајте го првиот тим',
    'TODAY AT A GLANCE': 'ДЕНЕС НА КРАТКО', 'Create shift': 'Создај смена', 'Site QR': 'QR на локацијата',
    'Team members': 'Членови на тимот', 'Estimated pay today': 'Проценета исплата денес', 'No upcoming shifts assigned.': 'Немате доделени претстојни смени.',
    'YOUR STATUS': 'ВАШИОТ СТАТУС', 'PAID BREAK': 'ПЛАТЕНА ПАУЗА', 'ON THE CLOCK': 'НА РАБОТА', 'OFF THE CLOCK': 'НАДВОР ОД РАБОТА',
    'Take your break.': 'Направете пауза.', 'You’re clocked in': 'Пријавени сте', 'Ready for your shift?': 'Подготвени за смената?',
    'Scan your site code when you arrive.': 'Скенирајте го кодот кога ќе пристигнете.', 'Scan to check out': 'Скенирај за одјава', 'Scan to check in': 'Скенирај за пријава',
    'End paid break': 'Заврши платена пауза', 'Start paid break': 'Започни платена пауза', 'ESTIMATED EARNINGS': 'ПРОЦЕНЕТА ЗАРАБОТКА',
    'Your organization': 'Вашата организација', 'Changes sync between signed-in devices.': 'Промените се синхронизираат меѓу најавените уреди.',
    'Switch roles to explore both sides of the workflow.': 'Променете ја улогата за да ги разгледате двата приказа.',
    'Run the crew.': 'Водете го тимот.', 'Keep the rhythm.': 'Задржете го ритамот.',
    'YOUR WORKFORCE SPACE': 'ВАШ ПРОСТОР ЗА РАБОТА', WORKFORCE: 'РАБОТНА СИЛА', 'LIVE CODE': 'АКТИВЕН КОД',
    'ESTIMATED PAY TODAY': 'ПРОЦЕНЕТА ИСПЛАТА ДЕНЕС', WORKSPACE: 'РАБОТЕН ПРОСТОР', TEAM: 'ТИМ',
    'NEXT SHIFT': 'СЛЕДНА СМЕНА', 'ON SHIFT': 'НА СМЕНА', 'SHIFT COMPLETE': 'СМЕНАТА Е ЗАВРШЕНА',
    'CURRENTLY CHECKED IN': 'МОМЕНТАЛНО ПРИЈАВЕН',
    'Schedule crews across sites': 'Распоредете тимови на повеќе локации', 'Check in securely with live QR codes': 'Пријавувајте се безбедно со активни QR-кодови',
    'Keep time and estimated pay clear': 'Имајте јасен преглед на часовите и исплатата', 'Explore Tempo': 'Истражете го Tempo',
    'ONE CLEAR PLACE FOR EVERY SHIFT': 'ЕДНО ЈАСНО МЕСТО ЗА СЕКОЈА СМЕНА',
    'No credit card for this prototype': 'Не е потребна кредитна картичка за овој прототип',
    '1 ACCOUNT': '1 СМЕТКА', '3 READY': '3 ПОДГОТВЕНО',
    checked: 'чекиран', payable: 'за исплата', people: 'луѓе', recorded: 'евидентирано', selected: 'избрано', shifts: 'смени',
    '/hour. A rate change applies to future check-ins; recorded sessions retain their original rate.': '/час. Промената на тарифата важи за идните пријавувања; снимените смени ја задржуваат претходната тарифа.',
    'Every shift,': 'Секоја смена,', 'in sync.': 'во ритам.', 'From call time to': 'Од почеток до', 'clock out.': 'крај на смената.',
    'The clean way to plan crews, record hours, and keep pay clear. One place for the people who run the work and the people doing it.': 'Јасен начин да ги планирате тимовите, евидентирате часовите и следите исплатата. Едно место за сите што ја водат и ја извршуваат работата.',
    'Build your workspace': 'Создајте работен простор', 'See the platform': 'Погледнете ја платформата',
    'WORKFORCE CONTROL, WITHOUT THE NOISE': 'ОРГАНИЗАЦИЈА НА ТИМОТ БЕЗ ХАОС',
    'MADE FOR THE SHIFT, NOT THE SPREADSHEET.': 'НАПРАВЕНО ЗА СМЕНИ, НЕ ЗА ТАБЕЛИ.',
    'Make work flow.': 'Работата нека тече.', 'Make time count.': 'Секој час нека се брои.',
    'One clear view.': 'Сè на еден поглед.', 'No guesswork.': 'Без нагаѓање.',
    'Where work happens, Tempo works.': 'Каде што има работа, тука е Tempo.',
    'Bring your crew into one workspace. Set up the first shift in minutes.': 'Соберете го тимот во еден работен простор. Поставете ја првата смена за неколку минути.',
    ACCOUNT: 'СМЕТКА', INVITATION: 'ПОКАНА', READY: 'ПОДГОТВЕНО',
    'LIVE WORKSPACE': 'АКТИВЕН РАБОТЕН ПРОСТОР', 'YOUR OPERATIONS, LIVE': 'ВАШИТЕ ОПЕРАЦИИ ВО ЖИВО',
    'HOW IT WORKS': 'КАКО ФУНКЦИОНИРА', 'THE PLATFORM': 'ПЛАТФОРМАТА', 'GOOD TO KNOW': 'ДОБРО Е ДА СЕ ЗНАЕ',
    PLAN: 'ПЛАНИРАЈ', CLOCK: 'ЕВИДЕНТИРАЈ', PAY: 'ИСПЛАТИ',
    'Scan to clock in': 'Скенирајте за пријава', 'SITE ACCESS': 'ПРИСТАП НА ЛОКАЦИЈА', 'ON SITE NOW': 'СЕГА НА ЛОКАЦИЈА', 'PAY UPDATED': 'ИСПЛАТАТА Е АЖУРИРАНА',
  },
  'sq-AL': {
    Home: 'Kreu', Shifts: 'Turnet', Team: 'Ekipi', Time: 'Koha', More: 'Më shumë', Scan: 'Skano', Hours: 'Orët',
    Workspace: 'Hapësira e punës', 'People & teams': 'Njerëzit dhe ekipet', 'Time & pay': 'Koha dhe paga', 'My hours & pay': 'Orët dhe paga ime',
    'Scan site code': 'Skano kodin e vendit', Notifications: 'Njoftimet', 'Create a shift': 'Krijo turn', 'Edit shift': 'Ndrysho turnin',
    'Add team member': 'Shto anëtar të ekipit', 'Worker profile': 'Profili i punonjësit', 'Site check-in code': 'Kodi i hyrjes në vend',
    'Organize your crew and reach them quickly.': 'Organizoni ekipin dhe kontaktojini shpejt.',
    'A clear record of time worked and estimated earnings.': 'Një pasqyrë e qartë e orëve të punës dhe fitimeve të vlerësuara.',
    'Scan the live QR code shown by your site lead.': 'Skanoni kodin QR që shfaq përgjegjësi i vendit.',
    'Shared across your team.': 'E përbashkët për ekipin tuaj.', 'Settings for this prototype.': 'Cilësimet e këtij prototipi.',
    Language: 'Gjuha', 'Choose your app language.': 'Zgjidhni gjuhën e aplikacionit.',
    'Workspace name': 'Emri i hapësirës së punës', 'Online account': 'Llogaria online', 'Invite a worker': 'Fto një punonjës',
    'View as': 'Shiko si', 'Demo worker': 'Punonjës demonstrues', 'Pay currency': 'Monedha e pagës', 'Archived records': 'Regjistrimet e arkivuara',
    'Organization admin': 'Administrator i organizatës', 'Save name': 'Ruaj emrin', 'Sign out': 'Dil', 'Save invitation': 'Ruaj ftesën',
    Admin: 'Administrator', Worker: 'Punonjës', 'Plan & oversee': 'Planifiko dhe mbikëqyr', 'Shifts & hours': 'Turnet dhe orët',
    'Show fewer currencies': 'Shfaq më pak monedha', Restore: 'Rikthe', 'Reset demo data': 'Rivendos të dhënat demo',
    'Upcoming shifts': 'Turnet e ardhshme', 'Quick actions': 'Veprime të shpejta', 'Your next shift': 'Turni juaj i ardhshëm',
    'Your pay today': 'Paga juaj sot', 'Daily summaries': 'Përmbledhjet ditore', 'Clock events': 'Regjistrimet e kohës',
    'Welcome back.': 'Mirë se u kthyet.', 'Sign in to Tempo': 'Hyni në Tempo', 'Email address': 'Adresa e emailit', Password: 'Fjalëkalimi',
    'Sign in': 'Hyr', 'Create account': 'Krijo llogari', 'Send reset link': 'Dërgo lidhjen e rivendosjes',
    'Forgot password?': 'Harruat fjalëkalimin?', 'New to Tempo?': 'I ri në Tempo?',
    'Set up a workspace': 'Krijo hapësirë pune', 'Join an existing team': 'Bashkohu me një ekip ekzistues',
    'For admins planning shifts': 'Për administratorët që planifikojnë turne', 'For invited workers': 'Për punonjësit e ftuar',
    'Your shifts, people, and hours in one place.': 'Turnet, njerëzit dhe orët tuaja në një vend.',
    'Create your account': 'Krijoni llogarinë tuaj', 'Recover your account': 'Riktheni llogarinë tuaj',
    'Lead your team.': 'Drejtoni ekipin tuaj.', 'Join your team.': 'Bashkohuni me ekipin tuaj.', 'Reset your password.': 'Rivendosni fjalëkalimin.',
    Continue: 'Vazhdo', 'Back to sign in': 'Kthehu te hyrja', 'Enter your password': 'Shkruani fjalëkalimin', 'At least 8 characters': 'Të paktën 8 karaktere',
    'My shifts': 'Turnet e mia', 'Plan work and review completed shifts.': 'Planifikoni punën dhe shqyrtoni turnet e përfunduara.', 'Your next shifts and recorded history.': 'Turnet tuaja të ardhshme dhe historiku i regjistruar.',
    Upcoming: 'Të ardhshme', History: 'Historiku', 'Export CSV': 'Eksporto CSV', 'New shift': 'Turn i ri',
    'No shift history yet': 'Ende nuk ka histori turnesh', 'Nothing on the calendar': 'Kalendari është bosh',
    'Finished shifts and their clock records will appear here.': 'Turnet e përfunduara dhe regjistrimet e kohës do të shfaqen këtu.',
    "New assignments will appear here when they're scheduled.": 'Detyrat e reja do të shfaqen këtu kur të planifikohen.',
    'Search people or teams': 'Kërko njerëz ose ekipe', 'Add team': 'Shto ekip', 'Add person': 'Shto person', 'New team': 'Ekip i ri',
    'Create the team now, then add people to it.': 'Krijoni ekipin dhe më pas shtoni njerëz.', Cancel: 'Anulo', 'Create team': 'Krijo ekip',
    'No people in this team yet.': 'Ende nuk ka njerëz në këtë ekip.', 'No people or teams match your search.': 'Nuk ka rezultate për kërkimin tuaj.', 'Create a team to get started.': 'Krijoni një ekip për të filluar.',
    'PAY PERIOD': 'PERIUDHA E PAGËS', 'ESTIMATED PAY': 'PAGA E VLERËSUAR',
    'Pay is capped at 10 hours per worker each day. Extra time stays in the log for manager review.': 'Paga kufizohet në 10 orë për punonjës në ditë. Koha shtesë ruhet për shqyrtim nga menaxheri.',
    'No time logged this month': 'Nuk ka kohë të regjistruar këtë muaj', 'Use the month controls above to review earlier time and pay.': 'Zgjidhni një muaj të mëparshëm për të parë kohën dhe pagën.',
    'Timestamps use this device’s local time zone.': 'Kohët përdorin zonën kohore lokale të pajisjes.',
    'Approve time': 'Mirato kohën', 'Undo approval': 'Anulo miratimin',
    'See all': 'Shiko të gjitha', 'Contact team': 'Kontakto ekipin', 'Review pay': 'Shqyrto pagën', Schedule: 'Orari', 'View timesheet': 'Shiko orët',
    'Ready to check out': 'Gati për të dalë', 'Ready to check in': 'Gati për të hyrë', 'Ready to scan': 'Gati për skanim',
    'Shift complete': 'Turni përfundoi', 'You’re checked in': 'Jeni regjistruar', 'Could not scan': 'Skanimi dështoi',
    Done: 'U krye', 'Try again': 'Provo përsëri', 'Allow camera': 'Lejo kamerën', 'Open camera settings': 'Hap cilësimet e kamerës',
    'Camera access is needed to scan': 'Për skanim nevojitet kamera', 'Checking code…': 'Po kontrollohet kodi…',
    'Hold the QR code inside the frame. It scans automatically.': 'Mbajeni kodin QR brenda kornizës. Skanohet automatikisht.',
    'Try it on this device': 'Provojeni në këtë pajisje', 'No shifts assigned today.': 'Sot nuk keni turne të caktuara.',
    'Good morning': 'Mirëmëngjes', 'Set up your crew': 'Përgatitni ekipin', 'Add your first team': 'Shtoni ekipin e parë',
    'TODAY AT A GLANCE': 'SOT ME NJË VËSHTRIM', 'Create shift': 'Krijo turn', 'Site QR': 'QR i vendit',
    'Team members': 'Anëtarët e ekipit', 'Estimated pay today': 'Paga e vlerësuar sot', 'No upcoming shifts assigned.': 'Nuk keni turne të ardhshme.',
    'YOUR STATUS': 'STATUSI JUAJ', 'PAID BREAK': 'PUSHIM I PAGUAR', 'ON THE CLOCK': 'NË PUNË', 'OFF THE CLOCK': 'JASHTË PUNËS',
    'Take your break.': 'Bëni pushimin.', 'You’re clocked in': 'Jeni në punë', 'Ready for your shift?': 'Gati për turnin?',
    'Scan your site code when you arrive.': 'Skanoni kodin e vendit kur të mbërrini.', 'Scan to check out': 'Skano për të dalë', 'Scan to check in': 'Skano për të hyrë',
    'End paid break': 'Përfundo pushimin e paguar', 'Start paid break': 'Fillo pushimin e paguar', 'ESTIMATED EARNINGS': 'FITIMET E VLERËSUARA',
    'Your organization': 'Organizata juaj', 'Changes sync between signed-in devices.': 'Ndryshimet sinkronizohen mes pajisjeve ku jeni identifikuar.',
    'Switch roles to explore both sides of the workflow.': 'Ndërroni rolin për të parë të dyja anët e punës.',
    'Run the crew.': 'Drejtoni ekipin.', 'Keep the rhythm.': 'Mbani ritmin.',
    'YOUR WORKFORCE SPACE': 'HAPËSIRA JUAJ E PUNËS', WORKFORCE: 'FUQIA PUNËTORE', 'LIVE CODE': 'KOD AKTIV',
    'ESTIMATED PAY TODAY': 'PAGA E VLERËSUAR SOT', WORKSPACE: 'HAPËSIRA E PUNËS', TEAM: 'EKIPI',
    'NEXT SHIFT': 'TURNI TJETËR', 'ON SHIFT': 'NË TURN', 'SHIFT COMPLETE': 'TURNI PËRFUNDOI',
    'CURRENTLY CHECKED IN': 'AKTUALISHT I REGJISTRUAR',
    'Schedule crews across sites': 'Planifikoni ekipet në vende të ndryshme', 'Check in securely with live QR codes': 'Regjistrohuni në mënyrë të sigurt me kode QR aktive',
    'Keep time and estimated pay clear': 'Mbani të qarta orët dhe pagën e vlerësuar', 'Explore Tempo': 'Eksploroni Tempo',
    'ONE CLEAR PLACE FOR EVERY SHIFT': 'NJË VEND I QARTË PËR ÇDO TURN',
    'No credit card for this prototype': 'Nuk nevojitet kartë krediti për këtë prototip',
    '1 ACCOUNT': '1 LLOGARIA', '3 READY': '3 GATI',
    checked: 'regjistruar', payable: 'për pagesë', people: 'njerëz', recorded: 'regjistruar', selected: 'zgjedhur', shifts: 'turne',
    '/hour. A rate change applies to future check-ins; recorded sessions retain their original rate.': '/orë. Ndryshimi i tarifës vlen për regjistrimet e ardhshme; seancat e regjistruara ruajnë tarifën e mëparshme.',
    'Every shift,': 'Çdo turn,', 'in sync.': 'në një ritëm.', 'From call time to': 'Nga fillimi deri në', 'clock out.': 'fund të turnit.',
    'The clean way to plan crews, record hours, and keep pay clear. One place for the people who run the work and the people doing it.': 'Një mënyrë e qartë për të planifikuar ekipet, regjistruar orët dhe ndjekur pagën. Një vend për ata që e drejtojnë punën dhe ata që e kryejnë.',
    'Build your workspace': 'Krijoni hapësirën e punës', 'See the platform': 'Shikoni platformën',
    'WORKFORCE CONTROL, WITHOUT THE NOISE': 'ORGANIZIMI I EKIPIT PA RRËMUJË',
    'MADE FOR THE SHIFT, NOT THE SPREADSHEET.': 'KRIJUAR PËR TURNET, JO PËR TABELAT.',
    'Make work flow.': 'Puna të ecë lehtë.', 'Make time count.': 'Çdo orë ka vlerë.',
    'One clear view.': 'Gjithçka në një pamje.', 'No guesswork.': 'Pa hamendësime.',
    'Where work happens, Tempo works.': 'Kudo që punohet, Tempo është aty.',
    'Bring your crew into one workspace. Set up the first shift in minutes.': 'Mblidhni ekipin në një hapësirë pune. Krijoni turnin e parë brenda pak minutash.',
    ACCOUNT: 'LLOGARIA', INVITATION: 'FTESA', READY: 'GATI',
    'LIVE WORKSPACE': 'HAPËSIRË AKTIVE PUNE', 'YOUR OPERATIONS, LIVE': 'OPERACIONET TUAJA DREJTPËRDREJT',
    'HOW IT WORKS': 'SI FUNKSIONON', 'THE PLATFORM': 'PLATFORMA', 'GOOD TO KNOW': 'MIRË TA DINI',
    PLAN: 'PLANIFIKO', CLOCK: 'REGJISTRO', PAY: 'PAGUAJ',
    'Scan to clock in': 'Skano për të hyrë', 'SITE ACCESS': 'HYRJA NË VEND', 'ON SITE NOW': 'TANI NË VEND', 'PAY UPDATED': 'PAGA U PËRDITËSUA',
  },
};

type LanguageContextValue = { language: Language; setLanguage: (value: Language) => void; t: (english: string) => string };
const LanguageContext = createContext<LanguageContextValue>({ language: 'en-US', setLanguage: () => {}, t: value => value });
const STORAGE_KEY = 'tempo.language';
export { getCurrentLanguage } from './locale';
function languageFromUrl(): Language | null {
  if (typeof window === 'undefined' || !window.location?.search) return null;
  const value = new URLSearchParams(window.location.search).get('lang');
  return LANGUAGES.find(item => item.code === value)?.code ?? null;
}

const dynamicTranslations: Record<Exclude<Language, 'en-US'>, Record<string, string>> = {
  'mk-MK': {
    'Break started {0} · Time remains paid': 'Паузата започна во {0} · Времето е платено',
    'Since {0}': 'Од {0}', 'Create {0} shifts': 'Создај {0} смени', 'Hourly rate ({0})': 'Цена по час ({0})',
    'You’re active at {0}. Scan that shift’s code when you leave.': 'Активни сте на {0}. Скенирајте го кодот на смената кога ќе заминете.',
    'Show {0} more currencies': 'Прикажи уште {0} валути', 'Restore {0}': 'Врати {0}', 'Call {0}': 'Повикај {0}',
    'Open {0} profile': 'Отвори профил на {0}', 'Download {0} CSV': 'Преземи CSV за {0}',
    '{0} unread notifications': '{0} непрочитани известувања', '{0} profile photo': 'Профилна слика на {0}',
    'Open {0} shift': 'Отвори смена {0}', 'Choose {0}': 'Избери {0}',
    'Checked in to {0}': 'Пријавени на {0}', 'Checked out of {0}': 'Одјавени од {0}',
    'Please wait {0} seconds before scanning again. Your last clock action was saved.': 'Почекајте {0} секунди пред повторно скенирање. Последното дејство е зачувано.',
    "You're invited to {0}! Open https://tempo-workforce.vercel.app/start and continue with the Google account for {1}.": 'Поканети сте во {0}! Отворете https://tempo-workforce.vercel.app/start и продолжете со Google сметката за {1}.',
  },
  'sq-AL': {
    'Break started {0} · Time remains paid': 'Pushimi filloi në {0} · Koha vazhdon të paguhet',
    'Since {0}': 'Që nga {0}', 'Create {0} shifts': 'Krijo {0} turne', 'Hourly rate ({0})': 'Tarifa për orë ({0})',
    'You’re active at {0}. Scan that shift’s code when you leave.': 'Jeni aktiv në {0}. Skanoni kodin e turnit kur të largoheni.',
    'Show {0} more currencies': 'Shfaq edhe {0} monedha', 'Restore {0}': 'Rikthe {0}', 'Call {0}': 'Telefono {0}',
    'Open {0} profile': 'Hap profilin e {0}', 'Download {0} CSV': 'Shkarko CSV për {0}',
    '{0} unread notifications': '{0} njoftime të palexuara', '{0} profile photo': 'Fotografia e profilit të {0}',
    'Open {0} shift': 'Hap turnin {0}', 'Choose {0}': 'Zgjidh {0}',
    'Checked in to {0}': 'Regjistruar në {0}', 'Checked out of {0}': 'Dalë nga {0}',
    'Please wait {0} seconds before scanning again. Your last clock action was saved.': 'Prisni {0} sekonda para skanimit tjetër. Veprimi i fundit u ruajt.',
    "You're invited to {0}! Open https://tempo-workforce.vercel.app/start and continue with the Google account for {1}.": 'Jeni ftuar në {0}! Hapni https://tempo-workforce.vercel.app/start dhe vazhdoni me llogarinë Google për {1}.',
  },
};

function translateDynamic(value: string, language: Exclude<Language, 'en-US'>) {
  const features = Object.fromEntries(Object.entries({ ...featurePatterns, ...planningPatterns }).map(([key, pair]) => [key, pair[language === 'mk-MK' ? 0 : 1]]));
  for (const [pattern, translation] of Object.entries({ ...dynamicTranslations[language], ...features })) {
    const parts = pattern.split(/\{\d+\}/);
    const expression = new RegExp('^' + parts.map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('(.+?)') + '$');
    const match = value.match(expression);
    if (match) return translation.replace(/\{(\d+)\}/g, (_, index: string) => match[Number(index) + 1] ?? '');
  }
  return value;
}

export function translateUi(english: string, language: Language = getCurrentLanguage()) {
  if (language === 'en-US') return english;
  const match = english.match(/^(\s*)(.*?)(\s*)$/s);
  if (!match) return english;
  const [, before, key, after] = match;
  const generated = generatedTranslations[language] as Record<string, string>;
  return before + (planningTranslations[key]?.[language === 'mk-MK' ? 0 : 1] ?? featureTranslations[key]?.[language === 'mk-MK' ? 0 : 1] ?? reviewedTranslations[key]?.[language === 'mk-MK' ? 0 : 1] ?? brandTranslations[key]?.[language === 'mk-MK' ? 0 : 1] ?? translations[language][key] ?? generated[key] ?? translateDynamic(key, language)) + after;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setCurrentLanguage] = useState<Language>(() => { const initial = languageFromUrl() ?? 'en-US'; setActiveLanguage(initial); return initial; });
  useEffect(() => { const linked = languageFromUrl(); if (linked) { void AsyncStorage.setItem(STORAGE_KEY, linked); return; } AsyncStorage.getItem(STORAGE_KEY).then(value => { if (LANGUAGES.some(item => item.code === value)) { setActiveLanguage(value as Language); setCurrentLanguage(value as Language); } }).catch(() => {}); }, []);
  const setLanguage = (value: Language) => {
    setActiveLanguage(value);
    setCurrentLanguage(value);
    void AsyncStorage.setItem(STORAGE_KEY, value);
    if (typeof window !== 'undefined' && window.location?.search) {
      const url = new URL(window.location.href);
      if (url.searchParams.has('lang')) {
        url.searchParams.set('lang', value);
        window.history.replaceState(null, '', url.toString());
      }
    }
  };
  const context = useMemo(() => ({ language, setLanguage, t: (english: string) => translateUi(english, language) }), [language]);
  return <LanguageContext.Provider value={context}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);
