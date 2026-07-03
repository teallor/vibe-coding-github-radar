/** Push data/latest.json to a signed Feishu custom-bot webhook. */
const crypto = require('crypto');
const fs = require('fs');
const https = require('https');

const REPOSITORY = process.env.GITHUB_REPOSITORY || 'teallor/vibe-coding-github-radar';

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function sign(timestamp, secret) {
  const key = `${timestamp}\n${secret}`;
  return crypto.createHmac('sha256', key).update('').digest('base64');
}

function compact(text, maxLength = 180) {
  const clean = String(text || '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
  return clean.length > maxLength ? `${clean.slice(0, maxLength - 1)}…` : clean;
}

function projectBlock(project, label) {
  return {
    tag: 'div',
    text: {
      tag: 'lark_md',
      content: `**${label}：[${project.name}](${project.url})**\n${project.language || '未知语言'} · ⭐ ${project.stars || 0} · 推荐分 ${project.recommendScore || 0}\n${compact(project.description, 120)}`
    }
  };
}

function buildCard(data) {
  const filename = `${data.date}_VibeCoding_GitHub学习日报.md`;
  const reportUrl = `https://github.com/${REPOSITORY}/blob/main/reports/${encodeURIComponent(filename)}`;
  const elements = [
    {
      tag: 'div',
      text: { tag: 'lark_md', content: `**今日结论**\n${compact(data.summary, 260)}` }
    }
  ];

  if (data.topPick) elements.push(projectBlock(data.topPick, '今日最值得精读'));
  for (const project of (data.selectedProjects || []).slice(0, 5)) {
    elements.push({ tag: 'hr' }, projectBlock(project, '精选项目'));
  }
  elements.push(
    { tag: 'hr' },
    {
      tag: 'action',
      actions: [{ tag: 'button', text: { tag: 'plain_text', content: '查看完整 GitHub 日报' }, url: reportUrl, type: 'primary' }]
    },
    { tag: 'note', elements: [{ tag: 'plain_text', content: `由 ${REPOSITORY} 全自动生成并推送` }] }
  );

  return {
    config: { wide_screen_mode: true },
    header: {
      template: 'blue',
      title: { tag: 'plain_text', content: `${data.date} Vibe Coding GitHub 雷达` }
    },
    elements
  };
}

function postJson(url, payload) {
  const body = JSON.stringify(payload);
  return new Promise((resolve, reject) => {
    const request = https.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) },
      timeout: 30000
    }, response => {
      let content = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { content += chunk; });
      response.on('end', () => {
        let result;
        try { result = JSON.parse(content); } catch { return reject(new Error(`Feishu returned invalid JSON: ${content}`)); }
        if (response.statusCode < 200 || response.statusCode >= 300 || result.code !== 0) {
          return reject(new Error(`Feishu push failed (${response.statusCode}): ${content}`));
        }
        resolve(result);
      });
    });
    request.on('timeout', () => request.destroy(new Error('Feishu request timed out')));
    request.on('error', reject);
    request.end(body);
  });
}

async function main() {
  const webhook = requiredEnv('FEISHU_WEBHOOK');
  const secret = requiredEnv('FEISHU_SECRET');
  const data = JSON.parse(fs.readFileSync('data/latest.json', 'utf8'));
  const timestamp = Math.floor(Date.now() / 1000).toString();
  await postJson(webhook, {
    timestamp,
    sign: sign(timestamp, secret),
    msg_type: 'interactive',
    card: buildCard(data)
  });
  console.log(`Feishu digest sent successfully for ${data.date}.`);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
