interface HelpContent {
  appName: string;
  tagline: string;
  sections: any[];
  shortcuts?: any[];
  faq?: any[];
}

export const helpContent: HelpContent = {
  appName: '清单任务',
  tagline: '用项目、优先级和截止日期管理你的可执行任务清单。',
  sections: [{ title: '关于', items: ['用项目、优先级和截止日期管理你的可执行任务清单。'] }],
  shortcuts: [],
  faq: [],
};

export default helpContent;
