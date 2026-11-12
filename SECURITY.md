# Security Policy & Cryptographic Architecture

## Supported Versions

| Version | Supported |
| :--- | :--- |
| `1.0.x` | Yes |

## Cryptographic & Data Protection Architecture

`dc-translation` enforces defense-in-depth across all data persistence, network transport, and container runtime layers:

1. **Field-Level AES-256-GCM Encryption at Rest:**
   - Every user preference (`target_language`, `show_original`, `flag_duration`, `flag_mode`, `auto_translate_dm`, `auto_translate_thread`, `preferred_engine`, `setup_status`), server guardrail setting, and L2 translation cache entry is encrypted via **AES-256-GCM** with a unique 96-bit cryptographically random IV (`crypto.randomBytes(12)`) and verified via a 128-bit authentication tag before storage in SQLite or MongoDB Atlas.
2. **Per-User & Per-Channel Key Isolation (HMAC-SHA256 KDF):**
   - Buffered user messages and channel catch-up transcripts are encrypted using isolated keys derived via `HMAC-SHA256(MasterKey, "user:<discordId>")` and `HMAC-SHA256(MasterKey, "channel:<channelId>")` ([`src/utils/crypto.ts`](src/utils/crypto.ts)).
   - Compromise or inspection of one channel's or user's key context cannot decrypt records belonging to another user or channel.
3. **Zero URL Secret Leakage:**
   - Upstream Google Cloud Translation API requests pass authentication tokens exclusively via the `X-Goog-Api-Key` HTTP request header rather than URL query parameters, preventing credential exposure in proxy logs or error traces.
4. **Discord Channel Permission Enforcement:**
   - Live threads, unread catch-up batches, and auto-DM streams verify Discord `ViewChannel` and `ReadMessageHistory` permissions per member before delivering or translating any message.
5. **Container & CI/CD Hardening:**
   - Production Docker images run as an unprivileged non-root `node` user with build toolchains (`python3`, `make`, `g++`) stripped from the runtime layer.
   - `.gitignore` and `.dockerignore` strictly isolate `.env*`, `*.pem`, `*.key`, `certs/`, and `*.db*` artifacts from version control and Docker build contexts.

## Secret Management Guidelines

- **Never commit `.env` files, `.pem` certificates, or API tokens.** Use [`.env.example`](.env.example) as a template.
- Generate a strong 32-byte `ENCRYPTION_SECRET_KEY` for production:
  ```bash
  openssl rand -hex 32
  ```
- When using MongoDB X.509 certificates (`MONGODB_CERT_PEM`), the runtime materializes temporary certificate files in the OS temporary directory with `0600` permissions and unlinks them on process exit.

## Reporting a Vulnerability

If you discover a security vulnerability, please report it privately via GitHub Security Advisories rather than opening a public issue.
