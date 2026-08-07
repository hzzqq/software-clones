interface HelpContent {
  appName: string;
  tagline: string;
  sections: any[];
  shortcuts?: any[];
  faq?: any[];
}

export const helpContent: HelpContent = {
  appName: '文本/代码粘贴板',
  tagline: '把文本或代码生成公开短链，支持语法高亮与过期。',
  sections: [{ title: '关于', items: ['把文本或代码生成公开短链，支持语法高亮与过期。'] }],
  shortcuts: [],
  faq: [],
};

export default helpContent;
