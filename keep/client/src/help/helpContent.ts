interface HelpContent {
  appName: string;
  tagline: string;
  sections: { title: string; items: string[] }[];
  shortcuts?: { keys: string; desc: string }[];
  faq?: { q: string; a: string }[];
}

export const helpContent: HelpContent = {
  appName: '极简便签',
  tagline: '用颜色和标签快速捕捉零碎灵感，置顶、归档、随手分拣。',
  sections: [
    {
      title: '核心功能',
      items: [
        '创建彩色便签，记录标题与正文，一键置顶把重要事项排到最前。',
        '勾选清单（Checklist）：在便签内添加可勾选的待办项，适合购物清单、步骤记录。',
        '标签多对多：为便签打标签，按标签或颜色快速筛选。',
        '归档与回收站：暂时不看的便签可归档，删除的便签先进回收站，可恢复或彻底删除。',
      ],
    },
    {
      title: '使用提示',
      items: [
        '顶部搜索框可同时匹配标题与正文。',
        '编辑弹窗中，存在勾选清单时正文自动锁定（二者择一展示）。',
      ],
    },
  ],
  shortcuts: [],
  faq: [],
};

export default helpContent;
