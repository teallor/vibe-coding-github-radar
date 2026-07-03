const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

const TYPES = ['Codex', 'Skill', 'MCP', '插件', 'Agent 工具', 'AI 产品功能', '模型更新', '其他'];

function unavailable(reason) {
  return { status: 'unavailable', provider: null, reason };
}

async function accessToken() {
  if (process.env.GOOGLE_CLOUD_ACCESS_TOKEN) return process.env.GOOGLE_CLOUD_ACCESS_TOKEN;
  const runGcloud = async args => process.platform === 'win32'
    ? execFileAsync('cmd.exe', ['/d', '/s', '/c', `gcloud ${args.join(' ')}`], { timeout: 10000, windowsHide: true })
    : execFileAsync('gcloud', args, { timeout: 10000, windowsHide: true });
  try {
    const { stdout } = await runGcloud(['auth', 'application-default', 'print-access-token']);
    return stdout.trim();
  } catch {
    try {
      const { stdout } = await runGcloud(['auth', 'print-access-token']);
      return stdout.trim();
    } catch { return ''; }
  }
}

function promptFor(candidate, radarType, userProfile, config) {
  return `You are a strict evidence-based reviewer for ${radarType}. Return JSON only.\n` +
    `User profile: ${JSON.stringify(userProfile)}\nThreshold: ${config.minScore}.\n` +
    `Score dimensions: Rafael match 0-25; consumer usability 0-20; Codex/Agent/Skills/MCP/plugin relevance 0-20; actionable value 0-15; source reliability 0-10; freshness/scarcity 0-10.\n` +
    `Reject rumors, marketing copy, funding, generic AI news, missing source links, or claims not supported by supplied evidence. Never invent facts.\n` +
    `Candidate: ${JSON.stringify(candidate)}\n` +
    `Required schema: {"shouldRecommend":boolean,"score":number,"type":"${TYPES.join(' / ')}","oneLineConclusion":"","whatHappened":"","consumerUseCase":"","valueForRafael":"","codexIntegrationPotential":"","actionSuggestion":"","reasons":[],"risksOrMissingInfo":[],"evidenceRequired":true,"dimensions":{"rafaelMatch":0,"consumerUsability":0,"ecosystemRelevance":0,"actionableValue":0,"sourceReliability":0,"freshness":0}}`;
}

function parseReview(text, threshold) {
  const cleaned = String(text || '').replace(/^```json\s*|\s*```$/g, '').trim();
  const value = JSON.parse(cleaned);
  const score = Math.max(0, Math.min(100, Number(value.score) || 0));
  const type = TYPES.includes(value.type) ? value.type : '其他';
  return { ...value, score, type, shouldRecommend: Boolean(value.shouldRecommend) && score >= threshold };
}

async function callJson(url, headers, body, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), signal: controller.signal });
    const text = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 300)}`);
    return JSON.parse(text);
  } finally { clearTimeout(timer); }
}

async function reviewCandidate(candidate, radarType, userProfile, config, options = {}) {
  if (options.forceUnavailable) return unavailable('forced for test');
  const model = config.geminiModel || 'gemini-3.1-pro-preview';
  const prompt = promptFor(candidate, radarType, userProfile, config);
  const timeoutMs = options.timeoutMs || 30000;
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
  const location = process.env.GOOGLE_CLOUD_LOCATION || 'global';

  try {
    if (Object.prototype.hasOwnProperty.call(options, 'mockText')) {
      return { status: 'success', provider: 'mock', model, review: parseReview(options.mockText, config.minScore) };
    }
    if (project) {
      const token = await accessToken();
      if (token) {
        const url = `https://aiplatform.googleapis.com/v1/projects/${encodeURIComponent(project)}/locations/${encodeURIComponent(location)}/publishers/google/models/${encodeURIComponent(model)}:generateContent`;
        const data = await callJson(url, { Authorization: `Bearer ${token}` }, {
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.1, maxOutputTokens: 8192 }
        }, timeoutMs);
        const text = data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('') || '';
        const review = parseReview(text, config.minScore);
        console.log(`[llm-reviewer] Vertex Gemini review succeeded (${model}); credentials were not logged.`);
        return { status: 'success', provider: 'vertex', model, review };
      }
    }
    const key = process.env.GEMINI_API_KEY;
    if (!key) return unavailable('Vertex project/credentials and GEMINI_API_KEY are unavailable');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
    const data = await callJson(url, {}, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.1, maxOutputTokens: 8192 }
    }, timeoutMs);
    const text = data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('') || '';
    const review = parseReview(text, config.minScore);
    console.log(`[llm-reviewer] Gemini API review succeeded (${model}); API key was not logged.`);
    return { status: 'success', provider: 'gemini-api', model, review };
  } catch (error) {
    console.warn(`[llm-reviewer] Gemini review unavailable; using rules: ${error.name === 'AbortError' ? 'timeout' : error.message.slice(0, 240)}`);
    return unavailable(error.name === 'AbortError' ? 'timeout' : 'request or JSON parsing failed');
  }
}

module.exports = { reviewCandidate, parseReview, unavailable, TYPES };
