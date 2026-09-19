interface HelpContent {
  appName: string;
  tagline: string;
  sections: { title: string; items: string[] }[];
  shortcuts?: { keys: string; desc: string }[];
  faq?: { q: string; a: string }[];
}

export const helpContent: HelpContent = {
  appName: '清单任务',
  tagline: '用项目分隔不同清单，用优先级与截止日期管理每日要事。',
  sections: [
    {
      title: '核心功能',
      items: [
        '项目（清单）：左侧栏创建多个清单，点击切换；支持重命名与删除。',
        '任务：标题、描述、优先级 P1–P4、截止日期、完成态。',
        '子任务：每个任务可展开添加一级子任务，逐项勾选。',
        '今日视图：自动聚合「临近/已过截止」或「高优先级(P1/P2)」的未完成任务。',
        '快速添加：顶部输入框回车即可新建任务，点「详细」可设置完整字段。',
      ],
    },
  ],
  shortcuts: [{ keys: 'Enter', desc: '在快速添加框回车，立即新建任务' }],
  faq: [],
};

export default helpContent;
