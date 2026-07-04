(function expose(root) {
  const TYPE_MAP = { 已读不错: 'positive', 已读不行: 'negative', 重复了: 'duplicate', 允许继续追踪: 'allow_repeat' };
  const MESSAGE_RE = /^反馈\s+(\S+)\s+(已读不错|已读不行|重复了|允许继续追踪)(?:[，,]\s*原因[:：]\s*(.+))?\s*$/;
  function classifyFeedback(raw) { const text = String(raw || '').trim().toLowerCase(); if (/允许继续追踪|允许重复推送|后续更新可以继续推/.test(text)) return 'allow_repeat'; if (/重复了|之前推过|不要重复/.test(text)) return 'duplicate'; if (/已读不行|没价值|标题党|太水|以后别推|(?:^|\s)不行(?:$|\s)/.test(text)) return 'negative'; if (/已读不错|值得看|有价值|可以多推|这个方向可以|(?:^|\s)不错(?:$|\s)/.test(text)) return 'positive'; return 'neutral'; }
  function parseFeedbackMessage(text) { const match = String(text || '').trim().match(MESSAGE_RE); return match ? { feedbackId: match[1], rawFeedback: match[2], feedbackType: TYPE_MAP[match[2]], note: (match[3] || '').trim() } : null; }
  function tokenize(text) { return [...new Set(String(text || '').toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) || [])].slice(0, 12); }
  const api = { TYPE_MAP, MESSAGE_RE, classifyFeedback, parseFeedbackMessage, tokenize };
  root.FeedbackRules = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
