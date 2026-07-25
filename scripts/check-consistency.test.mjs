#!/usr/bin/env node
/**
 * check-consistency.test.mjs — consistency-rules.mjs 纯函数单元测试（零依赖，纯 Node 运行）。
 *
 * 用 os.tmpdir() 建临时仓库沙盒，构造「有 spec / 无 spec」等场景，断言规则函数行为正确，
 * 保证校验器真正能检测漂移，而非永远绿。
 *
 * 运行：node scripts/check-consistency.test.mjs
 * 退出码：0 通过，1 失败（便于接到 CI）。
 */
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { findE2ESpecs, isAppDir, parsePlaywrightApps, parseYamlMatrixApps, findBrokenDocLinks, hasClientTestScript, hasClientTestFile, findClientTestFiles, missingEnvKeys, findAllMarkdownFiles, parseApps, findDuplicatePorts, findDuplicateNames, checkBuildConfig, missingSharedTemplateFiles, missingAppDirs, findUnregisteredApps, invalidEnvValues, hasClientIndexHtml, hasServerEntry } from './consistency-rules.mjs';

let passed = 0;
let failed = 0;
function assert(name, cond) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}`);
  }
}

const sandbox = join(tmpdir(), `consistency-test-${process.pid}`);
rmSync(sandbox, { recursive: true, force: true });
mkdirSync(join(sandbox, 'e2e', 'demo'), { recursive: true });
mkdirSync(join(sandbox, 'demo', 'client'), { recursive: true });
mkdirSync(join(sandbox, 'demo', 'server'), { recursive: true });
writeFileSync(join(sandbox, 'demo', 'client', 'package.json'), '{}');
writeFileSync(join(sandbox, 'demo', 'server', 'package.json'), '{}');

console.log('consistency-rules 单元测试:');

// isAppDir：全栈目录识别
assert('isAppDir 识别全栈 App', isAppDir(sandbox, 'demo') === true);
assert('isAppDir 忽略 . 开头目录', isAppDir(sandbox, '.git') === false);

// findE2ESpecs：空目录 → 无 spec（应被校验器判为 FAIL）
assert('findE2ESpecs 空目录返回 []', findE2ESpecs(sandbox, 'demo').length === 0);
// 写入真实 spec 后 → 命中
writeFileSync(join(sandbox, 'e2e', 'demo', 'demo.spec.ts'), '// smoke');
const specs = findE2ESpecs(sandbox, 'demo');
assert('findE2ESpecs 命中 *.spec.ts', specs.length === 1 && specs[0] === 'demo.spec.ts');
// 非 spec 文件不计
writeFileSync(join(sandbox, 'e2e', 'demo', 'helper.ts'), '// not a spec');
assert('findE2ESpecs 忽略非 .spec.ts', findE2ESpecs(sandbox, 'demo').length === 1);
// 缺失目录返回 []
assert('findE2ESpecs 缺失目录返回 []', findE2ESpecs(sandbox, 'nope').length === 0);

// hasClientTestScript：client/package.json 必须声明 test 脚本（沙盒沿用已创建的 sandbox）
mkdirSync(join(sandbox, 'app1', 'client'), { recursive: true });
writeFileSync(join(sandbox, 'app1', 'client', 'package.json'), JSON.stringify({ scripts: { test: 'vitest' } }));
mkdirSync(join(sandbox, 'app2', 'client'), { recursive: true });
writeFileSync(join(sandbox, 'app2', 'client', 'package.json'), JSON.stringify({ scripts: { dev: 'vite' } })); // 无 test
mkdirSync(join(sandbox, 'app3', 'client'), { recursive: true });
writeFileSync(join(sandbox, 'app3', 'client', 'package.json'), 'not-json'); // 损坏
assert('hasClientTestScript 命中 test 脚本', hasClientTestScript(sandbox, 'app1') === true);
assert('hasClientTestScript 无 test 返回 false', hasClientTestScript(sandbox, 'app2') === false);
assert('hasClientTestScript 损坏 package.json 返回 false', hasClientTestScript(sandbox, 'app3') === false);
assert('hasClientTestScript 缺失目录返回 false', hasClientTestScript(sandbox, 'nope') === false);

// hasClientTestFile / findClientTestFiles：声明了 test 脚本，但必须有真实用例文件才算安全网
mkdirSync(join(sandbox, 'app4', 'client', 'src'), { recursive: true });
writeFileSync(join(sandbox, 'app4', 'client', 'package.json'), JSON.stringify({ scripts: { test: 'vitest' } }));
writeFileSync(join(sandbox, 'app4', 'client', 'src', 'util.test.ts'), '// case');
assert('hasClientTestFile 命中用例文件', hasClientTestFile(sandbox, 'app4') === true);
assert('findClientTestFiles 递归列出用例', findClientTestFiles(sandbox, 'app4').length === 1);
// .tsx 用例与嵌套目录也应命中
mkdirSync(join(sandbox, 'app4', 'client', 'src', 'deep'), { recursive: true });
writeFileSync(join(sandbox, 'app4', 'client', 'src', 'deep', 'x.spec.tsx'), '// case');
assert('findClientTestFiles 命中嵌套 .spec.tsx', findClientTestFiles(sandbox, 'app4').length === 2);
// node_modules 内的用例不计（避免误报）
mkdirSync(join(sandbox, 'app4', 'client', 'node_modules', 'dep'), { recursive: true });
writeFileSync(join(sandbox, 'app4', 'client', 'node_modules', 'dep', 'dep.test.ts'), '// ignore');
assert('findClientTestFiles 跳过 node_modules', findClientTestFiles(sandbox, 'app4').length === 2);
// 有脚本但零用例 → 空心安全网（校验器应判 FAIL）
mkdirSync(join(sandbox, 'app5', 'client'), { recursive: true });
writeFileSync(join(sandbox, 'app5', 'client', 'package.json'), JSON.stringify({ scripts: { test: 'vitest' } }));
assert('hasClientTestFile 零用例返回 false', hasClientTestFile(sandbox, 'app5') === false);

// parsePlaywrightApps：从 APPS 数组精确提取 name
const pwText = `
export const APPS: AppSpec[] = [
  { name: 'markdown', dir: 'markdown/client', port: 5180 },
  { name: 'it-tools', dir: 'it-tools/client', port: 5185 },
];
// 注释里的 name: 'ghost' 不应被误取（需位于 APPS 数组块内）
`;
const pwApps = parsePlaywrightApps(pwText);
assert('parsePlaywrightApps 提取 2 个应用', pwApps.length === 2);
assert('parsePlaywrightApps 含 markdown', pwApps.includes('markdown'));
assert('parsePlaywrightApps 忽略块外注释', !pwApps.includes('ghost'));
assert('parsePlaywrightApps 无 APPS 块返回 []', parsePlaywrightApps('const x = 1;').length === 0);

// parseYamlMatrixApps：从 matrix.app 列表精确提取
const ymlText = `
jobs:
  e2e:
    strategy:
      matrix:
        app:
          - markdown
          - it-tools
        node:
          - '22'
