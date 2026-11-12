import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import fs from 'fs';
import { encryptField, decryptField, encryptForUser, decryptForUser } from '../src/utils/crypto';
import { initDatabase, dbService } from '../src/db/database';
import {
  getSetupLabels,
  getSettingsLabels,
  getServerLabels,
  getHelpLabels,
  getUILabels,
} from '../src/utils/locales';
import { getDynamicSetupLabels } from '../src/services/uiTranslator';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName}`);
    failed++;
  }
}

async function runSecurityTests() {
  console.log('\n--- 1. SECURITY & SECRETS ISOLATION TESTS ---');

  const testPlaintext = 'SecureUserCredentialsAndPreferences_12345';
  const encrypted = encryptField(testPlaintext);
  assert(encrypted !== testPlaintext, 'AES-256-GCM produces ciphertext distinct from plaintext');
  assert(encrypted.includes(':'), 'AES-256-GCM includes IV and Auth Tag separator');

  const decrypted = decryptField(encrypted);
  assert(decrypted === testPlaintext, 'AES-256-GCM decrypts correctly back to original plaintext');

  const userAEncrypted = encryptForUser(testPlaintext, 'user_111');
  const userBDecrypted = decryptForUser(userAEncrypted, 'user_222');
  assert(userBDecrypted !== testPlaintext, 'Per-user HMAC-derived AES-256-GCM key isolates ciphertexts across users');
  assert(decryptForUser(userAEncrypted, 'user_111') === testPlaintext, 'Per-user AES-256-GCM key decrypts for owning user');

  const gitignorePath = path.resolve(__dirname, '../.gitignore');
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  assert(gitignoreContent.includes('.env'), '.gitignore ignores .env files');
  assert(gitignoreContent.includes('*.pem') && gitignoreContent.includes('certs/'), '.gitignore ignores certificate files');
  assert(gitignoreContent.includes('data.db*'), '.gitignore ignores SQLite databases');

  const dockerignorePath = path.resolve(__dirname, '../.dockerignore');
  const dockerignoreContent = fs.readFileSync(dockerignorePath, 'utf8');
  assert(dockerignoreContent.includes('.env') && dockerignoreContent.includes('certs/'), '.dockerignore excludes secrets and certificates from Docker context');

  const srcDir = path.resolve(__dirname, '../src');
  const walk = (dir: string): string[] => {
    let results: string[] = [];
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) results = results.concat(walk(full));
      else if (full.endsWith('.ts')) results.push(full);
    }
    return results;
  };

  let hasRawSecret = false;
  for (const file of walk(srcDir)) {
    const code = fs.readFileSync(file, 'utf8');
    if (code.includes('mongodb+srv://') && !code.includes('process.env')) hasRawSecret = true;
    if (code.includes('ghp_') || code.includes('AIzaSy') || code.includes('sk_live_')) hasRawSecret = true;
  }
  assert(!hasRawSecret, 'Zero raw hardcoded secrets or API keys found in src/ codebase');
}

async function runFunctionalityTests() {
  console.log('\n--- 2. FUNCTIONALITY & USER LIFECYCLE TESTS ---');

  const testUserId = `test_user_${Date.now()}`;
  const testChannelId = `chan_${Date.now()}`;
  const testGuildId = `guild_${Date.now()}`;

  const promptNeededInitial = dbService.isSetupPromptNeeded(testUserId);
  assert(promptNeededInitial === true, 'New user requires setup prompt initially');

  dbService.setSetupStatus(testUserId, 'pending');
  const promptNeededPending = dbService.isSetupPromptNeeded(testUserId);
  const prefsPending = dbService.getUserPreferences(testUserId);
  assert(promptNeededPending === false, 'Pending user does NOT require duplicate setup prompt');
  assert(prefsPending.setup_status === 'pending', 'User setup_status is persisted as "pending"');
  assert(prefsPending.setup_completed === false, 'Pending user setup_completed is false');

  dbService.setSetupCompleted(testUserId, true);
  const promptNeededCompleted = dbService.isSetupPromptNeeded(testUserId);
  const prefsCompleted = dbService.getUserPreferences(testUserId);
  assert(promptNeededCompleted === false, 'Completed user does NOT require setup prompt');
  assert(prefsCompleted.setup_status === 'completed', 'Completed user setup_status is "completed"');
  assert(prefsCompleted.setup_completed === true, 'Completed user setup_completed is true');

  assert(dbService.isChannelMuted(testUserId, testChannelId) === false, 'Channel is unmuted by default');
  await dbService.muteChannel(testUserId, testChannelId, testGuildId);
  assert(dbService.isChannelMuted(testUserId, testChannelId) === true, 'Channel is muted after muteChannel()');
  await dbService.unmuteChannel(testUserId, testChannelId);
  assert(dbService.isChannelMuted(testUserId, testChannelId) === false, 'Channel is unmuted after unmuteChannel()');

  const testThreadId = `thread_${Date.now()}`;
  dbService.setThreadFocus(testThreadId, testChannelId);
  assert(dbService.getThreadFocus(testThreadId) === testChannelId, 'Thread focus is persisted and retrieved correctly');
  dbService.deleteThreadFocus(testThreadId);
  assert(dbService.getThreadFocus(testThreadId) === 'all', 'Thread focus defaults to "all" on reset');
}

async function runDocuTests() {
  console.log('\n--- 3. DOCUMENTATION & GOVERNANCE TESTS ---');

  const rootDir = path.resolve(__dirname, '..');
  const readmePath = path.join(rootDir, 'README.md');
  const securityPath = path.join(rootDir, 'SECURITY.md');
  const licensePath = path.join(rootDir, 'LICENSE');
  const envExamplePath = path.join(rootDir, '.env.example');

  assert(fs.existsSync(readmePath), 'README.md exists');
  assert(fs.existsSync(securityPath), 'SECURITY.md exists');
  assert(fs.existsSync(licensePath), 'LICENSE exists');
  assert(fs.existsSync(envExamplePath), '.env.example exists');

  const readmeContent = fs.readFileSync(readmePath, 'utf8');
  assert(!readmeContent.toLowerCase().includes('file:///c:/users/'), 'README.md contains zero local machine file:// paths');
  assert(readmeContent.includes('DISCORD_CLIENT_ID'), 'README.md documents DISCORD_CLIENT_ID');

  const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
  assert(envExampleContent.includes('DISCORD_CLIENT_ID='), '.env.example defines DISCORD_CLIENT_ID');
  assert(envExampleContent.includes('ENCRYPTION_SECRET_KEY='), '.env.example defines ENCRYPTION_SECRET_KEY');

  const workflowPath = path.join(rootDir, '.github/workflows/deploy.yml');
  const workflowContent = fs.readFileSync(workflowPath, 'utf8');
  assert(workflowContent.includes('vars.GCP_PROJECT_ID'), 'CI/CD workflow uses parameterized GitHub repository variables');

  const srcDir = path.resolve(__dirname, '../src');
  const walk = (dir: string): string[] => {
    let results: string[] = [];
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) results = results.concat(walk(full));
      else if (full.endsWith('.ts')) results.push(full);
    }
    return results;
  };

  let strayTodoCount = 0;
  for (const file of walk(srcDir)) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    for (const l of lines) {
      if (l.trim().startsWith('// TODO') || l.trim().startsWith('// FIXME')) {
        strayTodoCount++;
      }
    }
  }
  assert(strayTodoCount === 0, 'Zero stray TODO/FIXME comments found in src/ codebase');
}

async function runTranslationTests() {
  console.log('\n--- 4. TRANSLATIONS & MONGODB UI BUNDLES TESTS ---');

  const locales = ['en', 'de', 'es', 'fr', 'it', 'ru', 'uk'];
  for (const loc of locales) {
    const setup = getSetupLabels(loc);
    assert(Boolean(setup.step2Title && setup.step2Desc), `Pre-bundled setup labels exist for "${loc}"`);
    assert(Boolean(setup.threadName && setup.dmName && setup.ephemeralName), `Delivery modes labeled for "${loc}"`);

    const bannedKeywords = ['schließen sich gegenseitig logisch aus', 'mutually exclusive', 'se excluyen mutuamente'];
    let containsBanned = false;
    for (const b of bannedKeywords) {
      if (setup.step2Desc.toLowerCase().includes(b.toLowerCase())) containsBanned = true;
    }
    assert(!containsBanned, `Step 2 copy for "${loc}" is free of confusing mutual exclusivity phrasing`);

    const settings = getSettingsLabels(loc);
    assert(Boolean(settings.title && settings.deliveryMode), `Pre-bundled settings labels exist for "${loc}"`);

    const server = getServerLabels(loc);
    assert(Boolean(server.title && server.threadsField), `Pre-bundled server labels exist for "${loc}"`);

    const help = getHelpLabels(loc);
    assert(Boolean(help.title && help.sectionPrivate), `Pre-bundled help labels exist for "${loc}"`);

    const ui = getUILabels(loc);
    assert(Boolean(ui.title && ui.deeplBtn && ui.liveThreadBtn), `Pre-bundled UI labels exist for "${loc}"`);
  }

  const dynamicSetupTl = await getDynamicSetupLabels('tl');
  assert(Boolean(dynamicSetupTl.step2Desc), 'Dynamic language (Tagalog) bundle translates successfully');
  assert(!dynamicSetupTl.step2Desc.includes('lohikal'), 'Dynamic Tagalog bundle uses updated non-slop copy');

  const cachedBundle = dbService.getUIBundle('setup_v3_tl');
  assert(cachedBundle !== null, 'Dynamic bundle is cached under setup_v3_tl in SQLite/MongoDB store');
}

import { getLanguageCodeFromFlag } from '../src/utils/flags';

async function runFlagTests() {
  console.log('\n--- 5. DISCORD FLAG & REACTION TESTS ---');

  const flagCases = [
    { input: '🇩🇪', expected: 'de', label: 'Germany flag' },
    { input: '🇫🇷', expected: 'fr', label: 'France flag' },
    { input: '🇪🇸', expected: 'es', label: 'Spain flag' },
    { input: '🇮🇹', expected: 'it', label: 'Italy flag' },
    { input: '🇬🇧', expected: 'en', label: 'United Kingdom flag' },
    { input: '🇳🇱', expected: 'nl', label: 'Netherlands flag' },
    { input: '🇵🇱', expected: 'pl', label: 'Poland flag' },
    { input: '🇺🇦', expected: 'uk', label: 'Ukraine flag' },
    { input: '🇷🇺', expected: 'ru', label: 'Russia flag' },
    { input: '🇹🇷', expected: 'tr', label: 'Turkey flag' },
    { input: '🇺🇸', expected: 'en', label: 'United States flag' },
    { input: '🇨🇦', expected: 'en', label: 'Canada flag' },
    { input: '🇧🇷', expected: 'pt', label: 'Brazil flag' },
    { input: '🇲🇽', expected: 'es', label: 'Mexico flag' },
    { input: '🇨🇱', expected: 'es', label: 'Chile flag' },
    { input: '🇨🇴', expected: 'es', label: 'Colombia flag' },
    { input: '🇵🇪', expected: 'es', label: 'Peru flag' },
    { input: '🇦🇷', expected: 'es', label: 'Argentina flag' },
    { input: '🇲🇦', expected: 'ar', label: 'Morocco flag' },
    { input: '🇩🇿', expected: 'ar', label: 'Algeria flag' },
    { input: '🇳🇬', expected: 'en', label: 'Nigeria flag' },
    { input: '🇸🇦', expected: 'ar', label: 'Saudi Arabia flag' },
    { input: '🇦🇪', expected: 'ar', label: 'UAE flag' },
    { input: '🇪🇬', expected: 'ar', label: 'Egypt flag' },
    { input: '🇯🇵', expected: 'ja', label: 'Japan flag' },
    { input: '🇰🇷', expected: 'ko', label: 'South Korea flag' },
    { input: '🇨🇳', expected: 'zh-cn', label: 'China flag' },
    { input: '🇮🇳', expected: 'hi', label: 'India flag' },
    { input: '🇵🇰', expected: 'ur', label: 'Pakistan flag' },
    { input: '🇸🇬', expected: 'en', label: 'Singapore flag' },
    { input: '🇵🇭', expected: 'tl', label: 'Philippines flag' },
    { input: '🇻🇳', expected: 'vi', label: 'Vietnam flag' },
    { input: '🇹🇭', expected: 'th', label: 'Thailand flag' },
    { input: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', expected: 'en', label: 'England regional flag' },
    { input: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', expected: 'gd', label: 'Scotland regional flag' },
    { input: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', expected: 'cy', label: 'Wales regional flag' },
    { input: 'flag_de', expected: 'de', label: 'Discord emoji shortcode flag_de' },
    { input: ':flag_us:', expected: 'en', label: 'Discord emoji markdown :flag_us:' },
    { input: 'flag_fr', expected: 'fr', label: 'Discord emoji shortcode flag_fr' },
    { input: 'flag_england', expected: 'en', label: 'Discord shortcode flag_england' },
    { input: 'de', expected: 'de', label: 'Direct language code de' },
    { input: 'ja', expected: 'ja', label: 'Direct language code ja' },
  ];

  for (const c of flagCases) {
    const res = getLanguageCodeFromFlag(c.input);
    assert(res === c.expected, `${c.label} resolves to "${c.expected}"`);
  }
}

async function main() {
  console.log('====================================================');
  console.log('RUNNING FULL SYSTEM TEST SUITE: SECURITY, FUNCTIONALITY, DOCS, TRANSLATIONS, FLAGS');
  console.log('====================================================');

  await initDatabase();

  await runSecurityTests();
  await runFunctionalityTests();
  await runDocuTests();
  await runTranslationTests();
  await runFlagTests();

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error during test suite:', err);
  process.exit(1);
});
