# Final production refinement — roadmap

- [x] Shared RPAHUB workspace (Electron main process, network path, locking, revisions)
- [x] Immediate writes + 60s background sync + manual Sync button + status
- [x] Remove Local/Shared workspace choice (single production workspace)
- [x] Remove Production Library module
- [x] Remove Messages module
- [x] No demo/sample data on fresh workspace
- [x] Erase All Data (admin code ADMIN) replaces Reset to Sample Data
- [x] Tasks: model, Assign Task on Home, My Work integration
- [x] My Work personalised (projects, tasks, automations, approvals, due work)
- [x] Weekly updates optional (no compliance penalties) + per-user unread bold
- [x] Delete record confirmation, delete user (soft delete, history preserved)
- [x] Record Last edited by / created by, stale-edit conflict detection
- [x] PDF/Print through Electron IPC + print CSS
- [x] Subtle page transitions

## Targeted refinements (final pass)
- Async shared-workspace worker, circuit breaker, incremental revision sync — done
- Weekly updates: searchable automation picker, one shared source, full fields in records — done
- Approvals: linked + unlinked tracking, stage/type dropdowns, computed days waiting — done
- Lifecycle-driven pipeline reporting — done
- "Other / enter manually" on dropdown fields — done
- Single hidden built-in System Admin, first-run setup removed — done
- Admin-only Form Editor (labels, order, section, visibility, required) — done
