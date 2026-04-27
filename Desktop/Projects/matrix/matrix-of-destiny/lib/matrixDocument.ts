// ─────────────────────────────────────────────────────────────────────────────
// Matrix Document Generator — builds section prompts + HTML template for PDF
// ─────────────────────────────────────────────────────────────────────────────

import { MatrixData } from './matrix-calc';
import { getEnergyById, Energy } from '@/constants/energies';

// ── Helpers ──────────────────────────────────────────────────────────────────

function energyContext(id: number): string {
  const e = getEnergyById(id);
  if (!e) return `${id}. (невідома енергія)`;
  return `${id}. ${e.name} (${e.arcana})
  Планета: ${e.planet}
  Ключові слова: ${e.keywords.join(', ')}
  Позитив: ${e.positive}
  Негатив: ${e.negative}
  Порада: ${e.advice}`;
}

function energyBrief(id: number): string {
  const e = getEnergyById(id);
  if (!e) return `${id}`;
  return `${id}. ${e.name} — ${e.keywords.join(', ')}`;
}

// ── Section definitions ─────────────────────────────────────────────────────

export interface DocumentSection {
  key: string;
  title: string;
  icon: string;
  maxTokens: number;
  buildPrompt: (m: MatrixData, name: string) => string;
}

const SYSTEM_PROMPT = `Ти — досвідчений езотерик та аналітик Матриці Долі. Пишеш професійний персоналізований аналіз для PDF-документа.
Відповідай ВИКЛЮЧНО УКРАЇНСЬКОЮ мовою. Пиши тепло, мудро, з конкретними деталями.
Формат: чистий текст абзацами (без маркдауну, без заголовків, без зірочок, без нумерації).
Кожен абзац — 3-5 речень. Звертайся до людини на "ви".
Використовуй назви енергій та арканів в тексті для глибини.`;

