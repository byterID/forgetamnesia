# MODELS — модель и effort по этапам

Effort: **low · middle · high · extra** (в Claude Code: `low` · `medium` · `high` · `xhigh`).
Переключение в VS Code: `/model` → модель и effort. Делать **после** `/clear`, перед «продолжай по PROGRESS.md».

| Этап | Модель | Effort | Почему |
|---|---|---|---|
| Kickoff (setup-skills, domain-modeling, пересказ, to-tickets) | Fable | high | Ошибка в модели предметной области размножится на все этапы |
| Мастер Google Cloud / Cloudflare (`wizard`) | Sonnet | low | Генерация скрипта-инструкции |
| S1 Google auth + appDataFolder | Sonnet | middle | Спайк, выбрасываемый код |
| S2 Drive Changes API | Sonnet | middle | Спайк |
| S3 API курсов | Sonnet | low | Проверка эндпоинтов |
| M0 Каркас | Sonnet | middle | Рутина, но CI/бюджеты должны быть точными |
| M1 Доменное ядро | Fable | high | Денежная математика, обмен, курсы |
| M2 Синхронизация | Fable | **extra** | Риск потери данных |
| M3 MVP-1 UI | Opus | middle | Экраны и формы |
| M4 Импорт | Sonnet | high | Много краевых случаев |
| M5 Прогноз, цели, советы | Fable | high | Формулы, плановые операции |
| S4 Парсер фраз | Sonnet | middle | Спайк |
| S5 Google Calendar | Sonnet | middle | Спайк |
| M6 Календарь, задачи, быстрая запись | Opus | high | RRULE, парсер, связи |
| M7 Расширенные финансы | Fable | high | Инвестиции, долги, кредитка |
| S6 Capacitor + уведомления | Opus | middle | Нативные плагины |
| M8 Android | Opus | high | Нативный код, разрешения |
| M9 Полировка (кроме шифрования) | Sonnet | middle | |
| M9 Шифрование | Fable | high | Криптография |
| M10 Десктоп | Opus | middle | Раскладка, таблица, хоткеи |

## Ревью в контрольной точке
`code-review` и `thermo-nuclear-code-quality-review` — в той же сессии, что и этап, если модель этапа Fable/Opus.
Если этап делала Sonnet — перед ревью переключись на **Fable · high** (без `/clear`, контекст нужен ревьюеру).

## Мелочи
`handoff`, обновление PROGRESS, правки опечаток, переименования — **Haiku · low**.
Баг, который не поддался за 2 попытки → `diagnosing-bugs` на **Fable · high**.

## Правило повышения
Если этап на Sonnet/Opus дважды завалил ревью по одной причине — повтори проблемный тикет на Fable · high.
