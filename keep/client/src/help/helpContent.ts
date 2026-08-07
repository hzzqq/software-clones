interface HelpContent {
  appName: string;
  tagline: string;
  sections: any[];
  shortcuts?: any[];
  faq?: any[];
}

export const helpContent: HelpContent = {
  appName: '极简便签',
  tagline: '用颜色和标签快速捕捉零碎灵感，置顶、归档、随手分拣。',
  sections: [{ title: '关于', items: ['用颜色和标签快速捕捉零碎灵感，置顶、归档、随手分拣。'] }],
  shortcuts: [],
  faq: [],
};

export default helpContent;
