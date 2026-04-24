'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getDailyEnergy } from '@/lib/matrix-calc';
import { getEnergyById } from '@/lib/energies';
import { onAuthStateChanged, type User } from '@/lib/firebase';
import AuthModal from '@/components/AuthModal';

const WEEKDAYS = ['неділя', 'понеділок', 'вівторок', 'середа', 'четвер', 'пятниця', 'субота'];
const MONTHS = [
  'січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
  'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня',
];

function formatDate(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} р., ${WEEKDAYS[d.getDay()]}`;
}

const AFFIRMATIONS: Record<number, string> = {
  1: "Сьогодні я — творець своєї реальності. Моя воля формує світ навколо мене.",
  2: "Я довіряю своїй інтуїції. Тиша всередині показує мені правильний шлях.",
  3: "Я відкриваю своє серце до краси та достатку. Творчість тече крізь мене вільно.",
  4: "Я будую міцні основи свого життя. Мій порядок дає мені силу.",
  5: "Я відкритий до мудрості Всесвіту. Знання приходять до мене в потрібний час.",
  6: "Я роблю вибір серцем. Любов і гармонія направляють мої рішення.",
  7: "Я рухаюся вперед із рішучістю. Моя воля сильніша за будь-яку перешкоду.",
  8: "Я діяю чесно та справедливо. Баланс у моєму житті — моя сила.",
  9: "Я занурююся в глибини свого «Я». У самотності я знаходжу мудрість.",
  10: "Я відкритий до змін і нових можливостей. Колесо Долі обертається на мою користь.",
  11: "Я сильний зсередини. Моя терплячість і любов перемагають будь-які виклики.",
  12: "Я зупиняюся і дивлюся на ситуацію з нового кута. Нові перспективи відкривають мені шлях.",
  13: "Я відпускаю старе та приймаю трансформацію. Кожне завершення — це нове народження.",
  14: "Я знаходжу золоту середину. Терпіння та баланс ведуть мене до гармонії.",
  15: "Я усвідомлюю свої тіньові сторони та звільняюся від залежностей. Моя харизма служить добру.",
  16: "Я приймаю раптові зміни з відкритим серцем. Після руйнування приходить оновлення.",
  17: "Я несу світло надії. Мрія веде мене до зірок.",
  18: "Я довіряю своїй інтуїції та розрізняю ілюзії від реальності. Підсвідоме захищає мене.",
  19: "Я сяю як Сонце! Моя радість і енергія надихають всіх навколо.",
  20: "Я прислухаюся до внутрішнього заклику. Моє призначення пробуджується сьогодні.",
  21: "Я святкую свої досягнення та готуюся до нового циклу. Я цілісний і завершений.",
  22: "Я відкритий до невідомого. Довіра до Всесвіту дарує мені свободу.",
};

const MEDITATIONS: Record<number, string> = {
  1: "Сядьте рівно, закрийте очі. Уявіть яскраву золоту кулю в центрі грудей. Вона пульсує разом із вашим серцем. З кожним вдихом куля збільшується, наповнюючи вас силою та впевненістю. Утримуйте це відчуття 5 хвилин.",
  2: "Знайдіть тихе місце. Закрийте очі та слухайте тишу. Уявіть срібне сяйво місяця, що наповнює вас. Ставте запитання своїй інтуїції та чекайте на відповідь у відчуттях, образах, словах.",
  3: "Уявіть квітучий сад — яскравий і живий. Ви — частина цього саду. Відчуйте, як творча енергія тече крізь вас, як вода крізь річку. Дозвольте ідеям вільно приходити і йти.",
  4: "Уявіть міцне дерево з глибокими корінням. Ви — це дерево. Ваші корені сягають глибоко в землю, даючи стабільність. Гілки тягнуться до неба. Відчуйте свою силу та стійкість.",
  5: "Сядьте у зручну позу. Уявіть золоте світло, що входить у ваше тіло з макушки. Воно несе мудрість Всесвіту. З кожним вдихом ви відкриваєтесь до нових знань і розуміння.",
  6: "Покладіть руку на серце. Відчуйте своє серцебиття. Уявіть рожеве сяйво навколо серця. З кожним вдихом воно розширюється, наповнюючи вас любов'ю та гармонією.",
  7: "Уявіть себе на вершині гори. Вітер дме вам в обличчя. Ви чуєте заклик — рухатися вперед. Відчуйте в тілі рішучість та непохитну волю. Нічого не зупинить вас на шляху до мети.",
  8: "Уявіть терези в руках. Повільно врівноважуйте їх. Відчуйте, як баланс відновлюється в усіх сферах вашого життя — стосунках, роботі, здоров'ї. Справедливість завжди торжествує.",
  9: "Уявіть себе на самоті у красивому лісі вночі. Зорі сяють над вами. Вони говорять з вами мовою мовчання. Запитайте своє серце: що для мене справжнє? Слухайте відповідь.",
  10: "Уявіть Колесо Фортуни, що повільно обертається. Ви спостерігаєте за його рухом. Що йде, те йде; що має прийти — прийде. Відпустіть контроль і відкрийтесь до потоку змін.",
  11: "Покладіть руки на коліна. Відчуйте вагу свого тіла. З кожним вдихом відчуйте, як ваша внутрішня сила зростає. Ви — втілення спокійної, невичерпної сили. Нічого вас не похитне.",
  12: "Уявіть, що ви дивитесь на ситуацію зверху, з пташиного польоту. Все виглядає інакше. Що нового ви бачите? Яке рішення стає очевидним з цієї перспективи?",
  13: "Уявіть осінній ліс. Листя падає — красиво і спокійно. Це не кінець, а підготовка до нового. Що вам потрібно відпустити сьогодні? Дозвольте цьому впасти, як листю.",
  14: "Уявіть дві склянки — одна з вогнем, інша з водою. Повільно змішайте їх — і виникає ідеальна тепла вода. Гармонія — у поєднанні протилежностей. Знайдіть баланс між дією та спокоєм.",
  15: "Уявіть темну кімнату. Запаліть у ній свічку. Навіть маленьке світло розганяє темряву. Що у вас є темного, що потребує усвідомлення? Ваша тінь — це не ворог, а частина вас.",
  16: "Уявіть блискавку — миттєву і очищаючу. Вона руйнує старе, щоб звільнити місце для нового. Що у вашому житті готове до оновлення? Прийміть зміну як подарунок.",
  17: "Уявіть ясне нічне небо, повне зір. Знайдіть свою Полярну Зірку — мрію, яка веде вас. Відчуйте, як надія наповнює кожну клітину вашого тіла. Ваша зірка завжди з вами.",
  18: "Закрийте очі та занурте в темряву. Відчуйте, що підсвідоме несе вам сьогодні. Не аналізуйте — просто спостерігайте. Образи, відчуття, слова — все є посланням для вас.",
  19: "Уявіть яскраве Сонце над головою. Його промені зігрівають ваше обличчя, руки, тіло. Ви наповнені радістю та життєвою силою. Ця радість ваша — і вона безмежна.",
  20: "Уявіть, що ви отримуєте послання з Всесвіту. Воно говорить про ваше призначення. Що воно говорить? Прислухайтесь до самого тихого голосу всередині — він знає все.",
  21: "Уявіть себе на вершині кола — ви завершили великий цикл. Озирніться на шлях, що пройдений. Відчуйте гордість і вдячність. Попереду — новий горизонт.",
  22: "Уявіть, що ви стоїте на краю скелі та дивитесь у невідомість. Але у вас є крила. Відчуйте довіру до Всесвіту. Зробіть крок у невідоме — і крила розкриються.",
};

export default function DailyMatrixClient() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [authOpen, setAuthOpen] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [now] = useState(() => new Date());

  useEffect(() => {
    return onAuthStateChanged((u) => setUser(u));
  }, []);

  const energyId = getDailyEnergy(now);
  const energy = getEnergyById(energyId);
  if (!energy) return null;

  const dateStr = formatDate(now);
  const affirmation = AFFIRMATIONS[energyId] ?? '';
  const meditation = MEDITATIONS[energyId] ?? '';

  return (
    <div className="min-h-[calc(100vh-72px)] max-w-[800px] mx-auto px-4 py-12">
      {/* Date badge */}
      <div className="text-center mb-10">
        <span className="inline-block px-4 py-2 rounded-full bg-[rgba(245,197,66,0.08)] border border-[rgba(245,197,66,0.2)] text-[var(--accent)] text-sm font-semibold capitalize">
          {dateStr}
        </span>
        <h1 className="text-3xl md:text-4xl font-black text-white mt-4 mb-2">
          Матриця дня
        </h1>
        <p className="text-[var(--text-muted)] text-base">
          Енергія сьогоднішнього дня за Матрицею Долі
        </p>
      </div>

      {/* Main energy card */}
      <div className="relative glass-card p-8 md:p-10 mb-6 overflow-hidden">
        <div className="nebula-bg opacity-40" />
        <div className="relative z-10">
          <div className="flex items-start gap-6 mb-6 flex-wrap">
            <div className="energy-badge w-20 h-20 text-3xl flex-shrink-0">
              {energy.id}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold tracking-widest uppercase text-[var(--primary-light)] mb-1">
                Аркан дня
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-1">{energy.name}</h2>
              <div className="text-sm text-[var(--text-muted)]">
                {energy.arcana} · {energy.planet}
              </div>
            </div>
          </div>

          {/* Keywords */}
          <div className="flex flex-wrap gap-2 mb-6">
            {energy.keywords.map((kw) => (
              <span
                key={kw}
                className="px-3 py-1 rounded-full bg-[rgba(139,92,246,0.12)] border border-[rgba(139,92,246,0.25)] text-[var(--primary-light)] text-sm font-medium"
              >
                {kw}
              </span>
            ))}
          </div>

          {/* Affirmation */}
          <div className="bg-[rgba(245,197,66,0.06)] border border-[rgba(245,197,66,0.15)] rounded-2xl p-5 mb-6">
            <div className="text-xs font-bold uppercase tracking-widest text-[var(--accent)] mb-2">
              ✦ Афірмація дня
            </div>
            <p className="text-base text-white leading-relaxed italic">&ldquo;{affirmation}&rdquo;</p>
          </div>

          {/* Positive manifestation */}
          <div className="mb-4">
            <div className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2">
              Позитивний прояв
            </div>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{energy.positive}</p>
          </div>
        </div>
      </div>

      {/* Full reading gate */}
      {!showFull ? (
        <div className="glass-card p-8 text-center mb-6">
          <div className="text-4xl mb-4">🔮</div>
          <h3 className="text-xl font-bold text-white mb-2">Повне читання дня</h3>
          <p className="text-[var(--text-muted)] text-sm mb-6 max-w-md mx-auto">
            Медитація дня, рекомендації, негативний прояв та детальне тлумачення енергії {energy.name}
          </p>
          <button
            onClick={() => setShowFull(true)}
            className="btn-primary px-8 py-3"
          >
            Відкрити повне читання
          </button>
        </div>
      ) : (
        <>
          {/* Negative */}
          <div className="glass-card p-6 mb-4">
            <div className="text-xs font-bold uppercase tracking-widest text-red-400 mb-2">
              Негативний прояв — чого уникати
            </div>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{energy.negative}</p>
          </div>

          {/* Advice */}
          <div className="glass-card p-6 mb-4">
            <div className="text-xs font-bold uppercase tracking-widest text-[var(--accent)] mb-2">
              Порада дня
            </div>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{energy.advice}</p>
          </div>

          {/* Meditation */}
          <div className="glass-card p-6 mb-6">
            <div className="text-xs font-bold uppercase tracking-widest text-[var(--primary-light)] mb-3">
              🧘 Медитація дня
            </div>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{meditation}</p>
          </div>
        </>
      )}

      {/* Links */}
      <div className="flex flex-col sm:flex-row gap-4 mb-10">
        <Link
          href={`/uk/wiki/${energy.slug}/`}
          className="btn-secondary flex-1 text-center justify-center"
        >
          Детальніше про {energy.name} →
        </Link>
        <Link
          href="/uk/kalkulyator-matrytsi-doli/"
          className="btn-primary flex-1 text-center justify-center"
        >
          Розрахувати мою матрицю →
        </Link>
      </div>

      {/* AI chat promo */}
      <div className="glass-card p-6 flex items-center gap-4 flex-wrap">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#8A2BE2] to-[#F5C542] flex items-center justify-center text-xl flex-shrink-0">
          ✦
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-base font-bold text-white mb-0.5">Запитай AI-провідника</h4>
          <p className="text-sm text-[var(--text-muted)]">
            Дізнайся, як енергія {energy.name} впливає особисто на тебе
          </p>
        </div>
        <Link href="/uk/ai-chat/" className="btn-secondary whitespace-nowrap">
          Відкрити чат →
        </Link>
      </div>

      <AuthModal
        open={authOpen}
        initialMode="register"
        onClose={() => setAuthOpen(false)}
      />
    </div>
  );
}
