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
  const radarGuidance = radarType.includes('GitHub')
    ? 'For a GitHub project, inspect supplied repository metadata and README evidence. Judge actual reproducibility, documentation, maintenance, beginner suitability, dependency/API requirements, and concrete reuse value. Do not reward stars or keywords alone.'
    : radarType.includes('播客')
      ? 'For a podcast episode, inspect supplied shownotes, outline, duration, guest and transcript evidence. Judge practical depth, whether it truly teaches Codex/AI coding/agent workflows, and whether listening is worth the user time. Never infer content from the title alone.'
      : 'For an ecosystem update, verify that it is released, consumer-usable, actionable and supported by the supplied official or primary-source evidence.';
  return `You are a strict evidence-based reviewer for ${radarType}. Return JSON only.\n` +
    `User profile: ${JSON.stringify(userProfile)}\nTreat excludedFocus as a hard user-preference rejection even if the candidate is otherwise high quality.\nThreshold: ${config.minScore}.\n` +
    `Score dimensions: Rafael match 0-25; consumer usability 0-20; Codex/Agent/Skills/MCP/plugin relevance 0-20; actionable value 0-15; source reliability 0-10; freshness/scarcity 0-10.\n` +
    `${radarGuidance}\nReject rumors, marketing copy, funding, generic AI news, missing source links, or claims not supported by supplied evidence. Never invent facts.\n` +
    `Candidate: ${JSON.stringify(candidate)}\n` +
    `Required schema: {"shouldRecommend":boolean,"score":number,"type":"${TYPES.join(' / ')}","oneLineConclusion":"","whatHappened":"","consumerUseCase":"","valueForRafael":"","codexIntegrationPotential":"","actionSuggestion":"","reasons":[],"risksOrMissingInfo":[],"evidenceRequired":true,"dimensions":{"rafaelMatch":0,"consumerUsability":0,"ecosystemRelevance":0,"actionableValue":0,"sourceReliability":0,"freshness":0}}`;
}

async function withRetry(operation, options = {}) {
  const attempts = options.attempts || 3;
  const sleepImpl = options.sleepImpl || (ms => new Promise(resolve => setTimeout(resolve, ms)));
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try { return await operation(); } catch (error) {
      lastError = error;
      const retryable = error.name === 'AbortError' || /HTTP 429|RESOURCE_EXHAUSTED|timeout/i.test(error.message);
      if (!retryable || attempt === attempts) throw error;
      const waitMs = attempt * 5000;
      console.warn(`[llm-reviewer] Gemini temporarily unavailable; retrying in ${waitMs / 1000}s (${attempt}/${attempts - 1}).`);
      await sleepImpl(waitMs);
    }
  }
  throw lastError;
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
        const data = await withRetry(() => callJson(url, { Authorization: `Bearer ${token}` }, {
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.1, maxOutputTokens: 8192 }
        }, timeoutMs), { attempts: options.attempts, sleepImpl: options.sleepImpl });
        const text = data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('') || '';
        const review = parseReview(text, config.minScore);
        console.log(`[llm-reviewer] Vertex Gemini review succeeded (${model}); credentials were not logged.`);
        return { status: 'success', provider: 'vertex', model, review };
      }
    }
    const key = process.env.GEMINI_API_KEY;
    if (!key) return unavailable('Vertex project/credentials and GEMINI_API_KEY are unavailable');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
    const data = await withRetry(() => callJson(url, {}, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.1, maxOutputTokens: 8192 }
    }, timeoutMs), { attempts: options.attempts, sleepImpl: options.sleepImpl });
    const text = data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('') || '';
    const review = parseReview(text, config.minScore);
    console.log(`[llm-reviewer] Gemini API review succeeded (${model}); API key was not logged.`);
    return { status: 'success', provider: 'gemini-api', model, review };
  } catch (error) {
    console.warn(`[llm-reviewer] Gemini review unavailable; using rules: ${error.name === 'AbortError' ? 'timeout' : error.message.slice(0, 240)}`);
    return unavailable(error.name === 'AbortError' ? 'timeout' : 'request or JSON parsing failed');
  }
}

module.exports = { reviewCandidate, parseReview, unavailable, withRetry, TYPES };