`;
const ymlApps = parseYamlMatrixApps(ymlText);
assert('parseYamlMatrixApps 提取 2 个应用', ymlApps.length === 2);
assert('parseYamlMatrixApps 含 it-tools', ymlApps.includes('it-tools'));
assert('parseYamlMatrixApps 不含 node 列表', !ymlApps.includes('22'));
assert('parseYamlMatrixApps 无 matrix 返回 []', parseYamlMatrixApps('app: []').length === 0);

// findBrokenDocLinks：内部相对链接腐化检测
const docGood = 'see [client](demo/client/package.json) and [server](demo/server/package.json)';
const docBad = 'broken [x](docs/MISSING.md) and [y](../nope/zzz.md)';
assert('findBrokenDocLinks 全有效返回 []', findBrokenDocLinks(docGood, sandbox).length === 0);
const broken = findBrokenDocLinks(docBad, sandbox);
assert('findBrokenDocLinks 捕获 2 个失效链接', broken.length === 2);
assert('findBrokenDocLinks 报告失效目标', broken.includes('docs/MISSING.md') && broken.includes('../nope/zzz.md'));
// 忽略外链/锚点
const docExternal = 'repo [gh](https://github.com/x/y) and [top](#top) are fine';
assert('findBrokenDocLinks 忽略外链与锚点', findBrokenDocLinks(docExternal, sandbox).length === 0);

// 清理临时沙盒
rmSync(sandbox, { recursive: true, force: true });

// missingEnvKeys：server/.env.example 必须含 PORT / CORS_ORIGIN
mkdirSync(join(sandbox, 'envapp', 'server'), { recursive: true });
writeFileSync(join(sandbox, 'envapp', 'server', '.env.example'), 'PORT=4100\nCORS_ORIGIN=http://localhost:5173\nDB_PATH=./data/app.db\n');
assert('missingEnvKeys 齐全返回 []', missingEnvKeys(sandbox, 'envapp').length === 0);
// 缺 CORS_ORIGIN
writeFileSync(join(sandbox, 'envapp', 'server', '.env.example'), 'PORT=4100\n');
assert('missingEnvKeys 缺键返回缺失项', missingEnvKeys(sandbox, 'envapp').includes('CORS_ORIGIN'));
// 文件不存在视为缺全部
assert('missingEnvKeys 缺失文件返回全部', missingEnvKeys(sandbox, 'nope').length === 2);
// invalidEnvValues：键存在但值非法也应被捕获（missingEnvKeys 只查存在性）
mkdirSync(join(sandbox, 'envbad', 'server'), { recursive: true });
writeFileSync(join(sandbox, 'envbad', 'server', '.env.example'), 'PORT=abc\nCORS_ORIGIN=localhost\n');
assert('invalidEnvValues 捕获非法 PORT', invalidEnvValues(sandbox, 'envbad').some((s) => s.includes('PORT')));
assert('invalidEnvValues 捕获非法 CORS_ORIGIN', invalidEnvValues(sandbox, 'envbad').some((s) => s.includes('CORS_ORIGIN')));
mkdirSync(join(sandbox, 'envgood', 'server'), { recursive: true });
writeFileSync(join(sandbox, 'envgood', 'server', '.env.example'), 'PORT=4100\nCORS_ORIGIN=http://localhost:5173\n');
assert('invalidEnvValues 合法配置返回 []', invalidEnvValues(sandbox, 'envgood').length === 0);
mkdirSync(join(sandbox, 'envstar', 'server'), { recursive: true });
writeFileSync(join(sandbox, 'envstar', 'server', '.env.example'), 'PORT=4100\nCORS_ORIGIN=*\n');
assert('invalidEnvValues 接受 * 通配来源', invalidEnvValues(sandbox, 'envstar').length === 0);

// hasClientIndexHtml / hasServerEntry：入口文件是 app 可挂载/可启动的硬门槛
mkdirSync(join(sandbox, 'boota', 'client'), { recursive: true });
mkdirSync(join(sandbox, 'boota', 'server', 'src'), { recursive: true });
writeFileSync(join(sandbox, 'boota', 'client', 'index.html'), '<html></html>');
writeFileSync(join(sandbox, 'boota', 'server', 'src', 'index.ts'), '// entry');
assert('hasClientIndexHtml 命中入口', hasClientIndexHtml(sandbox, 'boota') === true);
assert('hasServerEntry 命中入口', hasServerEntry(sandbox, 'boota') === true);
mkdirSync(join(sandbox, 'bootb', 'client'), { recursive: true });
mkdirSync(join(sandbox, 'bootb', 'server', 'src'), { recursive: true });
assert('hasClientIndexHtml 缺失返回 false', hasClientIndexHtml(sandbox, 'bootb') === false);
assert('hasServerEntry 缺失返回 false', hasServerEntry(sandbox, 'bootb') === false);
assert('hasClientIndexHtml 缺失目录返回 false', hasClientIndexHtml(sandbox, 'nope') === false);

// findAllMarkdownFiles：递归收集所有 .md（忽略 .git / node_modules）
mkdirSync(join(sandbox, 'docs'), { recursive: true });
mkdirSync(join(sandbox, '.git'), { recursive: true });
mkdirSync(join(sandbox, 'node_modules'), { recursive: true });
writeFileSync(join(sandbox, 'README.md'), '# hi');
writeFileSync(join(sandbox, 'docs', 'guide.md'), '# g');
writeFileSync(join(sandbox, '.git', 'x.md'), '# ignore');
writeFileSync(join(sandbox, 'node_modules', 'y.md'), '# ignore');
const mdFiles = findAllMarkdownFiles(sandbox);
assert('findAllMarkdownFiles 收集 2 个 .md', mdFiles.length === 2);
assert('findAllMarkdownFiles 忽略 .git/node_modules', !mdFiles.some((f) => f.includes('.git') || f.includes('node_modules')));

// parseApps：字段顺序无关的稳健解析（旧实现要求 name→dir→port 固定顺序）
const pwMixed = `
export const APPS: AppSpec[] = [
  { port: 5180, name: 'markdown', dir: 'markdown/client' },
  { name: 'it-tools', dir: 'it-tools/client', port: 5185 },
  { name: 'dup', dir: 'dup/client', port: 5185 },
];
`;
const apps = parseApps(pwMixed);
assert('parseApps 解析 3 个对象', apps.length === 3);
assert('parseApps 字段乱序仍可解析', apps[0].name === 'markdown' && apps[0].port === 5180);
assert('parseApps 无 name 的对象被忽略', !apps.some((a) => a.name === 'ghost'));
// 重复端口 / 重复名称检测
const dupP = findDuplicatePorts(apps);
assert('findDuplicatePorts 命中 5185', dupP.includes(5185) && dupP.length === 1);
const dupN = findDuplicateNames([{ name: 'a' }, { name: 'a' }, { name: 'b' }]);
assert('findDuplicateNames 命中重复名', dupN.includes('a') && dupN.length === 1);
assert('findDuplicatePorts 无重复返回 []', findDuplicatePorts([{ name: 'a', port: 1 }, { name: 'b', port: 2 }]).length === 0);
assert('findDuplicateNames 无重复返回 []', findDuplicateNames([{ name: 'a' }, { name: 'b' }]).length === 0);

// missingAppDirs：APPS 登记的 dir 必须真实存在（防 E2E webServer 指向丢失/改名的目录）
mkdirSync(join(sandbox, 'dirapp', 'client'), { recursive: true });
const appsForDir = [
  { name: 'dirapp', dir: 'dirapp/client' },
  { name: 'gone', dir: 'ghost/client' },
];
const missingDirs = missingAppDirs(sandbox, appsForDir);
assert('missingAppDirs 命中不存在的 dir', missingDirs.length === 1);
assert('missingAppDirs 报告正确条目', missingDirs[0] && missingDirs[0].name === 'gone');
assert('missingAppDirs 全部存在返回 []', missingAppDirs(sandbox, [{ name: 'dirapp', dir: 'dirapp/client' }]).length === 0);
assert('missingAppDirs 忽略无 dir 的条目', missingAppDirs(sandbox, [{ name: 'x' }]).length === 0);

// findUnregisteredApps：真实 App 必须登记在注册清单（反向幽灵，目录 ↔ 注册 双向一致）
assert('findUnregisteredApps 命中未注册', findUnregisteredApps(['a', 'b', 'c'], ['a', 'b']).includes('c'));
assert('findUnregisteredApps 全部已注册返回 []', findUnregisteredApps(['a', 'b'], ['a', 'b', 'x']).length === 0);

console.log(`\n通过: ${passed}  失败: ${failed}`);
if (failed > 0) {
  console.log('单元测试未通过 (exit 1)');
  process.exit(1);
}
console.log('✅ 单元测试全部通过 (exit 0)');
