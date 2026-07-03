/**
 * loadConfig.js - 配置加载模块
 * GitHub Actions 脚本，用于读取 focus 配置
 *
 * 读取优先级：
 * 1. config/focus.json
 * 2. config/default-focus.json
 * 3. 代码里的 fallback 默认值
 */

const fs = require('fs');
const path = require('path');

// Fallback 默认配置（只在两个配置文件都不存在时使用）
const FALLBACK_CONFIG = {
  profileName: '默认综合模式（fallback）',
  updatedAt: new Date().toISOString().slice(0, 10),
  author: 'Rafael_Huang',
  enabledFocusAreas: [
    {
      id: 'office_automation',
      name: 'Office 文档自动化',
      description: '关注 Word、Excel、PPT、PDF、报告、模板、批量处理等办公自动化项目',
      enabled: true,
      weight: 35,
      keywords: [
        'office automation', 'word automation', 'excel automation',
        'powerpoint automation', 'pdf automation', 'docx generator',
        'xlsx generator', 'pptx generator', 'python-docx', 'python-pptx',
        'openpyxl', 'report generator', 'document workflow',
        'template filling', 'batch document processing'
      ],
      excludeKeywords: ['paid api only', 'enterprise only'],
      minStars: 30,
      updatedWithinMonths: 18
    },
    {
      id: 'vibe_monetization',
      name: '个人 Vibe Coding 变现',
      description: '关注可包装成小工具、服务、模板的开源项目',
      enabled: true,
      weight: 25,
      keywords: [
        'micro SaaS', 'indie hacker tools', 'productivity app',
        'automation tool', 'local app', 'desktop automation',
        'small business automation', 'freelancer tools', 'invoice generator',
        'resume generator', 'proposal generator', 'form automation',
        'data cleaning tool'
      ],
      excludeKeywords: ['requires payment', 'subscription only'],
      minStars: 20,
      updatedWithinMonths: 18
    },
    {
      id: 'codex_friendly',
      name: 'Codex 可改造项目',
      description: '关注结构清晰、适合小白只读学习的项目',
      enabled: true,
      weight: 25,
      keywords: [
        'starter project', 'simple python app', 'streamlit app',
        'flask starter', 'fastapi starter', 'cli tool', 'local first app',
        'automation script', 'developer tools', 'repo analyzer',
        'code reading tool'
      ],
      excludeKeywords: ['enterprise framework', 'distributed system'],
      minStars: 10,
      updatedWithinMonths: 24
    },
    {
      id: 'fun_interesting',
      name: '新鲜有趣项目',
      description: '关注有趣、新颖、有启发性的创意编程和工具项目',
      enabled: true,
      weight: 15,
      keywords: [
        'fun python projects', 'creative coding', 'data visualization',
        'personal dashboard', 'knowledge base', 'local AI app',
        'ollama app', 'RAG app', 'web scraper', 'habit tracker',
        'bookmark manager', 'personal CRM'
      ],
      excludeKeywords: ['requires gpu', 'large model only'],
      minStars: 15,
      updatedWithinMonths: 18
    },
    {
      id: 'personal_efficiency',
      name: '个人效率工具',
      description: '关注笔记、知识管理、自动化、任务管理等个人效率工具',
      enabled: true,
      weight: 10,
      keywords: [
        'learning tool', 'note taking app', 'markdown tool',
        'anki generator', 'flashcard generator', 'reading assistant',
        'knowledge management', 'personal automation',
        'workflow automation', 'task automation'
      ],
      excludeKeywords: ['team only', 'enterprise plan'],
      minStars: 10,
      updatedWithinMonths: 24
    }
  ],
  scoringWeights: {
    vibeCodingLearning: 20,
    officeAutomation: 20,
    monetizationPotential: 15,
    codexFriendly: 15,
    beginnerFriendly: 10,
    localFirst: 10,
    activity: 5,
    license: 5
  },
  blacklistKeywords: [
    'crypto', 'nft', 'trading bot', 'adult', 'casino',
    'gambling', 'malware', 'scraper for illegal use'
  ],
  whitelistKeywords: [
    'office', 'excel', 'word', 'pptx', 'pdf', 'automation',
    'local', 'template', 'generator', 'codex', 'github',
    'learning', 'pwa'
  ],
  blockedRepos: [],
  priorityOwners: [],
  priorityTopics: [],
  priorityLanguages: ['Python', 'JavaScript', 'TypeScript']
};

/**
 * 加载配置，返回配置对象和来源标识
 * @returns {{config: object, source: string}}
 */
function loadConfig() {
  const focusPath = path.join(process.cwd(), 'config', 'focus.json');
  const defaultPath = path.join(process.cwd(), 'config', 'default-focus.json');

  if (fs.existsSync(focusPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(focusPath, 'utf-8'));
      return { config, source: 'config/focus.json' };
    } catch (e) {
      console.warn('⚠️ config/focus.json 解析失败，尝试默认配置:', e.message);
    }
  }

  if (fs.existsSync(defaultPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(defaultPath, 'utf-8'));
      return { config, source: 'config/default-focus.json' };
    } catch (e) {
      console.warn('⚠️ config/default-focus.json 解析失败，使用 fallback:', e.message);
    }
  }

  console.warn('⚠️ 两个配置文件都不存在，使用代码内 fallback 默认值');
  return { config: FALLBACK_CONFIG, source: 'fallback (代码内默认值)' };
}

module.exports = { loadConfig, FALLBACK_CONFIG };
