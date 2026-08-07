interface HelpContent {
  appName: string;
  tagline: string;
  sections: any[];
  shortcuts?: any[];
  faq?: any[];
}

export const helpContent: HelpContent = {
  appName: '无限画布',
  tagline: '在可平移缩放的画布上用节点和连线可视化组织想法。',
  sections: [{ title: '关于', items: ['在可平移缩放的画布上用节点和连线可视化组织想法。'] }],
  shortcuts: [],
  faq: [],
};

export default helpContent;
