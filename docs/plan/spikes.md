# Спайки S1–S6 и мастер настройки (W)

Спайк = короткая проверка риска. Код — в `spikes/<id>/`, в продукт не попадает. Результат — запись в `DECISIONS.md` + 5–10 строк в PROGRESS.
Все сетевые спайки — метка `needs-permission`, старт только после разрешения в чате. Только тестовый Google-аккаунт.
Скиллы: `/mattpocock-skills:prototype` (для S4 — `tdd`). Контрольная точка — облегчённая: без `thermo-nuclear`, только отчёт.

## W — Мастер Google Cloud + Cloudflare (Sonnet · low)
`/mattpocock-skills:wizard` → `scripts/setup-wizard.sh`, который ведёт пользователя по шагам:
1. Google Cloud: проект «ForgetAmnesia», OAuth consent screen (External, Testing, тестовые пользователи: тестовый + основной аккаунт),
   включить Drive API и Calendar API, OAuth Client «Web» ×2 (Dev: `http://localhost:5173`; Prod: домен Pages).
2. Cloudflare: подключить GitHub-репозиторий к Pages, build `pnpm build`, output `dist`, переменная `VITE_GOOGLE_CLIENT_ID`.
3. Записать Client ID в `.env` (не в git) и в переменные Pages.
Готово, когда: `.env.example` описан, пользователь подтвердил оба клиента.

## S1 — Google-вход + appDataFolder (Sonnet · middle)
Вопросы: (1) GIS token client в SPA выдаёт токен со scope `drive.appdata`? (2) `requestAccessToken({prompt:''})` обновляет токен без окна, если сессия Google жива — сколько раз за день всплывает окно? (3) create/update/list/delete в `appDataFolder`, `appProperties`, multipart upload 1 МБ. (4) Нужна ли верификация приложения Google для этого scope в режиме Testing/Production?
Готово, когда: ответы записаны в ADR-003 (дополнение), есть минимальный работающий пример.

## S2 — Drive Changes API (Sonnet · middle)
Вопросы: `changes.getStartPageToken` + `changes.list(spaces='appDataFolder')` видят изменения файлов другого «устройства» (второй браузерный профиль)? Задержка появления? Стоимость запросов по квоте.
Готово, когда: решение «Changes API или list по modifiedTime» записано в ADR-004 (дополнение).

## S3 — API курсов (Sonnet · low)
Кандидаты фиата: open.er-api.com, frankfurter (ECB — проверить наличие AMD), exchangerate.host. Крипта: CoinGecko simple/price.
Проверить: CORS из браузера, наличие AMD/RUB/USD, лимиты, исторические курсы на дату.
Готово, когда: ADR-006 дополнен выбранными источниками и запасным.

## S4 — Парсер русских фраз (Sonnet · middle)
Прогнать 60 фраз из `spec/capture.md` через chrono-node (ru). Если покрытие дат < 85% — свой разбор дат.
Готово, когда: таблица покрытия + решение в DECISIONS; фразы сохранены как будущая фикстура.

## S5 — Google Calendar (Sonnet · middle)
Проверить scope `calendar.app.created`: создание вторичного календаря, событие с `extendedProperties.private`, поиск по `privateExtendedProperty` (идемпотентность), reminders.overrides — приходят ли пуши на телефон.
Готово, когда: ADR-008 дополнен.

## S6 — Capacitor + уведомления (Opus · middle)
Собрать пустую Capacitor-оболочку текущей PWA, найти/оценить плагин NotificationListener (поддержка Capacitor 7+, активность репозитория) или набросать свой на Kotlin; прочитать реальное уведомление одного банка на телефоне пользователя.
Готово, когда: решение «готовый плагин / свой» в DECISIONS; пример текста уведомления каждого из 5 банков (обезличенный) — в `tests/fixtures/notifications/`.