export const DOCUMENT_SECTIONS: DocumentSection[] = [
  {
    key: 'intro',
    title: 'Вступ та портрет',
    icon: '1',
    maxTokens: 1000,
    buildPrompt: (m, name) => `Детальний аналіз Матриці Долі для "${name}" (народження: ${m.birthDate}).

РОЗДІЛ: Вступне слово наставника + Портрет особистості

Головні енергії:
• Особистість: ${energyContext(m.personality)}
• Душа: ${energyContext(m.soul)}
• Доля: ${energyContext(m.destiny)}

Напиши:
1. Привітання та пояснення що таке Матриця Долі і як працювати з цим документом (1 абзац)
2. Портрет людини — коротке резюме хто ця людина за трьома головними енергіями. Опиши характер, внутрішні бажання та призначення у 2-3 абзаци. Це має бути як влучний психологічний портрет який здивує точністю.`,
  },
  {
    key: 'foundation',
    title: 'Фундамент особистості',
    icon: '2',
    maxTokens: 1500,
    buildPrompt: (m, name) => `Матриця Долі для "${name}" (${m.birthDate}).

РОЗДІЛ: Фундамент Особистості — Твоє Світло

Дані:
• Точка входу (Особистість/День народження): ${energyContext(m.personality)}
• Енергія Душі: ${energyContext(m.soul)}
• Вища Суть (Духовне): ${energyContext(m.spiritual)}

Напиши 5-6 абзаців:
1. Точка входу — базові якості, як людину бачать інші, соціальна маска
2. Енергія Душі — істинні глибинні бажання, що наповнює енергією, а що виснажує
3. Як Особистість та Душа взаємодіють (гармонія чи конфлікт між зовнішнім та внутрішнім)
4. Вища Суть — джерело натхнення, зв'язок з вищими силами, ангел-охоронець
5. Практична порада: як активувати найкращі прояви цих енергій`,
  },
  {
    key: 'karma',
    title: 'Кармічний багаж',
    icon: '3',
    maxTokens: 1500,
    buildPrompt: (m, name) => `Матриця Долі для "${name}" (${m.birthDate}).

РОЗДІЛ: Кармічний багаж — Твоя тінь і уроки

Дані:
• Кармічний хвіст (уроки минулого): ${energyContext(m.karmicTail)}
• Батьківська карма: ${energyContext(m.parentKarma)}

Напиши 5-6 абзаців:
1. Кармічний хвіст — які борги та негативні сценарії принесені з минулих життів
2. Як ці кармічні патерни проявляються в повсякденному житті (конкретні приклади поведінки)
3. Батьківська карма — що успадковано від роду, які програми передали предки
4. Головний кармічний блок — страх або патерн що гальмує розвиток
5. Шлях зцілення — покрокова інструкція як перевести енергію з мінуса в плюс
6. Афірмація або практика для роботи з кармою`,
  },
  {
    key: 'material',
    title: 'Матеріальний світ',
    icon: '4',
    maxTokens: 1500,
    buildPrompt: (m, name) => `Матриця Долі для "${name}" (${m.birthDate}).

РОЗДІЛ: Матеріальний світ — Гроші та Реалізація

Дані:
• Грошовий канал (Матеріальне): ${energyContext(m.material)}
• Особистість (ставлення до грошей): ${energyContext(m.personality)}
• Центр матриці: ${energyContext(m.center)}

Напиши 5-6 абзаців:
1. Грошовий канал — через які сфери, дії чи емоційні стани приходять гроші
2. Фінансові блоки — що саме перекриває грошовий потік (страхи, переконання)
3. Як особистість впливає на фінансову поведінку
4. Ідеальні професії та формати роботи (фриланс, корпорація, лідерство, творчість)
5. Конкретні кроки для розблокування фінансового потоку
6. Грошова афірмація на основі енергій`,
  },
  {
    key: 'relationships',
    title: 'Серце та відносини',
    icon: '5',
    maxTokens: 1500,
    buildPrompt: (m, name) => `Матриця Долі для "${name}" (${m.birthDate}).

РОЗДІЛ: Серце та Відносини — Кохання

Дані:
• Канал відносин (Чоловічо-жіноче): ${energyContext(m.maleFemale)}
• Душа (глибинні потреби в коханні): ${energyContext(m.soul)}
• Доля (кармічний партнер): ${energyContext(m.destiny)}

Напиши 5-6 абзаців:
1. Канал відносин — ідеальний партнер, які якості шукає підсвідомо
2. Як людина проявляє себе в коханні (плюс і мінус)
3. Блоки в коханні — чому стосунки можуть не складатися (ідеалізація, страх, жертовність)
4. Як душа впливає на вибір партнера
5. Сценарій гармонії — як побудувати щасливий союз на основі енергій
6. Порада для покращення стосунків`,
  },
  {
    key: 'talents',
    title: 'Таланти',
    icon: '6',
    maxTokens: 1500,
    buildPrompt: (m, name) => `Матриця Долі для "${name}" (${m.birthDate}).

РОЗДІЛ: Таланти — Твоя суперсила

Дані:
• Талант від Бога: ${energyContext(m.talentFromGod)}
• Талант по лінії Роду: ${energyContext(m.talentFromFamily)}
• Батьківська карма (спадковість): ${energyContext(m.parentKarma)}

Напиши 5-6 абзаців:
1. Талант від Бога — що дається легше ніж іншим, духовний дар
2. Як цей талант проявляється і як його розвивати
3. Талант від Роду — які сильні якості передали предки (по лінії батька та матері)
4. Як поєднання двох талантів створює унікальну суперсилу
5. Як активувати та монетизувати свої таланти
6. Вправа або практика для розкриття талантів`,
  },
  {
    key: 'timeline',
    title: 'Лінія призначення',
    icon: '7',
    maxTokens: 1500,
    buildPrompt: (m, name) => `Матриця Долі для "${name}" (${m.birthDate}).

РОЗДІЛ: Лінія Призначення — Твій шлях у часі

Дані:
• Призначення: ${energyContext(m.purpose)}
• Доля: ${energyContext(m.destiny)}
• Духовне: ${energyContext(m.spiritual)}
• Талант від Бога: ${energyContext(m.talentFromGod)}

Напиши 5-6 абзаців:
1. Особисте призначення (до 40 років) — що потрібно зрозуміти та змінити в собі
2. Соціальне призначення (40-60 років) — що віддати світу, людям, суспільству
3. Духовне призначення (після 60 років) — глобальна місія, мудрість зрілості
4. Як призначення пов'язане з талантами та долею
5. Конкретні кроки для реалізації призначення в поточному періоді життя`,
  },
  {
    key: 'conclusion',
    title: 'Висновок',
    icon: '8',
    maxTokens: 1000,
    buildPrompt: (m, name) => `Матриця Долі для "${name}" (${m.birthDate}).

РОЗДІЛ: Висновок — Action Plan

Ось коротке резюме всіх енергій:
• Особистість: ${energyBrief(m.personality)}
• Душа: ${energyBrief(m.soul)}
• Доля: ${energyBrief(m.destiny)}
• Духовне: ${energyBrief(m.spiritual)}
• Матеріальне: ${energyBrief(m.material)}
• Кармічний хвіст: ${energyBrief(m.karmicTail)}
• Відносини: ${energyBrief(m.maleFemale)}
• Талант від Бога: ${energyBrief(m.talentFromGod)}
• Призначення: ${energyBrief(m.purpose)}

Напиши:
1. Три найголовніші інсайти з усього аналізу (кожен — окремий абзац з практичною глибиною)
2. Практичні рекомендації на кожен день: ритуали, афірмації, звички для тримання енергій в плюсі (2 абзаци)
3. Мотиваційне завершення — надихаюче послання на шлях самопізнання (1 абзац)`,
  },
];

