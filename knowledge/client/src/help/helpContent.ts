interface HelpContent {
  appName: string;
  tagline: string;
  sections: any[];
  shortcuts?: any[];
  faq?: any[];
}

export const helpContent: HelpContent = {
  appName: '双链大纲笔记',
  tagline: '用大纲块和双向链接构建可钻取的个人知识网络。',
  sections: [{ title: '关于', items: ['用大纲块和双向链接构建可钻取的个人知识网络。'] }],
  shortcuts: [],
  faq: [],
};

export default helpContent;
