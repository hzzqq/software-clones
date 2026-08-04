#!/usr/bin/env node
/**
 * 生成大厅页 hall/index.html（产物入库，防 CI 无环境时不可用）。
 *
 * 数据源：
 *   - apps.ports.json                             端口表（单一真源）
 *   - <app>/client/src/help/helpContent.ts        中文名 + 一句话简介（正则提取，零编译依赖）
 *
 * 用法：
 *   node scripts/gen-hall.mjs             # 生成
 *   node scripts/gen-hall.mjs --check     # 校验产物是否过期（CI/一致性用），过期非零退出
 *
 * 产物确定性：文件内容只取决于 apps.ports.json + 各 App 的 helpContent.ts，
 * 不内嵌生成时间戳，因此 --check 可做严格字节比对。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { APPS, ROOT } from './apps.mjs';

const HALL_DIR = path.join(ROOT, 'hall');
const HALL_FILE = path.join(HALL_DIR, 'index.html');

/**
 * 从 TS 源码中用正则提取字段值（支持单引号/双引号字符串，含 `\'` 转义）。
 * 失败返回 null，由调用方回退到默认值。
 * @param {string} src
 * @param {string} field
 * @returns {string|null}
 */
export function extractField(src, field) {
  const patterns = [
    new RegExp(`${field}\\s*:\\s*'((?:[^'\\\\]|\\\\.)*)'`),
    new RegExp(`${field}\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`),
  ];
  for (const re of patterns) {
    const m = src.match(re);
    if (m) return m[1].replace(/\\(['"\\])/g, '$1');
  }
  return null;
}

/** 汇总 12 个 App 的大厅数据（中文名 / 英文名 / 简介 / 端口）。 */
export function collectApps() {
  return APPS.map((app) => {
    const helpFile = path.join(ROOT, app.name, 'client', 'src', 'help', 'helpContent.ts');
    let appName = app.name;
    let tagline = '';
    if (fs.existsSync(helpFile)) {
      const src = fs.readFileSync(helpFile, 'utf8');
      appName = extractField(src, 'appName') ?? app.name;
      tagline = extractField(src, 'tagline') ?? '';
    }
    return { name: app.name, appName, tagline, serverPort: app.serverPort, clientPort: app.clientPort };
  });
}

/** 生成完整的 hall/index.html 内容（确定性输出，无时间戳）。 */
export function renderHtml(apps) {
  // 转义 `<` 防止 JSON 中出现 `</script>` 截断内联脚本。
  const jsonPayload = JSON.stringify({ apps }).replace(/</g, '\\u003c');
  const count = apps.length;

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>⭐ 软件克隆大厅 · Software Clones</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
    background: #0a0e17;
    color: #e6e9f0;
    min-height: 100vh;
    background-image:
      radial-gradient(1200px 600px at 15% -10%, rgba(88, 101, 242, 0.18), transparent 60%),
      radial-gradient(1000px 500px at 90% 0%, rgba(34, 211, 238, 0.12), transparent 55%),
      radial-gradient(800px 600px at 50% 110%, rgba(129, 140, 248, 0.10), transparent 60%);
    background-attachment: fixed;
  }
  .wrap { max-width: 1280px; margin: 0 auto; padding: 48px 32px 64px; }
  header { text-align: center; margin-bottom: 40px; }
  h1 {
    font-size: 40px; font-weight: 800; letter-spacing: 1px;
    background: linear-gradient(90deg, #a5b4fc, #67e8f9, #a5b4fc);
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }
  .subtitle { margin-top: 12px; font-size: 16px; color: #9aa3b5; }
  .toolbar { margin-top: 20px; display: flex; justify-content: center; align-items: center; gap: 16px; }
  #summary { font-size: 14px; color: #7f8aa0; font-variant-numeric: tabular-nums; }
  #refresh {
    background: rgba(255, 255, 255, 0.06); color: #c9d1e0;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 999px; padding: 6px 16px; font-size: 13px; cursor: pointer;
    transition: background 0.2s ease;
  }
  #refresh:hover { background: rgba(255, 255, 255, 0.12); }
  .grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 20px;
  }
  .card {
    display: flex; flex-direction: column; gap: 6px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 20px;
    text-decoration: none; color: inherit;
    transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
  }
  .card:hover {
    transform: translateY(-3px);
    border-color: rgba(129, 140, 248, 0.55);
    background: rgba(255, 255, 255, 0.06);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(129, 140, 248, 0.2);
  }
  .card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .card-num { font-size: 12px; color: #5b6478; font-variant-numeric: tabular-nums; letter-spacing: 1px; }
  .status { display: flex; align-items: center; gap: 7px; }
  .dot { width: 9px; height: 9px; border-radius: 50%; background: #5b6478; flex: none; }
  .dot.online { background: #34d399; box-shadow: 0 0 8px rgba(52, 211, 153, 0.8); }
  .dot.offline { background: #6b7280; }
  .status-label { font-size: 12px; color: #8b93a7; }
  .card-online .status-label { color: #6ee7b7; }
  .app-name { font-size: 20px; font-weight: 700; color: #f1f4fa; }
  .app-en {
    font-size: 12px; color: #6b7488;
    font-family: 'SF Mono', Consolas, 'Courier New', monospace;
    letter-spacing: 0.5px; text-transform: uppercase;
  }
  .tagline { font-size: 14px; line-height: 1.6; color: #a9b1c3; margin-top: 4px; flex: 1; }
  .ports {
    font-size: 12px; color: #7f8aa0; font-variant-numeric: tabular-nums;
    margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.06);
  }
  footer { text-align: center; margin-top: 48px; font-size: 12px; color: #5b6478; line-height: 1.8; }
  code { background: rgba(255, 255, 255, 0.07); padding: 1px 6px; border-radius: 6px; font-size: 12px; }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>⭐ 软件克隆大厅 · Software Clones</h1>
    <p class="subtitle">${count} 个真实可用的全栈克隆 App，点击卡片进入</p>
    <div class="toolbar">
      <span id="summary"></span>
      <button id="refresh" type="button">重新检测</button>
    </div>
  </header>
  <main class="grid" id="grid"></main>
  <footer>
    端口分配见 <code>apps.ports.json</code> · 仅启动大厅：<code>npm run dev:hall</code> ·
    全部启动（含自动打开本页）：<code>npm run dev:all</code><br />
    本页由 <code>npm run hall:gen</code> 生成，离线卡片点击后打不开属正常现象（对应 App 未启动）。
  </footer>
</div>

<script type="application/json" id="apps-data">${jsonPayload}</script>
<script>
(function () {
  'use strict';

  function readApps() {
    try {
      var el = document.getElementById('apps-data');
      if (!el) return [];
      var data = JSON.parse(el.textContent);
      return Array.isArray(data.apps) ? data.apps : [];
    } catch (e) {
      console.error('apps-data 解析失败:', e);
      return [];
    }
  }

  function buildCard(app, i) {
    var card = document.createElement('a');
    card.className = 'card';
    card.id = 'card-' + app.name;
    card.href = 'http://localhost:' + app.clientPort + '/';
    card.target = '_blank';
    card.rel = 'noopener';

    var num = document.createElement('div');
    num.className = 'card-num';
    num.textContent = String(i + 1).padStart(2, '0');

    var dot = document.createElement('span');
    dot.className = 'dot';

    var label = document.createElement('span');
    label.className = 'status-label';
    label.textContent = '检测中';

    var status = document.createElement('div');
    status.className = 'status';
    status.appendChild(dot);
    status.appendChild(label);

    var top = document.createElement('div');
    top.className = 'card-top';
    top.appendChild(num);
    top.appendChild(status);

    var name = document.createElement('h3');
    name.className = 'app-name';
    name.textContent = app.appName || app.name;

    var en = document.createElement('div');
    en.className = 'app-en';
    en.textContent = app.name;

    var tag = document.createElement('p');
    tag.className = 'tagline';
    tag.textContent = app.tagline || '（暂无简介）';

    var ports = document.createElement('div');
    ports.className = 'ports';
    ports.textContent = '前端 :' + app.clientPort + '  ·  后端 :' + app.serverPort;

    card.appendChild(top);
    card.appendChild(name);
    card.appendChild(en);
    card.appendChild(tag);
    card.appendChild(ports);
    return card;
  }

  var apps = readApps();
  var grid = document.getElementById('grid');
  var summaryEl = document.getElementById('summary');
  var total = apps.length;
  var done = 0;
  var online = 0;

  var cards = apps.map(function (app, i) {
    var card = buildCard(app, i);
    grid.appendChild(card);
    return {
      app: app,
      card: card,
      dot: card.querySelector('.dot'),
      label: card.querySelector('.status-label'),
      finished: false,
    };
  });

  function updateSummary() {
    if (total === 0) {
      summaryEl.textContent = '未读取到 App 数据';
      return;
    }
    summaryEl.textContent = '已检测 ' + done + '/' + total + ' · 在线 ' + online + ' · 离线 ' + (done - online);
  }
  updateSummary();

  function finish(item, ok) {
    if (item.finished) return;
    item.finished = true;
    if (ok) {
      item.dot.classList.add('online');
      item.dot.classList.remove('offline');
      item.label.textContent = '在线';
      item.card.classList.add('card-online');
      online += 1;
    } else {
      item.dot.classList.add('offline');
      item.dot.classList.remove('online');
      item.label.textContent = '离线';
      item.card.classList.remove('card-online');
    }
    done += 1;
    updateSummary();
  }

  function probe(item) {
    // 探活：vite dev server 默认 Access-Control-Allow-Origin: *，跨域可通。
    // fetch 失败会抛 TypeError、超时会抛 AbortError，必须 try/catch + .catch 双保险，
    // 不允许任何未捕获错误。
    try {
      fetch('http://localhost:' + item.app.clientPort + '/', {
        signal: AbortSignal.timeout(1500),
        cache: 'no-store',
      })
        .then(function (res) { finish(item, !!res.ok); })
        .catch(function () { finish(item, false); });
    } catch (e) {
      finish(item, false);
    }
  }

  function resetProbes() {
    done = 0;
    online = 0;
    cards.forEach(function (item) {
      item.finished = false;
      item.dot.className = 'dot';
      item.label.textContent = '检测中';
      item.card.classList.remove('card-online');
      probe(item);
    });
    updateSummary();
  }

  cards.forEach(probe);

  var refresh = document.getElementById('refresh');
  if (refresh) refresh.addEventListener('click', resetProbes);
})();
</script>
</body>
</html>
`;
}

// ── CLI 入口 ──
const argv = process.argv.slice(2);
const checkMode = argv.includes('--check');

const apps = collectApps();
if (apps.length !== APPS.length) {
  console.error(`collectApps 结果数量异常: ${apps.length} != ${APPS.length}`);
  process.exit(1);
}

const html = renderHtml(apps);
fs.mkdirSync(HALL_DIR, { recursive: true });

if (checkMode) {
  const current = fs.existsSync(HALL_FILE) ? fs.readFileSync(HALL_FILE, 'utf8') : '';
  if (current === html) {
    console.log(`hall/index.html 是最新的（${apps.length} 个 App）。`);
    process.exit(0);
  }
  console.error('hall/index.html 已过期：请运行 node scripts/gen-hall.mjs 重新生成。');
  process.exit(1);
}

fs.writeFileSync(HALL_FILE, html, 'utf8');
console.log(`已生成 hall/index.html（${apps.length} 个 App，${(html.length / 1024).toFixed(1)} KB）。`);
