interface HelpContent {
  appName: string;
  tagline: string;
  sections: any[];
  shortcuts?: any[];
  faq?: any[];
}

export const helpContent: HelpContent = {
  appName: '自托管相册',
  tagline: '自托管地存储、归类与浏览你的个人照片。',
  sections: [{ title: '关于', items: ['自托管地存储、归类与浏览你的个人照片。'] }],
  shortcuts: [],
  faq: [],
};

export default helpContent;
