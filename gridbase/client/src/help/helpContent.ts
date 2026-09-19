import type { HelpContent } from '../components/SettingsHelp/types';

export const helpContent: HelpContent = {
  appName: '表格数据库',
  tagline: '用可配置字段类型的电子表格网格，以 Airtable 的方式管理结构化数据。',
  sections: [
    {
      title: '核心概念',
      items: [
        '表（Table）：一个独立的数据集，类似一张电子表格。',
        '字段（Field）：表的列，可配置类型：文本 / 数字 / 单选 / 勾选 / 日期 / 链接。',
        '行（Row）与单元格（Cell）：行是记录，单元格按字段类型渲染不同编辑器。',
        '后台采用 EAV 动态结构，新增字段不会改动数据库表结构。',
      ],
    },
    {
      title: '常见操作',
      items: [
        '首页新建表，点击表进入网格视图。',
        '在网格视图顶部「添加字段」可新增列并选择类型。',
        '点击单元格直接编辑；勾选 / 下拉即时保存，文本 / 数字 / 链接失焦保存。',
        '「添加行」新增记录，「删除行 / 删除字段」会级联清理对应数据。',
      ],
    },
  ],
  shortcuts: [
    { key: 'F1', desc: '打开本使用说明' },
    { key: 'Ctrl / Cmd + ,', desc: '打开设置面板' },
  ],
  faq: [
    {
      q: '数据保存在哪里？',
      a: '保存在后端 SQLite 数据库（better-sqlite3），通过 REST API 读写。',
    },
    {
      q: '能否离线使用？',
      a: '可以。所有数据本地持久化，无需任何外部服务。',
    },
  ],
};

export default helpContent;
