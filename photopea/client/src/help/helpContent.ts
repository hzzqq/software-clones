import type { HelpContent } from '../components/SettingsHelp/types';

/** 图像编辑器的使用说明内容。 */
export const helpContent: HelpContent = {
  appName: '图像编辑器',
  tagline: '基于图层的轻量图片编辑，全部在浏览器本地完成。',
  sections: [
    {
      title: '打开与新建',
      items: [
        '点击「打开图片」从本地选择图片，图片会作为一个新图层载入画布。',
        '「打开设计」可载入之前保存到服务端的设计稿。',
      ],
    },
    {
      title: '绘制工具',
      items: [
        '工具栏依次为：选择、画笔、橡皮、矩形、椭圆、直线、文字。',
        '画笔与橡皮可调节笔刷大小与颜色，直接在画布上拖拽使用。',
        '矩形、椭圆、直线按住拖拽绘制；文字工具会提示输入内容。',
      ],
    },
    {
      title: '图层与滤镜',
      items: [
        '右侧图层面板可新建、复制、删除图层，调整顺序与不透明度，并支持向下合并。',
        '「滤镜」菜单提供灰度、反色、亮度等效果，作用于当前选中图层。',
        '撤销 / 重做按钮可回退最近的编辑操作。',
      ],
    },
    {
      title: '导出与保存',
      items: [
        '「导出 PNG」可选择导出倍率，并会预估导出文件大小。',
        'Ctrl / Cmd + S 把当前设计保存到服务端，便于下次继续编辑。',
      ],
    },
    {
      title: '界面与设置',
      items: [
        '右下角齿轮按钮打开设置：主题（亮色 / 暗色 / 跟随系统）、字号缩放、全屏模式、减少动效、重置。',
        '右下角问号按钮随时打开本使用说明。',
        '工具快捷键在弹窗打开时会自动让位，关闭弹窗后恢复。',
      ],
    },
  ],
  shortcuts: [
    { key: 'V', desc: '选择工具' },
    { key: 'B', desc: '画笔' },
    { key: 'E', desc: '橡皮' },
    { key: 'R', desc: '矩形' },
    { key: 'O', desc: '椭圆' },
    { key: 'L', desc: '直线' },
    { key: 'T', desc: '文字' },
    { key: 'Ctrl / Cmd + Z', desc: '撤销' },
    { key: 'Ctrl / Cmd + Y', desc: '重做（也可用 Ctrl/Cmd + Shift + Z）' },
    { key: 'Ctrl / Cmd + S', desc: '保存设计到服务端' },
    { key: 'Delete / Backspace', desc: '删除当前选中图层' },
    { key: 'Esc', desc: '切回选择工具' },
    { key: 'F1', desc: '打开使用说明' },
    { key: 'Ctrl / Cmd + ,', desc: '打开设置面板' },
  ],
  faq: [
    {
      q: '编辑过程需要联网吗？',
      a: '绘制与滤镜全部在浏览器本地完成；只有「打开设计 / 保存设计」需要访问后端服务。',
    },
    {
      q: '支持导出哪些格式？',
      a: '当前支持导出 PNG，可选择导出倍率。',
    },
    {
      q: '关闭页面后未保存的内容还在吗？',
      a: '不在。请先用 Ctrl / Cmd + S 保存设计，或导出 PNG 留存。',
    },
  ],
};

export default helpContent;
