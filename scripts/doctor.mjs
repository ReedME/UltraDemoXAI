// Environment check: verifies everything the pipeline needs, with fix hints.
// Usage: npm run doctor
import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';

let failed = false;
const ok = (label, detail = '') => console.log(`  ✓ ${label}${detail ? ` (${detail})` : ''}`);
const bad = (label, fix) => {
  failed = true;
  console.log(`  ✗ ${label}\n    fix: ${fix}`);
};
const info = (label) => console.log(`  · ${label}`);

console.log('ultrademo doctor\n');

// Node
const major = Number(process.versions.node.split('.')[0]);
if (major >= 20) ok('node', `v${process.versions.node}`);
else bad(`node v${process.versions.node} is too old`, 'install Node 20+ (22 recommended)');

// ffmpeg / ffprobe
for (const bin of ['ffmpeg', 'ffprobe']) {
  try {
    const v = execFileSync(bin, ['-version']).toString().split('\n')[0];
    ok(bin, v.split(' ').slice(0, 3).join(' '));
  } catch {
    bad(`${bin} not found`, 'brew install ffmpeg (macOS) or apt install ffmpeg (Linux)');
  }
}

// Playwright chromium
try {
  const {chromium} = await import('playwright');
  const exe = chromium.executablePath();
  if (existsSync(exe)) ok('playwright chromium', exe.split('/').slice(-3).join('/'));
  else bad('playwright chromium browser not downloaded', 'npx playwright install chromium');
} catch {
  bad('playwright not installed', 'npm install');
}

// Remotion
try {
  await import('remotion');
  ok('remotion');
} catch {
  bad('remotion not installed', 'npm install');
}

// Voice chain: xAI -> ElevenLabs -> Piper -> macOS say
let hasPiper = false;
try {
  execFileSync('piper', ['--help'], {stdio: 'ignore'});
  hasPiper = true;
} catch {
  /* not installed */
}
const provider = process.env.TTS_PROVIDER?.trim().toLowerCase();
if (provider === 'xai' || (!provider && process.env.XAI_API_KEY)) {
  if (process.env.XAI_API_KEY) ok('XAI_API_KEY set', `narration will use xAI (${process.env.XAI_VOICE_ID ?? 'eve'})`);
  else bad('TTS_PROVIDER=xai but XAI_API_KEY is missing', 'add XAI_API_KEY=... to .env');
} else if (provider === 'elevenlabs' || (!provider && process.env.ELEVENLABS_API_KEY)) {
  if (process.env.ELEVENLABS_API_KEY) ok('ELEVENLABS_API_KEY set', 'narration will use ElevenLabs');
  else bad('TTS_PROVIDER=elevenlabs but ELEVENLABS_API_KEY is missing', 'add ELEVENLABS_API_KEY=... to .env');
} else if (provider === 'piper' || (!provider && hasPiper)) {
  if (hasPiper) ok('piper installed', 'free offline narration; set XAI_API_KEY or ELEVENLABS_API_KEY in .env for a premium voice');
  else bad('TTS_PROVIDER=piper but piper is not installed', 'pip install piper-tts');
} else if (provider === 'say' || process.platform === 'darwin') {
  info('no XAI_API_KEY, ELEVENLABS_API_KEY, or piper - narration falls back to the macOS `say` placeholder voice.');
  info('  better free option: pip install piper-tts · premium: XAI_API_KEY=... or ELEVENLABS_API_KEY=... in .env');
} else if (provider) {
  bad(`unknown TTS_PROVIDER "${provider}"`, 'use xai, elevenlabs, piper, or say');
} else {
  bad(
    'no voice available (no XAI_API_KEY, no ELEVENLABS_API_KEY, no piper, no macOS say)',
    'pip install piper-tts  (free, offline)  or add XAI_API_KEY=... to .env',
  );
}

console.log(failed ? '\nsome checks failed - fix the items above.' : '\nall good - you are ready to capture.');
process.exit(failed ? 1 : 0);
