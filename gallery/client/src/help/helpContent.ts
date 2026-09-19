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
  appName: '自托管相册',
  tagline: '自托管地存储、归类与浏览你的个人照片。',
  sections: [
    {
      title: '功能',
      items: [
        '多文件上传：点击右上角「上传」，一次选择多张图片，自动读宽高。',
        '相册集：在「相册集」页新建相册，把图片加入/移出，按需整理。',
        '标签：给图片打标签，在首页按标签筛选。',
        '浏览：首页按时间倒序网格展示，点击任意图片进入灯箱（←/→ 切换，Esc 关闭）。',
      ],
    },
    {
      title: '关于数据',
      items: [
        '图片元信息存于 SQLite，图片本体落盘到服务端的 data/gallery 目录。',
        '落盘文件名由服务端短码生成，不会暴露你的原始文件名。',
      ],
    },
  ],
  faq: [
    { q: '支持哪些格式？', a: '任意图片格式均可，前端按 MIME 直传，服务端不强制转换。' },
    { q: '缩略图在哪生成？', a: 'MVP 由前端 <img> 直接缩放展示，服务端不做缩略图。' },
  ],
};

export default helpContent;
