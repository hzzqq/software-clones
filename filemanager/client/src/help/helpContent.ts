interface HelpSection {
  title: string;
  items: string[];
}

interface HelpContent {
  appName: string;
  tagline: string;
  sections: HelpSection[];
  faq?: { q: string; a: string }[];
}

export const helpContent: HelpContent = {
  appName: '文件管理器',
  tagline: '在浏览器里浏览、预览与分享服务端目录的文件。',
  sections: [
    {
      title: '功能',
      items: [
        '目录树浏览：进入文件夹、返回上一级，列表展示文件/文件夹的名称、大小、修改时间。',
        '预览：文本文件直接查看内容；图片直接在线预览。',
        '下载：任意文件可下载（附件形式，中文名安全）。',
        '分享短链：对任意文件生成短码，通过 /api/s/:code 分享给他人。',
        '书签：把常用目录加入书签，一键直达。',
      ],
    },
    {
      title: '关于安全',
      items: [
        '所有访问被限制在「虚拟根目录」（服务端 data/fm-root/）之内。',
        '任何包含 ../ 的越界路径请求都会被拒绝，无法读到宿主机其它位置。',
      ],
    },
  ],
  faq: [
    { q: '为什么根目录是空的？', a: '把文件放进服务端的 server/data/fm-root/ 后刷新页面即可看到。' },
    { q: '能上传/新建文件吗？', a: 'MVP 聚焦浏览/预览/分享，暂不支持上传或新建。' },
  ],
};

export default helpContent;
