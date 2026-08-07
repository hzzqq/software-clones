interface HelpContent {
  appName: string;
  tagline: string;
  sections: any[];
  shortcuts?: any[];
  faq?: any[];
}

export const helpContent: HelpContent = {
  appName: '番茄钟',
  tagline: '用番茄工作法配合任务清单提升专注度并沉淀统计。',
  sections: [{ title: '关于', items: ['用番茄工作法配合任务清单提升专注度并沉淀统计。'] }],
  shortcuts: [],
  faq: [],
};

export default helpContent;
