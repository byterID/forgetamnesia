# CLAUDE.md — ForgetAmnesia

PWA: календарь/задачи + финансовый ассистент. Один пользователь, много устройств, без бэкенда,
данные локально (Dexie/IndexedDB) + синхронизация через Google Drive `appDataFolder`.

## Старт каждой сессии (строго в этом порядке, больше ничего не читать заранее)
1. `docs/PROGRESS.md` → раздел «Текущее состояние».
2. Тикет текущей задачи (GitHub Issue) — он ссылается на нужный раздел спецификации.
3. `docs/plan/<этап>.md` текущего этапа.
4. Только те разделы `docs/spec/*.md` и `docs/CONTEXT.md`, на которые ссылается тикет.

Если у текущего этапа ещё нет тикетов — первым делом `/mattpocock-skills:to-tickets` по
«Тикетам-кандидатам» из `docs/plan/<этап>.md` (спайки — из `docs/plan/spikes.md`), затем работа.

## Экономия контекста
- Не перечитывай файл, который уже есть в контексте этой сессии.
- Ищи через grep/glob и читай фрагменты (offset/limit), а не файлы целиком.
- Широкий поиск по коду (>5 файлов) — субагент `Explore`, в основной контекст только вывод.
- Не читай: `node_modules/`, `dist/`, `coverage/`, lock-файлы, `private/`, `docs/progress/archive.md`.
- Длинный этап → `/compact` между тикетами. Между этапами — `/clear` (см. «Контрольная точка»).

## Когда спрашивать пользователя (и только тогда)
1. Отступление от ADR в `docs/DECISIONS.md`.
2. Необратимое действие: удаление/миграция данных пользователя, смена формата файлов синхронизации.
3. Любое действие на реальном аккаунте (основной Google Drive/Calendar, публикация, деплой в прод-домен).
4. Сетевой спайк с меткой `needs-permission` — разрешение в чате на конкретный спайк.

Всё остальное — решай сам, запиши в `docs/DECISIONS.md` со статусом `provisional`
и вынеси в отчёт этапа одним списком. Не задавай вопросы по одному посреди работы.

## Правила, которые важнее скорости
- Сначала падающий тест, потом код (`/mattpocock-skills:tdd`). Всегда для `src/domain` и `src/sync`.
- Деньги — только целые минимальные единицы (`number`, проверка `Number.isSafeInteger`); деление/курсы — через `decimal.js`. Никаких float-сумм.
- Разработка и тесты синхронизации — только на тестовом Google-аккаунте. Основной аккаунт — после ревью M2 и с разрешения.
- Запись только в календарь «ForgetAmnesia», никогда в чужие календари пользователя.
- Файлы `private/*.xlsx` не коммитить; в тестах — обезличенные фикстуры `tests/fixtures/`.
- Бюджет производительности (`docs/spec/nfr.md`) — критерий приёмки, а не пожелание.
- Застрял на баге → `/mattpocock-skills:diagnosing-bugs`, а не перебор вариантов.
- Навыки с `disable-model-invocation` (`to-tickets`, `handoff`, `implement`, `thermo-nuclear-code-quality-review`, `setup-matt-pocock-skills`) агент через Skill не запускает:
  он читает их `SKILL.md` в `~/.claude/plugins/synced/**/skills/` и выполняет шаги вручную.
- TDD обязателен для логики; для спайков (выбрасываемый код) и bash-мастера W достаточно проверки результата. Первый тест M0 — smoke.
- Контрольная точка спайков и мастера W — облегчённая (`docs/plan/spikes.md`): без code-review и thermo-nuclear, только отчёт.

## Стек
React 19 + TypeScript (strict) + Vite + vite-plugin-pwa · Dexie + dexie-react-hooks · Zustand ·
Tailwind + shadcn/ui · Recharts (lazy) · decimal.js · date-fns · rrule · uuid (v7) ·
Vitest + Testing Library + fake-indexeddb · Playwright · Capacitor (только с M8).
Пакетный менеджер — pnpm.

## Структура
```
src/domain/   чистый TS, без React/Dexie/сети — деньги, счета, операции, прогноз
src/db/       схема Dexie, репозитории, миграции
src/sync/     журнал операций, HLC, Drive-адаптер, слияние, снимки
src/services/ курсы, Google auth, Calendar-выгрузка, парсер фраз
src/features/ экраны по фичам (finance, goals, calendar, capture, settings)
src/ui/       общие компоненты shadcn
tests/        фикстуры, e2e (Playwright)
```

## Язык
Документы и отчёты — русский. Код, имена, коммиты, тикеты, PR — английский.
Термины — строго по глоссарию `docs/CONTEXT.md`.

## Agent skills

### Issue tracker
GitHub Issues репозитория `byterID/forgetamnesia` через `gh`; метки этапов `W`, `S1`…`S6`, `M0`…`M10` + `spike`, `needs-permission`, `provisional`. See `docs/agents/issue-tracker.md`.

### Triage labels
Пять ролей триажа с именами по умолчанию (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs
Single-context, нестандартные пути: глоссарий — `docs/CONTEXT.md`, все ADR одним файлом — `docs/DECISIONS.md` (папки `docs/adr/` нет). See `docs/agents/domain.md`.

## Git
Ветка на этап: `<этап>-<slug>` (напр. `m1-domain-core`). Conventional commits. PR в `main`, CI зелёный.

## Контрольная точка (конец КАЖДОГО этапа, без исключений)
1. `/mattpocock-skills:code-review` против `main`.
2. `/thermo-nuclear-code-quality-review`.
3. Исправить найденное (или завести тикеты с объяснением).
4. Отчёт пользователю: что работает · как проверить (шаги) · что отложено · `provisional`-решения на подтверждение.
5. Обновить `docs/PROGRESS.md`: «Текущее состояние» переписать (≤40 строк), прошлое — одной строкой в «Журнал»,
   подробности — в `docs/progress/archive.md`. Коммит.
6. `/mattpocock-skills:handoff`.
7. Последним сообщением написать дословно, подставив значения из `docs/MODELS.md`:
   > ✅ Этап <X> закрыт. Сделай `/clear`, переключи модель на **<модель>**, effort **<effort>**,
   > и напиши: «продолжай по PROGRESS.md».
