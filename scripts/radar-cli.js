const { spawn } = require('child_process');

function run(command, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', windowsHide: true, env: { ...process.env, ...env } });
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} failed with ${code}`)));
    child.on('error', reject);
  });
}

async function generateAll() {
  await run('node', ['scripts/scout.js']);
  await run('node', ['scripts/find-codex-podcasts.js']);
  await run('node', ['scripts/ai-app-radar.js']);
}

async function main() {
  const mode = process.argv[2] || 'dry-run';
  if (mode === 'dry-run') {
    await generateAll();
    console.log('Dry-run completed: three radars generated; no Feishu request was sent.');
    return;
  }
  if (mode === 'preview') {
    await run('node', ['scripts/send-feishu.js', '--daily'], { FEISHU_DRY_RUN: '1', FEISHU_PREVIEW_FILE: 'data/feishu-preview.json' });
    return;
  }
  if (mode === 'send-test') {
    if (!process.env.FEISHU_WEBHOOK || !process.env.FEISHU_SECRET) {
      console.log('send-test skipped: FEISHU_WEBHOOK or FEISHU_SECRET is missing.');
      return;
    }
    await run('node', ['scripts/send-feishu.js', '--daily']);
    return;
  }
  if (mode === 'full-run') {
    await generateAll();
    if (!process.env.FEISHU_WEBHOOK || !process.env.FEISHU_SECRET) throw new Error('full-run requires FEISHU_WEBHOOK and FEISHU_SECRET');
    await run('node', ['scripts/send-feishu.js', '--daily']);
    return;
  }
  throw new Error(`Unknown mode: ${mode}`);
}

main().catch(error => { console.error(error.message); process.exit(1); });
