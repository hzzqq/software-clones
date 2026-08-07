interface HelpContent {
  appName: string;
  tagline: string;
  sections: any[];
  shortcuts?: any[];
  faq?: any[];
}

export const helpContent: HelpContent = {
  appName: '文件管理器',
  tagline: '在浏览器里浏览、预览与分享服务端目录的文件。',
  sections: [{ title: '关于', items: ['在浏览器里浏览、预览与分享服务端目录的文件。'] }],
  shortcuts: [],
  faq: [],
};

export default helpContent;
