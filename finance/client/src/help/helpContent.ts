interface HelpContent {
  appName: string;
  tagline: string;
  sections: any[];
  shortcuts?: any[];
  faq?: any[];
}

export const helpContent: HelpContent = {
  appName: '金融终端',
  tagline: '行情面板、自选股与个股简表，轻量金融终端。',
  sections: [{ title: '关于', items: ['行情面板、自选股与个股简表，轻量金融终端。'] }],
  shortcuts: [],
  faq: [],
};

export default helpContent;
