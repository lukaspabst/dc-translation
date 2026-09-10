# 🌐 Discord Translation Bot (`dc-translation`)

> High-performance, quota-preserving multilingual translation bot for Discord servers, powered by official **Google Cloud Translation API** (500k free characters/month), **DeepL**, and native Discord UI components.

---

## ✨ Why This Bot is Built Differently (User Experience First)

Most Discord translation bots are clunky: they clutter channels with unwanted replies, force users to memorize obscure language codes, or burn through expensive API quotas in days. 

This bot completely re-engineers translation for active Discord communities:

| Traditional Bot Friction | How This Bot Solves It |
| :--- | :--- |
| **Public Chat Spam:** Reacting with a flag drops a permanent embed in the channel for everyone. | **100% Private Context Menu App:** Right-click any message $\rightarrow$ **Apps $\rightarrow$ Translate** produces an ephemeral card visible *only* to you. |
| **Channel Clutter on Flags:** Reactions clutter the feed. | **1-Click 🗑️ Dismiss Button** on every translation embed, plus a user preference to receive translations via **Direct Message (DM)**. |
| **Manual Friction & Blind Typing:** Typing `/setlanguage de` without hints or autocomplete. | **Smart Discord Autocomplete:** Type `/setlanguage` or `/translate to:` and see instant suggestions (`🇩🇪 German (de)`). |
| **Rigid Settings:** Running 3 separate commands to change settings. | **Interactive `/settings` Dashboard:** Configure your language, auto-delete timing, delivery mode, and engine directly with Discord Select Menus and buttons. |
| **In-Card Language Switching:** If you want a different language, you had to re-run commands. | **Live Dropdown:** Switch target languages on the fly directly inside the translation card. |
| **Cost & Quotas:** Free DeepL quotas burn out in weeks on a 200-member server. | **Google Cloud Workhorse + On-Demand DeepL:** Unlimited free translations by default, with an on-demand `✨ Enhance with DeepL` button that preserves character quotas. |

---

## 🚀 How to Use

### 1. The Recommended Way: Instant Private Translation
1. **Right-click** any message (or tap & hold on mobile).
2. Select **Apps** $\rightarrow$ **Translate**.
3. *Done!* You receive a private ephemeral response with:
   - Your translation in your preferred language.
   - An interactive dropdown to **switch to any other language on the fly**.
   - A `✨ Enhance with DeepL` button.
   - A `📢 Share to Channel` button (if you want everyone to see it).
   - A `🗑️ Dismiss` button to remove the card when you are done.

### 2. Country Flag Reactions
- Simply react to any message with a country flag (e.g. 🇩🇪, 🇬🇧, 🇫🇷, 🇪🇸, 🇯🇵, 🇮🇹, 🇺🇦).
- The bot translates the message into that language.
- Includes a **🗑️ Dismiss** button for 1-click cleanup.
- *Tip:* Switch your delivery mode to **DM** in `/settings` if you never want flag translations to post in public channels!

### 3. 🧵 Private Real-Time Live Thread (`/livethread`)
Want continuous, hands-free translations in a channel without getting DMs or cluttering the chat for others?
- Run `/livethread start [language:optional]` in any channel (e.g. `#general`).
- The bot creates a **Discord Private Thread** (`🌐 zeN's Translations`) visible **ONLY to you and the bot**.
- On desktop, this thread docks on the right side of your screen as a **split-view panel**.
- As members chat in other languages on the left, the bot automatically translates and streams their messages into your private thread on the right in real time!
- Run `/livethread stop` anytime to archive and close the thread.

### 4. Direct Translation Command
Translate arbitrary text or draft a message in another language before sending:
```
/translate text:"Guten Morgen zusammen!" to:English
```
- Supports real-time autocomplete across 135+ languages.
- Optional `share: True` parameter to post the result publicly.

### 5. Interactive Control Panel (`/settings`)
Run `/settings` to open your interactive preferences panel:
- **Target Language:** Select from the top 25 languages.
- **Show Original Text:** Toggle whether the original message is quoted in the translation embed.
- **Flag Auto-Delete:** Choose auto-delete timing (`Permanent`, `1m`, `3m`, `5m`, `15m`, `60m`).
- **Delivery Mode:** Switch between `Channel Reply` and `Direct Message (DM)`.
- **Default Engine:** Switch between `Google Cloud` and `DeepL`.

---

## 🛠️ Setup & Installation Guide

### 1. Prerequisites
- **Node.js 20+** or **Docker**
- A **Discord Application & Bot Token** from the [Discord Developer Portal](https://discord.com/developers/applications)
- *(Optional but Recommended)* **Google Cloud Translation API Key** (500,000 characters free every month)
- *(Optional)* **DeepL API Key** (for on-demand enhancement)

---

### 2. Discord Developer Portal Configuration

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications) and create or select your application.
2. Under **Bot** $\rightarrow$ **Privileged Gateway Intents**, enable:
   - ✅ **Message Content Intent** (Required to read message text for translation)
   - ✅ **Server Members Intent**
3. Under **OAuth2** $\rightarrow$ **URL Generator**, select:
   - **Scopes:** `bot`, `applications.commands`
   - **Bot Permissions:**
     - `Send Messages`
     - `Read Message History`
     - `Embed Links`
     - `Add Reactions`
     - `Manage Messages` (Optional: allows the bot to remove user reaction flags to keep messages clean)
4. Copy the generated URL and invite the bot to your server.

---

### 3. Environment Variables (`.env`)

Create a `.env` file in the project root based on `.env.example`:

