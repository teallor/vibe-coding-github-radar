const CATEGORIES = Object.freeze({
  GITHUB_SOURCE_FAILURE: Object.freeze({
    error_code: 'GITHUB_SOURCE_FAILURE',
    human_readable_message: 'A public GitHub repository source could not be read.',
    likely_causes: ['GitHub API rate limiting', 'temporary network failure', 'changed or unavailable public repository data'],
    suggested_fix: 'Check the HTTP status and rate-limit logs, then retry without weakening selection rules.',
    workflow_behavior: 'degrade_gracefully'
  }),
  RSS_SOURCE_FAILURE: Object.freeze({
    error_code: 'RSS_SOURCE_FAILURE',
    human_readable_message: 'A public RSS or podcast source could not be fetched or parsed.',
    likely_causes: ['feed unavailable', 'invalid XML', 'request timeout or redirect failure'],
    suggested_fix: 'Inspect the named public feed, retry once, and keep other sources running.',
    workflow_behavior: 'degrade_gracefully'
  }),
  AI_REVIEWER_FAILURE: Object.freeze({
    error_code: 'AI_REVIEWER_FAILURE',
    human_readable_message: 'The optional AI reviewer was unavailable or returned an invalid response.',
    likely_causes: ['missing optional credentials', 'provider timeout or quota', 'invalid structured response'],
    suggested_fix: 'Review provider availability and optional configuration; rule-based scoring will remain active.',
    workflow_behavior: 'degrade_gracefully'
  }),
  FEISHU_DELIVERY_FAILURE: Object.freeze({
    error_code: 'FEISHU_DELIVERY_FAILURE',
    human_readable_message: 'The optional Feishu report could not be delivered.',
    likely_causes: ['invalid webhook configuration', 'signature mismatch', 'Feishu timeout or API rejection'],
    suggested_fix: 'Verify GitHub Secrets and the send ledger, then use a deliberate manual retry.',
    workflow_behavior: 'fail_hard'
  }),
  CONFIG_VALIDATION_FAILURE: Object.freeze({
    error_code: 'CONFIG_VALIDATION_FAILURE',
    human_readable_message: 'A project configuration file is missing or invalid.',
    likely_causes: ['invalid JSON', 'missing required fields', 'unsupported configuration values'],
    suggested_fix: 'Validate the changed JSON and compare it with the documented default configuration.',
    workflow_behavior: 'degrade_gracefully'
  }),
  ENVIRONMENT_VALIDATION_FAILURE: Object.freeze({
    error_code: 'ENVIRONMENT_VALIDATION_FAILURE',
    human_readable_message: 'A required secret or environment variable is missing or invalid for the requested operation.',
    likely_causes: ['missing GitHub Secret', 'empty repository variable', 'invalid environment value'],
    suggested_fix: 'Configure the named value in GitHub Secrets or local environment variables; never commit it.',
    workflow_behavior: 'fail_hard'
  }),
  SCHEDULE_RUNTIME_FAILURE: Object.freeze({
    error_code: 'SCHEDULE_RUNTIME_FAILURE',
    human_readable_message: 'Workflow schedule or runtime metadata could not be evaluated reliably.',
    likely_causes: ['delayed Actions start', 'unavailable run metadata', 'invalid schedule environment'],
    suggested_fix: 'Compare scheduled, start, generation, and delivery timestamps in the Actions log.',
    workflow_behavior: 'degrade_gracefully'
  })
});

function sanitizeDetail(value) {
  return String(value?.message || value || 'No additional detail')
    .replace(/(https?:\/\/[^\s?]+)\?[^\s]*/gi, '$1?<redacted>')
    .replace(/bearer\s+[^\s,;]+/gi, 'Bearer=<redacted>')
    .replace(/(bearer|token|secret|api[_-]?key|webhook|password)\s*[:=]\s*[^\s,;]+/gi, '$1=<redacted>')
    .replace(/gh[pousr]_[A-Za-z0-9_]+/g, '<redacted-github-token>')
    .slice(0, 300);
}

function diagnostic(errorCode, detail) {
  const category = CATEGORIES[errorCode];
  if (!category) throw new Error(`Unknown error category: ${errorCode}`);
  return { ...category, detail: sanitizeDetail(detail) };
}

function formatDiagnostic(errorCode, detail) {
  return `[structured-error] ${JSON.stringify(diagnostic(errorCode, detail))}`;
}

function categorizedError(errorCode, detail) {
  const error = new Error(sanitizeDetail(detail));
  error.errorCode = errorCode;
  return error;
}

module.exports = { CATEGORIES, sanitizeDetail, diagnostic, formatDiagnostic, categorizedError };
