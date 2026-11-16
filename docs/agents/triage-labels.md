# Triage Labels

Навыки говорят о пяти канонических ролях триажа. Таблица сопоставляет роли с реальными метками трекера.
Метки создаются в GitHub лениво — при первом использовании навыком `triage`.

| Label in mattpocock/skills | Label in our tracker | Смысл |
| -------------------------- | -------------------- | ----- |
| `needs-triage`             | `needs-triage`       | Нужно оценить тикет |
| `needs-info`               | `needs-info`         | Ждём уточнений от автора |
| `ready-for-agent`          | `ready-for-agent`    | Полностью описан, можно отдавать агенту |
| `ready-for-human`          | `ready-for-human`    | Требует действий человека |
| `wontfix`                  | `wontfix`            | Делать не будем |

Метки этапов и `spike` / `needs-permission` / `provisional` — отдельный словарь, см. `docs/agents/issue-tracker.md`.
`needs-permission` всегда сочетается с `ready-for-human` до разрешения пользователя, не с `ready-for-agent`.