```env
# Discord Credentials
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_application_client_id_here

# Google Cloud Translation API (500,000 free chars/month)
GOOGLE_TRANSLATE_API_KEY=AIzaSy...
GCP_PROJECT_ID=your_gcp_project_id

# DeepL API Key (Optional, for on-demand enhancement button)
DEEPL_AUTH_KEY=your_deepl_api_key_here
```

---

### 4. Deploy Commands & Run

#### Local Development:
```bash
# Install dependencies
npm install

# Deploy slash commands and context menu apps to Discord
npm run deploy

# Build TypeScript
npm run build

# Start bot
npm start
```

#### Docker Deployment:
```bash
docker compose up -d --build
```

---

## 🏗️ Technical Architecture & Optimizations

- **Single-Request Pipeline:** Eliminated the legacy 6-call scraping bottleneck. Static UI strings are served instantly via [`src/utils/locales.ts`](file:///c:/Users/Lukas/IdeaProjects/dc-translation/src/utils/locales.ts).
- **In-Memory LRU Cache:** [`src/services/cache.ts`](file:///c:/Users/Lukas/IdeaProjects/dc-translation/src/services/cache.ts) stores `hash(text + lang + engine)` to serve duplicate reactions and common phrases in 0ms with zero API usage.
- **Graceful Quota Handling:** If DeepL or GCP quotas are reached, the bot intercepts errors and falls back seamlessly without crashing.
- **Type-Safe SQLite Persistence:** Stored locally in `data.db` using `better-sqlite3` with WAL journal mode.

---

## 📜 Commands Reference

| Command | Type | Description |
| :--- | :--- | :--- |
| `/setup` | Slash Command | 3-step interactive onboarding wizard (Language, Delivery, Preferences) |
| `/server-settings` | Slash Command | **Staff Only:** Server anti-flood guardrails (lock threads, disable public spam) |
| `Translate` | Message Context Menu | 100% private ephemeral translation with live language picker & auto-detected client language |
| `Translate (Permanent)` | Message Context Menu | Public channel translation (Staff only by default to prevent chat spam) |
| `/settings` | Slash Command | Interactive personal control panel (Select menus & toggles) |
| `/livethread` | Slash Command | Manage private split-screen translation threads (Subject to staff policy) |
| `/translate` | Slash Command | Quick text translation across 135+ languages with autocomplete |
| `/setlanguage` | Slash Command | Quick language update with 135+ language autocomplete |
| `/setoriginal` | Slash Command | Toggle original text visibility |
| `/setduration` | Slash Command | Set auto-delete minutes for flag reactions |
| `/help` | Slash Command | Interactive user guide and feature summary |

---

## 🛡️ Anti-Flood & Moderation Guardrails (`/server-settings`)

To prevent any member from flooding public channels with unwanted threads or chat clutter, server administrators (members with `Manage Server` or `Administrator` permissions) can configure server-wide guardrails using `/server-settings`:

1. **Live Translation Threads (`allow_live_threads`):**
   - `🛡️ Admins Only (Safe Default)`: Regular members cannot create live threads.
   - `🚫 Disabled`: Completely disables live threads server-wide.
   - `👥 Everyone`: Open to all members.
2. **Public Channel Translations (`allow_public_translations`):**
   - `🛡️ Admins Only (Safe Default)`: Prevents regular users from posting permanent translations or using `Share to Channel` to clutter the main chat.
   - `🚫 Disabled`: Enforces 100% private ephemeral translations for everyone.
3. **Flag Emoji Reaction Replies (`flag_channel_reply_allowed`):**
   - `🔒 DMs Only (Safe Default)`: Flag reactions are delivered silently via Direct Message with zero channel clutter.
   - `📢 Public Channel Replies`: Allows channel replies with auto-delete.

---

## 🍃 MongoDB Atlas on Google Cloud (L2 Cache & Encrypted Storage)

The bot supports hybrid persistence: local SQLite for offline development and **MongoDB Atlas on Google Cloud** (`europe-west1`) for production high availability:

1. **GCP Marketplace Activation:** Subscribe to **MongoDB Atlas (pay-as-you-go)** in the [GCP Marketplace](https://console.cloud.google.com/marketplace/product/mongodb/mongodb-atlas?project=journeylink-498811).
2. **Field-Level AES-256-GCM Encryption:** All user preferences, languages, and settings are encrypted at rest before being saved to the database.
3. **Multi-Tier Coalesced Cache:** Repeated queries or burst reactions are coalesced with Promise deduplication in memory (L1) and persisted with a 14-day TTL in MongoDB Atlas (L2).

Set the following in `.env` or Cloud Run Secret Manager:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.gcp.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=dc_translation
ENCRYPTION_SECRET_KEY=your-32-byte-secret-hex-string
```

---

## 🚀 Automated CI/CD Deployment to GCP

This repository includes a GitHub Actions workflow [`.github/workflows/deploy.yml`](file:///.github/workflows/deploy.yml) that automatically builds the Docker image and deploys it to **Google Cloud Run** in `europe-west1` as an always-on background worker.

### Required GitHub Repository Secrets:
- `GCP_SA_KEY`: Service Account JSON key (for `github-actions-deploy@journeylink-498811.iam.gserviceaccount.com`).
- `DISCORD_TOKEN`: Discord Bot Token.
- `DISCORD_CLIENT_ID`: Discord Application Client ID.
- `GOOGLE_TRANSLATE_API_KEY`: Google Cloud API Key for Translation.
- `MONGODB_URI`: MongoDB Atlas connection string.
- `ENCRYPTION_SECRET_KEY`: 32-byte AES-256-GCM encryption key.
- `DEEPL_AUTH_KEY`: (Optional) DeepL API Key.

