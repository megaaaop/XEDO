# XEDO project continuity

The user requires a shared Markdown work log for this project.

- Read `docs/XEDO_WORK_LOG.md` and `docs/implementation-queue.json` before each project work turn.
- Update `docs/XEDO_WORK_LOG.md` before the final reply **on every project work turn**, including planning, requirements, investigation and documentation-only turns. Preserve the three main parts **หัวข้อ / สรุป / รายละเอียด** and append/update the per-turn record under details.
- Record what changed and why, source paths, actual checks and evidence, unresolved work and publication status. Explicitly say when code was not changed or tests were not rerun.
- Keep the queue consistent when requirements/status change. Mark unanswered user decisions **รอคำตอบ** in following replies until resolved.
- Re-read the latest log before writing when other chats may edit it; preserve their entries. Do not create competing status logs or overwrite current state using an old audit.
- Preserve the three-step planner and all four calculators. Apply the user's latest confirmed prototype/Inspector requirements from the log within the task actually requested.
- Verify Git state and exact release identity before claiming something is published. Follow current user authorization for push/deploy; historical release permission is scoped to that release.
- Do not put credentials, environment contents, tokens or private keys in the work log.
- Keep `docs/WEBSITE_DETAILS.md` alongside the work log: record current architecture, behavior, dependencies, repair plan and maintenance details there. For implementation/investigation requests like the 2026-10-27 request, update both documents before the final reply; keep release evidence and chronology in the work log rather than creating competing logs.
