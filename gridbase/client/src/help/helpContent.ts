interface HelpContent {
  appName: string;
  tagline: string;
  sections: any[];
  shortcuts?: any[];
  faq?: any[];
}

export const helpContent: HelpContent = {
  appName: '表格数据库',
  tagline: '用可配置字段类型的表格以网格视图管理结构化数据。',
  sections: [{ title: '关于', items: ['用可配置字段类型的表格以网格视图管理结构化数据。'] }],
  shortcuts: [],
  faq: [],
};

export default helpContent;