export function getSystemPrompt(): string {
  return SYSTEM_PROMPT;
}

// ── HTML Template Builder ───────────────────────────────────────────────────

function energyBadgeHtml(id: number): string {
  const e = getEnergyById(id);
  if (!e) return '';
  return `<div class="energy-badge">
    <span class="energy-num">${id}</span>
    <span class="energy-name">${e.name}</span>
    <span class="energy-arcana">${e.arcana}</span>
  </div>`;
}

function sectionHtml(title: string, icon: string, content: string, energyIds: number[]): string {
  const badges = energyIds.map(id => energyBadgeHtml(id)).join('');
  const paragraphs = content.split('\n').filter(p => p.trim()).map(p => `<p>${p.trim()}</p>`).join('');
  return `<div class="section">
    <div class="section-header">
      <span class="section-icon">${icon}</span>
      <h2>${title}</h2>
    </div>
    ${badges ? `<div class="badges-row">${badges}</div>` : ''}
    <div class="section-content">${paragraphs}</div>
  </div>`;
}

export function buildDocumentHTML(
  name: string,
  birthDate: string,
  matrix: MatrixData,
  sections: string[],
): string {
  const sectionConfigs = [
    { title: 'Вступ', icon: '\u2728', ids: [matrix.personality, matrix.soul, matrix.destiny] },
    { title: 'Фундамент Особистості', icon: '\u2600\uFE0F', ids: [matrix.personality, matrix.soul, matrix.spiritual] },
    { title: 'Кармічний Багаж', icon: '\uD83D\uDD17', ids: [matrix.karmicTail, matrix.parentKarma] },
    { title: 'Матеріальний Світ', icon: '\uD83D\uDCB0', ids: [matrix.material, matrix.personality] },
    { title: 'Серце та Відносини', icon: '\u2764\uFE0F', ids: [matrix.maleFemale, matrix.soul] },
    { title: 'Таланти', icon: '\u2B50', ids: [matrix.talentFromGod, matrix.talentFromFamily] },
    { title: 'Лінія Призначення', icon: '\uD83C\uDFAF', ids: [matrix.purpose, matrix.destiny, matrix.spiritual] },
    { title: 'Висновок та Рекомендації', icon: '\uD83D\uDCA1', ids: [] },
  ];

  const sectionsHtml = sections.map((content, i) =>
    sectionHtml(sectionConfigs[i].title, sectionConfigs[i].icon, content, sectionConfigs[i].ids)
  ).join('');

  return `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Матриця Долі — ${name}</title>
<style>
  @page { margin: 28px 32px; size: A4; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
    background: #0D0B1E;
    color: #FFFFFF;
    font-size: 14px;
    line-height: 1.75;
    padding: 0;
  }

  /* ── Title page ── */
  .title-page {
    text-align: center;
    padding: 80px 40px 60px;
    background: linear-gradient(180deg, #1E1B4B 0%, #130D3A 50%, #0D0B1E 100%);
    page-break-after: always;
  }
  .title-page .logo {
    width: 90px; height: 90px; border-radius: 45px;
    background: linear-gradient(135deg, #C8901A, #F5C542, #C8901A);
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 28px; font-size: 40px;
    box-shadow: 0 0 40px rgba(245,197,66,0.3);
  }
  .title-page h1 {
    font-size: 32px; font-weight: 800;
    color: #F5C542;
    margin-bottom: 8px;
  }
  .title-page .subtitle {
    color: #C4B5FD; font-size: 17px; font-weight: 600;
    margin-bottom: 40px;
  }
  .title-page .person-name {
    font-size: 26px; font-weight: 800; color: #fff;
    margin-bottom: 6px;
  }
  .title-page .birth-date {
    color: #C4B5FD; font-size: 15px;
    margin-bottom: 48px;
  }
  .title-page .divider {
    width: 80px; height: 2px;
    background: linear-gradient(90deg, transparent, #F5C542, transparent);
    margin: 0 auto 24px;
  }
  .title-page .app-name {
    color: rgba(196,181,253,0.6); font-size: 12px; font-weight: 600;
    letter-spacing: 2px; text-transform: uppercase;
  }

  /* ── Sections ── */
  .section {
    padding: 36px 32px;
    background: linear-gradient(180deg, #130D3A 0%, #0D0B1E 100%);
    page-break-inside: avoid;
    margin-bottom: 0;
  }
  .section:first-of-type {
    page-break-before: auto;
  }
  .section-header {
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 2px solid rgba(245,197,66,0.35);
  }
  .section-icon {
    font-size: 24px;
  }
  .section-header h2 {
    font-size: 20px; font-weight: 800;
    color: #F5C542;
  }
  .section-content p {
    margin-bottom: 14px;
    text-align: justify;
    color: #F0ECF8;
  }

  /* ── Energy badges ── */
  .badges-row {
    display: flex; flex-wrap: wrap; gap: 10px;
    margin-bottom: 18px;
  }
  .energy-badge {
    background: rgba(139,92,246,0.15);
    border: 1px solid rgba(139,92,246,0.3);
    border-radius: 10px;
    padding: 8px 14px;
    display: flex; align-items: center; gap: 8px;
  }
  .energy-num {
    width: 28px; height: 28px; border-radius: 14px;
    background: linear-gradient(135deg, #C8901A, #F5C542);
    color: #1A0A00; font-weight: 800; font-size: 12px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .energy-name {
    color: #C4B5FD; font-weight: 700; font-size: 13px;
  }
  .energy-arcana {
    color: rgba(255,255,255,0.5); font-size: 11px;
  }

  /* ── Footer ── */
  .doc-footer {
    text-align: center;
    padding: 32px 20px;
    color: rgba(255,255,255,0.4);
    font-size: 11px;
    border-top: 1px solid rgba(139,92,246,0.2);
    margin-top: 20px;
  }
  .doc-footer .brand {
    color: #C4B5FD; font-weight: 700;
  }
</style>
</head>
<body>

<!-- Title page -->
<div class="title-page">
  <div class="logo">\u2728</div>
  <h1>Матриця Долі</h1>
  <div class="subtitle">Персональний аналіз</div>
  <div class="person-name">${name}</div>
  <div class="birth-date">${birthDate}</div>
  <div class="divider"></div>
  <div class="app-name">Matrix of Destiny</div>
</div>

<!-- Sections -->
${sectionsHtml}

<!-- Footer -->
<div class="doc-footer">
  <span class="brand">Matrix of Destiny</span><br>
  ${new Date().toLocaleDateString('uk-UA')}
</div>

</body>
</html>`;
}
