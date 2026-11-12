---
project: "dc-translation"
version: "1.0.0"
files: 41
loc: 10804
tags: [capri-docu, architecture]
---
# dc-translation // CAPRI Architecture & AI Context Dossier
> **Executive Summary:** High-performance multilingual Discord translation bot with private live threads, AES-256-GCM field encryption, and multi-tier caching.
>
> *Generated automatically via `npx capri docu` (Zero build or browser runtime overhead)*

## 1. Project Identity & Stack Overview
- **Repository:** `dc-translation` (`dc-translation`)
- **Version:** `1.0.0`
- **Detected Stack:** Discord.js · TypeScript · Docker Containerized
- **Top-Level Subsystems:** `/assets`, `/certs`, `/scripts`, `/src`
- **Container Readiness:** `docker-compose.yml` present

## 2. Codebase Metrics & Language Breakdown
- **Total Source Files Scanned:** 41
- **Total Lines of Code (LOC):** 10,804
- **File Extensions:** `.ts` (41)
- **Key Domain Symbols / Classes / Functions (45):** `data`, `BroadcastStats`, `runServerSetupBroadcast`, `buildBroadcastProgressEmbed`, `execute`, `autocomplete`, `ensureLiveThread`, `buildLiveThreadControlComponents`, `updateLiveThreadControlMessage`, `syncUserLiveThreadLanguage`, `RegisteredCommand`, `commands`, `handleCommandInteraction`, `handleAutocompleteInteraction`, `buildServerSettingsEmbed`, `buildServerSettingsComponents`, `buildSettingsEmbed`, `buildSettingsComponents`, `buildStep1`, `buildStep2`, `buildStep3`, `buildCompletion`, `buildFirstUseIntercept`, `buildClientDetectedPrompt`, `buildTranslationComponents`, `dbService`, `userCache`, `guildCache`, `mutedChannelsCache`, `threadFocusCache`, `userChannelReadsCache`, `uiBundleMemoryCache`

## 4. Architecture & Subsystem Topology (`flowchart TD`)
```mermaid
flowchart TD
  Repo["dc-translation v1.0.0"]
  Stack["Stack: Discord.js · TypeScript · Docker Containerized"]
  Repo --> Stack
  N0_assets["/assets"]
  Stack --> N0_assets
  N1_certs["/certs"]
  Stack --> N1_certs
  N2_scripts["/scripts"]
  Stack --> N2_scripts
  N3_src["/src"]
  Stack --> N3_src
  Docker["Docker / Compose Runtime"]
  Repo -.->|"Containerized"| Docker
```

## 5. Key Domain Modules & Entrypoints Inventory
| Module Path | Lines | Extension |
| :--- | ---: | :--- |
| `src/events/liveThreadAndTranslateButtons.ts` | 712 | `.ts` |
| `src/utils/localesSetup.ts` | 687 | `.ts` |
| `src/utils/localesSettingsAndHelp.ts` | 683 | `.ts` |
| `src/db/guildAndMessageRepo.ts` | 679 | `.ts` |
| `src/commands/liveThread.ts` | 610 | `.ts` |
| `src/services/uiTranslator.ts` | 527 | `.ts` |
| `src/db/dbCore.ts` | 509 | `.ts` |
| `src/commands/setup.ts` | 507 | `.ts` |
| `src/utils/flags.ts` | 472 | `.ts` |
| `src/db/userAndThreadRepo.ts` | 430 | `.ts` |
| `src/events/setupAndSettingsButtons.ts` | 422 | `.ts` |
| `src/events/messageAndReactionHandlers.ts` | 387 | `.ts` |

## 7. Available Build & Automation Scripts
- `npm run dev`: `tsx watch src/index.ts`
- `npm run deploy`: `tsx src/deploy-commands.ts`
- `npm run build`: `tsc`
- `npm run typecheck`: `tsc --noEmit`
- `npm run test`: `tsx scripts/verify-all.ts`
- `npm run start`: `node dist/index.js`

## 8. Capri AI Agent Protocol (Claude / Codex / Gemini / Antigravity)
- **Subroutine `orion` (`CAPRI // UNLEASHED`):** Use `@zen-ui-capri/system` primitives and `<ZenIcon>` (48 vector glyphs) for UI views; keep action labels concise (`1-3 words`).
- **Subroutine `architect` (`SCS // ARCHITECT`):** Enforce strict typing (zero `any`, `readonly T[]`), modular files (`<= 800` lines), and `--zen-*` CSS tokens.
- **Subroutine `guard` (`CYBERPSYCHOSIS // GUARD`):** Sanitize untrusted inputs (`capri.sanitizeForPrompt()`), prevent XSS/secret leaks, bind dropdowns to `onMouseDown`, and ensure zero horizontal overflow (`320px` to `4K`).
- **Subroutine `zen` (`THEME // MATRIX`):** Maintain 4 Dark + 4 Light themes (`>= 4.5:1` AA contrast) and 60fps `--zen-ease-spring` tactile motion.
- **Subroutine `docu` (`CAPRI // AUTO-DOCU`):** Run `npx capri docu --write` whenever architectural boundaries or modules change.
