/** 支持的代码语言（服务端权威清单，客户端展示同构）。 */
export interface LanguageDef {
  id: string;
  label: string;
}

export const LANGUAGES: LanguageDef[] = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'python', label: 'Python' },
  { id: 'java', label: 'Java' },
  { id: 'go', label: 'Go' },
  { id: 'bash', label: 'Bash / Shell' },
  { id: 'sql', label: 'SQL' },
  { id: 'json', label: 'JSON' },
  { id: 'html', label: 'HTML' },
  { id: 'css', label: 'CSS' },
  { id: 'text', label: '纯文本' },
];

export const LANGUAGE_IDS: string[] = LANGUAGES.map((l) => l.id);

/** 判断语言 id 是否受支持。 */
export function isSupportedLanguage(id: string): boolean {
  return LANGUAGE_IDS.includes(id);
}
