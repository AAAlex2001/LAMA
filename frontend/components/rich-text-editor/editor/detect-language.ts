import hljs from 'highlight.js/lib/core';

import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import yaml from 'highlight.js/lib/languages/yaml';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import sql from 'highlight.js/lib/languages/sql';
import java from 'highlight.js/lib/languages/java';
import csharp from 'highlight.js/lib/languages/csharp';
import cpp from 'highlight.js/lib/languages/cpp';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import php from 'highlight.js/lib/languages/php';
import ruby from 'highlight.js/lib/languages/ruby';
import swift from 'highlight.js/lib/languages/swift';
import kotlin from 'highlight.js/lib/languages/kotlin';
import markdown from 'highlight.js/lib/languages/markdown';
import nginx from 'highlight.js/lib/languages/nginx';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import shell from 'highlight.js/lib/languages/shell';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('json', json);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('java', java);
hljs.registerLanguage('csharp', csharp);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('go', go);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('php', php);
hljs.registerLanguage('ruby', ruby);
hljs.registerLanguage('swift', swift);
hljs.registerLanguage('kotlin', kotlin);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('nginx', nginx);
hljs.registerLanguage('dockerfile', dockerfile);
hljs.registerLanguage('shell', shell);

const CANDIDATES = [
  'nginx',
  'typescript',
  'javascript',
  'python',
  'bash',
  'shell',
  'json',
  'yaml',
  'xml',
  'html',
  'css',
  'sql',
  'java',
  'csharp',
  'cpp',
  'go',
  'rust',
  'php',
  'ruby',
  'swift',
  'kotlin',
  'markdown',
  'dockerfile',
] as const;

const LANGUAGE_LABELS: Record<string, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  bash: 'Bash',
  shell: 'Shell',
  json: 'JSON',
  yaml: 'YAML',
  xml: 'XML',
  html: 'HTML',
  css: 'CSS',
  sql: 'SQL',
  java: 'Java',
  csharp: 'C#',
  cpp: 'C++',
  go: 'Go',
  rust: 'Rust',
  php: 'PHP',
  ruby: 'Ruby',
  swift: 'Swift',
  kotlin: 'Kotlin',
  markdown: 'Markdown',
  nginx: 'Nginx',
  dockerfile: 'Dockerfile',
  plaintext: 'Code',
};

export function detectLanguage(code: string): string {
  if (!code || code.trim().length < 5) return 'plaintext';

  const result = hljs.highlightAuto(code, [...CANDIDATES]);
  const lang = result.language ?? 'plaintext';

  if ((result.relevance ?? 0) < 3) return 'plaintext';

  return lang;
}

export function getLanguageLabel(language: string): string {
  return LANGUAGE_LABELS[language] || language || 'Code';
}

export function isCodeLike(text: string): boolean {
  if (!text || text.trim().length < 10) return false;

  const lines = text.split('\n');
  if (lines.length < 2) return false;

  const result = hljs.highlightAuto(text, [...CANDIDATES]);
  if ((result.relevance ?? 0) >= 5) return true;

  const codePatterns = [
    /^(import|export|const|let|var|function|class|interface|type)\s/m,
    /^(def|async def|class|from|import)\s/m,
    /^(location|server|upstream|http)\s*\{/m,
    /^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER)\s/im,
    /^\s*(if|for|while|switch|try|catch)\s*\(/m,
    /[{}\[\]();]\s*$/m,
    /^\s*[a-z_]+\s*[:=]\s*.+[;,]?\s*$/m,
    /^#!\//m,
    /^\s*<\/?[a-z][a-z0-9]*[^>]*>/im,
  ];

  let patternMatches = 0;
  for (const pattern of codePatterns) {
    if (pattern.test(text)) patternMatches++;
  }

  return patternMatches >= 2;
}

export { hljs };
