---
title: "dc-translation Living Brain Index"
tags: [living-brain, moc, discord-bot, architecture]
---
# 000 — dc-translation Living Brain Index

> Multilingual Discord translation bot (`Discord.js` v14, TypeScript, encrypted SQLite L1 + MongoDB Atlas L2, Redis L1 cache, Google Translate + DeepL).
> Companion topology dossier: [[CAPRI-ARCHITECTURE]].

## 1. Module Map

| Subsystem | Files | Responsibility |
| :--- | :--- | :--- |
| Entrypoint & Health | `src/index.ts` | Discord client bootstrap, interaction dispatch, HTTP `/health` probe, graceful batch flush |
| Command Registry | `src/commands/registry.ts`, `src/commands/*.ts` | Strictly typed slash and context-menu commands (`/setup`, `/livethread`, `/settings`, `/serversettings`, `/translate`) |
| Interaction Routers | `src/events/selectAndModalHandlers.ts`, `src/events/setupAndSettingsButtons.ts`, `src/events/liveThreadAndTranslateButtons.ts` | Onboarding wizard steps, language search modal, server guardrails, live-thread focus/mute/pagination buttons, DeepL upgrades |
| Message & Flag Stream | `src/events/messageAndReactionHandlers.ts`, `src/services/channelCatchup.ts`, `src/services/messageBatcher.ts` | Live channel message buffering, flag-emoji reaction translation, unread activity hints, bounded per-user stop state |
| Encrypted Storage | `src/db/database.ts`, `src/db/dbCore.ts`, `src/db/userAndThreadRepo.ts`, `src/db/guildAndMessageRepo.ts`, `src/db/dbTypes.ts` | AES-256-GCM field/user/channel encryption over WAL SQLite and MongoDB Atlas |
| Translation & Localization | `src/services/translator.ts`, `src/services/uiTranslator.ts`, `src/services/cache.ts`, `src/utils/locales.ts`, `src/utils/localesSetup.ts`, `src/utils/localesSettingsAndHelp.ts` | Multi-engine translation with singleflight dedup, Redis/MongoDB caching, and 7 pre-bundled UI locales |

## 2. Symptom -> Exact File Lookup Table

| Symptom / Task | Exact File |
| :--- | :--- |
| Slash command or context-menu dispatch fails or skips setup prompt | `src/commands/registry.ts` |
| Onboarding wizard button, step transition, or quick-start issue | `src/events/setupAndSettingsButtons.ts`, `src/commands/setup.ts` |
| Language search modal or select dropdown does not update embed | `src/events/selectAndModalHandlers.ts` |
| Live thread mute, unmute, `Load More`, or public share button bug | `src/events/liveThreadAndTranslateButtons.ts` |
| Unread activity banner or focus catch-up batching out of sync | `src/services/channelCatchup.ts` |
| Flag emoji reaction or auto-DM / auto-thread stream issue | `src/events/messageAndReactionHandlers.ts`, `src/utils/flags.ts` |
| SQLite / MongoDB startup sync or index migration failure | `src/db/dbCore.ts` |
| User preference or live-thread persistence issue | `src/db/userAndThreadRepo.ts` |
| Guild permission scope, muted channel, or buffered message query bug | `src/db/guildAndMessageRepo.ts` |
| AES-256-GCM ciphertext or per-user/per-channel key derivation issue | `src/utils/crypto.ts` |
| Pre-bundled UI copy (`en`, `de`, `es`, `fr`, `it`, `ru`, `uk`) edit | `src/utils/localesSetup.ts`, `src/utils/localesSettingsAndHelp.ts` |

## 3. Verification Commands

- Typecheck: `npm run typecheck`
- Build: `npm run build`
- Full security, crypto, DB, locale & flag suite: `npm test`
