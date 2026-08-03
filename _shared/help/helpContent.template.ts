/**
 * 帮助内容模板。
 *
 * 复制到 `<app>/client/src/help/helpContent.ts` 后，把占位内容替换成该 App
 * **真实存在** 的功能与快捷键。
 *
 * 编写约定：
 *  - 全中文、纯文本、无图；
 *  - 篇幅控制在一屏半以内（sections 3~5 组，每组 3~6 条）；
 *  - 只写代码里确实实现了的能力，禁止臆造；
 *  - shortcuts / faq 可选，没有就整段省略。
 *
 * 说明：F1 与 Ctrl/Cmd + , 由共享模块统一提供，各 App 均可写入 shortcuts。
 */
import type { HelpContent } from '../components/SettingsHelp/types';

export const helpContent: HelpContent = {
  appName: '示例应用',
  tagline: '一句话说明这个应用是做什么的。',
  sections: [
    {
      title: '快速上手',
      items: ['第一步该做什么', '第二步该做什么', '结果保存在哪里'],
    },
    {
      title: '核心功能',
      items: ['功能一的用途与入口', '功能二的用途与入口', '功能三的用途与入口'],
    },
    {
      title: '界面与设置',
      items: [
        '右下角齿轮按钮打开设置：主题、字号缩放、全屏模式、减少动效、重置。',
        '右下角问号按钮打开本使用说明。',
        '设置保存在本浏览器，换浏览器或清理站点数据后会恢复默认。',
      ],
    },
  ],
  shortcuts: [
    { key: 'F1', desc: '打开使用说明' },
    { key: 'Ctrl / Cmd + ,', desc: '打开设置面板' },
  ],
  faq: [
    { q: '数据保存在哪里？', a: '按实际情况填写：服务端数据库 或 浏览器本地。' },
    { q: '为什么全屏没生效？', a: '部分浏览器或内嵌页面会限制全屏权限，此时会给出提示。' },
  ],
};

export default helpContent;
