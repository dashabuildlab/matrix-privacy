-- ═══════════════════════════════════════════════════════════════════════
-- Matrix of Soul — Migration 001 — Initial Schema
-- Schema: app_matrixofsoul
-- Run this in: Supabase Dashboard → SQL Editor
-- After running: Dashboard → Settings → API → Exposed schemas
--   add "app_matrixofsoul" to the list
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Schema
CREATE SCHEMA IF NOT EXISTS app_matrixofsoul;

GRANT USAGE ON SCHEMA app_matrixofsoul TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA app_matrixofsoul
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA app_matrixofsoul
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════════════
-- 2. Static reference tables
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE app_matrixofsoul.moods (
  id         TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  emoji      TEXT NOT NULL,
  color      TEXT NOT NULL,
  sort_order INT  DEFAULT 0
);

CREATE TABLE app_matrixofsoul.goals (
  id         TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  emoji      TEXT NOT NULL,
  color      TEXT NOT NULL,
  sort_order INT  DEFAULT 0
);

CREATE TABLE app_matrixofsoul.meditations (
  id                   TEXT PRIMARY KEY,
  title                TEXT NOT NULL,
  subtitle             TEXT,
  guide                TEXT,
  duration_label       TEXT,
  duration_sec         INT,
  moods                TEXT[]       DEFAULT '{}',
  goals                TEXT[]       DEFAULT '{}',
  frequency            TEXT,
  description          TEXT,
  artwork_gradient     TEXT[]       DEFAULT '{}',
  artwork_emoji        TEXT,
  artwork_accent_color TEXT,
  is_premium           BOOLEAN      DEFAULT FALSE,
  active               BOOLEAN      DEFAULT TRUE,
  sort_order           INT          DEFAULT 0,
  created_at           TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE app_matrixofsoul.energies (
  id       INT  PRIMARY KEY CHECK (id BETWEEN 1 AND 22),
  name     TEXT NOT NULL,
  arcana   TEXT,
  planet   TEXT,
  keywords TEXT[] DEFAULT '{}',
  positive TEXT,
  negative TEXT,
  advice   TEXT
);

-- ═══════════════════════════════════════════════════════════════════════
-- 3. User data tables
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE app_matrixofsoul.user_profiles (
  id                   UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name                 TEXT,
  birth_date           TEXT,
  is_premium           BOOLEAN     DEFAULT FALSE,
  premium_plan         TEXT,
  xp                   INT         DEFAULT 0,
  level                INT         DEFAULT 1,
  streak               INT         DEFAULT 0,
  last_active_date     TEXT,
  tokens               INT         DEFAULT 10,
  referral_code        TEXT        UNIQUE,
  referred_by          TEXT,
  meditation_count     INT         DEFAULT 0,
  unlocked_achievement_ids TEXT[]  DEFAULT '{}',
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE app_matrixofsoul.chat_sessions (
  id         TEXT        PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT        DEFAULT 'AI Консультація',
  context    TEXT        DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE app_matrixofsoul.chat_messages (
  id         TEXT        PRIMARY KEY,
  session_id TEXT        NOT NULL REFERENCES app_matrixofsoul.chat_sessions(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL CHECK (role IN ('user','assistant')),
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE app_matrixofsoul.meditation_sessions (
  id             TEXT        PRIMARY KEY,
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meditation_id  TEXT        REFERENCES app_matrixofsoul.meditations(id),
  duration_sec   INT         DEFAULT 0,
  completed      BOOLEAN     DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE app_matrixofsoul.saved_matrices (
  id         TEXT        PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  birth_date TEXT        NOT NULL,
  group_name TEXT,
  matrix_data JSONB      NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════
-- 4. Row Level Security
-- ═══════════════════════════════════════════════════════════════════════

-- Static tables: public read
ALTER TABLE app_matrixofsoul.moods              ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_matrixofsoul.goals              ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_matrixofsoul.meditations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_matrixofsoul.energies           ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_moods"       ON app_matrixofsoul.moods       FOR SELECT USING (true);
CREATE POLICY "public_read_goals"       ON app_matrixofsoul.goals       FOR SELECT USING (true);
CREATE POLICY "public_read_meditations" ON app_matrixofsoul.meditations FOR SELECT USING (active = true);
CREATE POLICY "public_read_energies"    ON app_matrixofsoul.energies    FOR SELECT USING (true);
-- User tables: own rows only
ALTER TABLE app_matrixofsoul.user_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_matrixofsoul.chat_sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_matrixofsoul.chat_messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_matrixofsoul.meditation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_matrixofsoul.saved_matrices      ENABLE ROW LEVEL SECURITY;


CREATE POLICY "own_profile"    ON app_matrixofsoul.user_profiles       FOR ALL USING (auth.uid() = id);
CREATE POLICY "own_sessions"   ON app_matrixofsoul.chat_sessions       FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_messages"   ON app_matrixofsoul.chat_messages       FOR ALL USING (
  session_id IN (SELECT id FROM app_matrixofsoul.chat_sessions WHERE user_id = auth.uid())
);
CREATE POLICY "own_meditations"ON app_matrixofsoul.meditation_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_matrices"   ON app_matrixofsoul.saved_matrices      FOR ALL USING (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════════════════
-- 5. Indexes
-- ═══════════════════════════════════════════════════════════════════════

CREATE INDEX idx_med_active       ON app_matrixofsoul.meditations(active, sort_order);
CREATE INDEX idx_chat_sess_user   ON app_matrixofsoul.chat_sessions(user_id, created_at DESC);
CREATE INDEX idx_chat_msg_sess    ON app_matrixofsoul.chat_messages(session_id, created_at);
CREATE INDEX idx_med_sess_user    ON app_matrixofsoul.meditation_sessions(user_id, created_at DESC);
CREATE INDEX idx_matrices_user    ON app_matrixofsoul.saved_matrices(user_id, created_at DESC);


-- auto-update updated_at on user_profiles
CREATE OR REPLACE FUNCTION app_matrixofsoul.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON app_matrixofsoul.user_profiles
  FOR EACH ROW EXECUTE FUNCTION app_matrixofsoul.set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════
-- 6. Seed — Moods
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO app_matrixofsoul.moods (id, label, emoji, color, sort_order) VALUES
  ('anxiety', 'Тривога', '😰', '#6366F1', 1),
  ('stress',  'Стрес',   '😤', '#EF4444', 2),
  ('sadness', 'Смуток',  '😢', '#38BDF8', 3),
  ('fatigue', 'Втома',   '😴', '#64748B', 4),
  ('joy',     'Радість', '😊', '#F59E0B', 5),
  ('anger',   'Злість',  '😠', '#F97316', 6);

-- ═══════════════════════════════════════════════════════════════════════
-- 7. Seed — Goals
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO app_matrixofsoul.goals (id, label, emoji, color, sort_order) VALUES
  ('sleep',      'Сон',         '🌙', '#818CF8', 1),
  ('focus',      'Фокус',       '🎯', '#34D399', 2),
  ('energy',     'Енергія',     '⚡', '#FBBF24', 3),
  ('confidence', 'Впевненість', '💪', '#F472B6', 4),
  ('spiritual',  'Духовне',     '✨', '#A78BFA', 5),
  ('healing',    'Зцілення',    '💚', '#4ADE80', 6);

-- ═══════════════════════════════════════════════════════════════════════
-- 8. Seed — Meditations
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO app_matrixofsoul.meditations
  (id, title, subtitle, guide, duration_label, duration_sec, moods, goals,
   frequency, description, artwork_gradient, artwork_emoji, artwork_accent_color, is_premium, sort_order)
VALUES
('1','Ранкова Активація','Налаштуйте себе на продуктивний день','Майстер Еліра',
 '10 хв',600,ARRAY['joy','energy'],ARRAY['energy','focus'],'528 Гц',
 'Пробудіть свою внутрішню силу та встановіть позитивний намір на день.',
 ARRAY['#78350F','#D97706','#FDE68A'],'☀️','#FCD34D',false,1),

('2','Зцілення Серця','Відкрийте серцевий центр','Майстер Еліра',
 '15 хв',900,ARRAY['sadness','anxiety'],ARRAY['healing','spiritual'],'639 Гц',
 'Медитація для відкриття Анахата чакри — центру любові та гармонії.',
 ARRAY['#064E3B','#059669','#A7F3D0'],'💚','#34D399',true,2),

('3','Глибокий Сон','Підготовка до відновного сну','Голос Місяця',
 '20 хв',1200,ARRAY['fatigue','stress'],ARRAY['sleep'],'432 Гц',
 'Розслабте тіло та розум для глибокого, відновного сну.',
 ARRAY['#1E1B4B','#4338CA','#A5B4FC'],'🌙','#818CF8',true,3),

('4','Маніфестація Мрій','Притягніть бажане у своє життя','Провідник Зірок',
 '12 хв',720,ARRAY['joy','energy'],ARRAY['confidence','spiritual'],'963 Гц',
 'Потужна медитація для маніфестації, заснована на законі тяжіння.',
 ARRAY['#3B0764','#7C3AED','#DDD6FE'],'✨','#A78BFA',true,4),

('5','Захист Аури','Очищення та захист енергетичного поля','Стражник Світла',
 '8 хв',480,ARRAY['anxiety','stress'],ARRAY['healing','confidence'],'741 Гц',
 'Очистіть ауру від чужих енергій та встановіть захисний щит.',
 ARRAY['#1E3A5F','#2563EB','#BFDBFE'],'🛡️','#60A5FA',false,5),

('6','Заземлення','Стабілізація кореневої чакри','Дух Землі',
 '10 хв',600,ARRAY['anxiety','fatigue'],ARRAY['energy','confidence'],'396 Гц',
 'Зміцніть Муладхара чакру для відчуття стабільності та безпеки.',
 ARRAY['#14532D','#15803D','#BBF7D0'],'🌱','#4ADE80',false,6),

('7','Вдячність','Практика вдячності для серця','Майстер Еліра',
 '7 хв',420,ARRAY['sadness','joy'],ARRAY['healing','spiritual'],'528 Гц',
 'Наповніться вдячністю та притягніть більше благ у своє життя.',
 ARRAY['#831843','#BE185D','#FBCFE8'],'🙏','#F472B6',false,7),

('8','Ясність Розуму','Концентрація та фокус думок','Мудрець Долі',
 '5 хв',300,ARRAY['stress','fatigue'],ARRAY['focus','energy'],'285 Гц',
 'Очистіть розум від шуму думок та знайдіть кристальну ясність.',
 ARRAY['#0C4A6E','#0284C7','#BAE6FD'],'🔮','#38BDF8',false,8);

-- ═══════════════════════════════════════════════════════════════════════
-- 9. Seed — Energies (1–22)
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO app_matrixofsoul.energies (id, name, arcana, planet, keywords, positive, negative, advice) VALUES
(1,'Маг','The Magician','Меркурій',
 ARRAY['воля','майстерність','ініціатива'],
 'Лідерство, впевненість, здатність досягати цілей, ініціативність',
 'Маніпуляції, егоїзм, хитрість, нав''язування своєї волі',
 'Розвивайте свої таланти та використовуйте силу волі для досягнення цілей'),

(2,'Жриця','The High Priestess','Місяць',
 ARRAY['інтуїція','мудрість','таємниця'],
 'Глибока інтуїція, мудрість, чутливість, внутрішнє знання',
 'Замкненість, пасивність, емоційна нестабільність',
 'Довіряйте своїй інтуїції та розвивайте внутрішню мудрість'),

(3,'Імператриця','The Empress','Венера',
 ARRAY['творчість','достаток','краса'],
 'Творчість, материнство, достаток, гармонія, чуттєвість',
 'Лінь, залежність від комфорту, марнотратство',
 'Розкривайте свій творчий потенціал та створюйте красу навколо себе'),

(4,'Імператор','The Emperor','Марс',
 ARRAY['влада','структура','стабільність'],
 'Стабільність, відповідальність, організованість, захист',
 'Тиранія, жорсткість, контроль, впертість',
 'Будуйте структуру та порядок у житті, беріть відповідальність'),

(5,'Ієрофант','The Hierophant','Юпітер',
 ARRAY['вчитель','традиції','духовність'],
 'Мудрість, наставництво, духовний розвиток, знання',
 'Догматизм, моралізаторство, фанатизм',
 'Шукайте знання та діліться мудрістю з іншими'),

(6,'Закохані','The Lovers','Венера',
 ARRAY['любов','вибір','гармонія'],
 'Любов, гармонія у стосунках, правильний вибір, краса',
 'Нерішучість, залежність від партнера, ревнощі',
 'Приймайте рішення серцем, будуйте гармонійні стосунки'),

(7,'Колісниця','The Chariot','Марс',
 ARRAY['перемога','рух','амбіції'],
 'Перемога, рух вперед, сила волі, успіх',
 'Агресія, нетерпіння, конфліктність',
 'Рухайтесь до мети з рішучістю, контролюйте свої імпульси'),

(8,'Справедливість','Justice','Сатурн',
 ARRAY['баланс','карма','закон'],
 'Справедливість, баланс, чесність, кармічна рівновага',
 'Осудливість, надмірна критичність, холодність',
 'Дотримуйтесь балансу та будьте чесні з собою і іншими'),

(9,'Відлюдник','The Hermit','Нептун',
 ARRAY['самопізнання','мудрість','самотність'],
 'Глибоке самопізнання, мудрість, духовний пошук',
 'Ізоляція, відчуженість, депресія',
 'Знаходьте час для самопізнання та внутрішнього розвитку'),

(10,'Колесо Фортуни','Wheel of Fortune','Юпітер',
 ARRAY['доля','цикли','удача'],
 'Удача, нові можливості, позитивні зміни, розвиток',
 'Непостійність, залежність від обставин, фаталізм',
 'Приймайте зміни як частину життя та використовуйте можливості'),

(11,'Сила','Strength','Сонце',
 ARRAY['мужність','терпіння','внутрішня сила'],
 'Внутрішня сила, мужність, терпіння, стійкість',
 'Слабкість, страхи, невпевненість у собі',
 'Розвивайте внутрішню силу та мужність через терпіння'),

(12,'Повішений','The Hanged Man','Нептун',
 ARRAY['жертва','пауза','новий погляд'],
 'Нові перспективи, жертовність, духовне переродження',
 'Застій, жертовність без сенсу, пасивність',
 'Іноді потрібно зупинитися щоб побачити нові можливості'),

(13,'Смерть','Death','Плутон',
 ARRAY['трансформація','завершення','оновлення'],
 'Трансформація, оновлення, звільнення від старого',
 'Страх змін, руйнація, болісні закінчення',
 'Приймайте завершення як початок нового етапу'),

(14,'Помірність','Temperance','Сатурн',
 ARRAY['гармонія','терпіння','баланс'],
 'Гармонія, помірність, терпіння, баланс у всьому',
 'Надмірна стриманість, відсутність пристрасті',
 'Знаходьте золоту середину та будьте терплячі'),

(15,'Диявол','The Devil','Сатурн',
 ARRAY['спокуса','залежність','тінь'],
 'Пристрасть, харизма, матеріальний успіх, сила',
 'Залежності, маніпуляції, жадібність, спокуси',
 'Усвідомлюйте свої тіньові сторони та звільняйтесь від залежностей'),

(16,'Вежа','The Tower','Марс',
 ARRAY['руйнування','пробудження','звільнення'],
 'Раптове пробудження, звільнення, руйнування ілюзій',
 'Катастрофа, руйнування, шок, конфлікти',
 'Приймайте раптові зміни як можливість для зростання'),

(17,'Зірка','The Star','Уран',
 ARRAY['надія','натхнення','зцілення'],
 'Надія, натхнення, творчість, духовне зцілення',
 'Відірваність від реальності, наївність',
 'Тримайте надію та вірте у свою зірку, слідуйте мрії'),

(18,'Місяць','The Moon','Місяць',
 ARRAY['ілюзії','підсвідомість','тривога'],
 'Інтуїція, уява, глибоке підсвідоме знання',
 'Ілюзії, страхи, тривога, невизначеність',
 'Працюйте зі своїм підсвідомим та не піддавайтесь ілюзіям'),

(19,'Сонце','The Sun','Сонце',
 ARRAY['радість','успіх','життєва сила'],
 'Радість, успіх, оптимізм, життєва енергія, щастя',
 'Самовпевненість, поверховість, егоцентризм',
 'Сяйте як сонце — діліться радістю та енергією з іншими'),

(20,'Суд','Judgement','Плутон',
 ARRAY['відродження','призначення','заклик'],
 'Відродження, прийняття призначення, трансформація',
 'Самоосуд, невміння відпускати минуле',
 'Прислухайтесь до внутрішнього заклику та приймайте своє призначення'),

(21,'Світ','The World','Сатурн',
 ARRAY['завершення','цілісність','досягнення'],
 'Завершеність, досягнення мети, гармонія, цілісність',
 'Стагнація, страх завершення циклу',
 'Святкуйте свої досягнення та готуйтесь до нового циклу'),

(22,'Блазень','The Fool','Уран',
 ARRAY['свобода','початок','довіра'],
 'Свобода, нові початки, спонтанність, довіра до життя',
 'Безвідповідальність, легковажність, хаос',
 'Будьте відкриті до нового і довіряйте процесу життя');

-- ═══════════════════════════════════════════════════════════════════════
-- ═══════════════════════════════════════════════════════════════════════

