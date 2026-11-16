# Issue tracker: GitHub

Тикеты и спецификации задач живут в GitHub Issues репозитория `byterID/forgetamnesia`. Все операции — через `gh` CLI.
Язык тикетов — английский (ADR-018).

## Команды

- **Создать**: `gh issue create --title "..." --body "..." --label "<этап>"`. Многострочное тело — через heredoc или `--body-file`.
- **Прочитать**: `gh issue view <number> --comments` (вместе с метками).
- **Список**: `gh issue list --state open --label "<этап>" --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`.
- **Комментарий**: `gh issue comment <number> --body "..."`
- **Метки**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Закрыть**: `gh issue close <number> --comment "..."`

Репозиторий `gh` определяет сам по `git remote` внутри клона.

## Метки проекта

| Метка | Смысл |
|---|---|
| `W` | Мастер Google Cloud + Cloudflare |
| `S1`…`S6` | Спайки (см. `docs/plan/spikes.md`) |
| `M0`…`M10` | Этапы (см. `docs/PLAN.md`) |
| `spike` | Выбрасываемый код в `spikes/<id>/`, результат — запись в `docs/DECISIONS.md` |
| `needs-permission` | Ходит в сеть / на реальный аккаунт. Старт только после разрешения пользователя в чате на конкретный тикет |
| `provisional` | Содержит решение агента, ждущее подтверждения пользователя |

Каждый тикет несёт ровно одну метку этапа. Тикет самодостаточен: цель, файлы, критерии приёмки, ссылка на раздел `docs/spec/*` или `docs/plan/*`.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Один пользователь, внешних PR нет; `/triage` читает этот флаг.)_

## When a skill says "publish to the issue tracker"

Создать GitHub issue.

## When a skill says "fetch the relevant ticket"

`gh issue view <number> --comments`.

## Wayfinding operations

Используется `/wayfinder`. **Карта** — один issue, **дочерние** issue — тикеты.

- **Карта**: issue с меткой `wayfinder:map` (Notes / Decisions-so-far / Fog). `gh issue create --label wayfinder:map`.
- **Дочерний тикет**: sub-issue карты (`gh api`, endpoint sub-issues). Если sub-issues недоступны — task list в теле карты и строка `Part of #<map>` в начале тикета. Метки `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`).
- **Блокировки**: нативные зависимости GitHub: `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, где `<blocker-db-id>` — числовой **database id** (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`), не `#number`. Запасной вариант — строка `Blocked by: #<n>, #<n>` в начале тела. Тикет разблокирован, когда все блокеры закрыты.
- **Фронтир**: открытые дочерние тикеты без открытых блокеров и без исполнителя; первый по порядку карты.
- **Взять**: `gh issue edit <n> --add-assignee @me`.
- **Закрыть**: `gh issue comment <n> --body "<answer>"`, затем `gh issue close <n>`, затем ссылка на контекст в Decisions-so-far карты.
