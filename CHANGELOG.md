# Changelog

## 2026-11-12 01:45
- Split `index.ts`, `database.ts`, and `locales.ts` into focused modules under 800 lines with typed command dispatch
- Cap in-memory stopped-channel and unread-hint maps to prevent unbounded growth in long-running shards
- Drop deprecated `@types/ioredis` and update lockfile dependencies for zero `npm audit` vulnerabilities

## 2026-11-03 17:15
- Update package author and license header to zeN

## 2026-10-21 15:47
- Ignore OwO bot messages and common third-party bot prefixes in auto-translate channels
- Support all country flag reactions, shortcodes, and regional indicator pairs for manual translation

## 2026-10-06 11:24
- Add local language pre-detection and in-flight request deduplication before calling the translation API
- Remove emojis from interactive select placeholders and button labels

## 2026-09-18 10:38
- Add `user_muted_channels` table migration and channel unmute controls
- Store `setup_status = pending` during onboarding so users do not get duplicate setup DMs

## 2026-09-02 14:52
- Keep live threads unlocked so interactive menus still work while auto-deleting stray user replies
- Skip pure stickers, media links, and attachment-only messages
- Hide `Load More` button once backlog is caught up

## 2026-08-13 16:19
- Route unified private translation threads through Redis with webhook author display
- Add `Load More` pagination for older channel messages and extend buffer retention to 7 days

## 2026-07-24 13:40
- Translate buffered messages on demand when switching active channel focus
- Add per-channel permission checks before buffering messages

## 2026-07-06 11:50
- Bundle static UI strings for `en`, `de`, `fr`, `es`, `it`, `ru`, and `uk` so menus use zero translation quota
- Add debounced message batching and one-click channel muting in live threads

## 2026-06-16 15:11
- Sync onboarding step labels dynamically with the user's chosen language
- Prevent duplicate live threads from spawning per user

## 2026-05-28 10:05
- Initial Discord.js translation bot with `/setup`, `/livethread`, `/settings`, and translation cache
