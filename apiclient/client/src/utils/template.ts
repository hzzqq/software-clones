/**
 * 模板变量插值工具：支持在 URL / 查询参数 / 请求头 / 请求体中使用 `{{name}}` 占位符，
 * 发送前用「当前激活环境」的变量表统一替换。
 *
 * 设计约定：
 *  - 变量名允许 字母 / 数字 / 下划线 / 点 / 连字符，且允许两侧空白：`{{ base_url }}`。
 *  - 未定义的变量**保持原样**（不替换成空串），并可通过 missingTemplateVars 提示用户，
 *    避免「静默拼出一个错误 URL」这类难以排查的问题。
 *  - 全部为纯函数，不修改入参，便于单元测试。
 */

/** 每次调用新建正则，避免共享 lastIndex 造成的跨调用状态污染。 */
function varPattern(): RegExp {
  return /\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g;
}

/** 提取文本中出现的变量名（去重，保持首次出现顺序）。 */
export function extractTemplateVars(text: string): string[] {
  if (!text) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  const re = varPattern();
  while ((m = re.exec(text)) !== null) {
    const name = m[1];
    if (!seen.has(name)) {
      seen.add(name);
      out.push(name);
    }
  }
  return out;
}

/** 用变量表替换文本中的 `{{name}}`；未定义的变量原样保留。 */
export function interpolateTemplate(text: string, vars: Record<string, string> = {}): string {
  if (!text) return text ?? '';
  return text.replace(varPattern(), (whole: string, name: string): string => {
    if (!Object.prototype.hasOwnProperty.call(vars, name)) return whole;
    const v = vars[name];
    return v == null ? '' : String(v);
  });
}

/** 返回文本中「引用了但变量表里没有」的变量名（去重，保持出现顺序）。 */
export function missingTemplateVars(text: string, vars: Record<string, string> = {}): string[] {
  return extractTemplateVars(text).filter(
    (name) => !Object.prototype.hasOwnProperty.call(vars, name),
  );
}

/** 对键值表的「键和值」同时做插值，返回新对象。 */
export function interpolateRecord(
  record: Record<string, string>,
  vars: Record<string, string> = {},
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(record ?? {})) {
    out[interpolateTemplate(k, vars)] = interpolateTemplate(v, vars);
  }
  return out;
}

/** 一次请求中所有可含变量的部分。 */
export interface TemplateTarget {
  url: string;
  params: Record<string, string>;
  headers: Record<string, string>;
  body: string;
}

/** 对整个请求草稿做插值，返回新的目标对象（不修改入参）。 */
export function interpolateTarget(
  target: TemplateTarget,
  vars: Record<string, string> = {},
): TemplateTarget {
  return {
    url: interpolateTemplate(target.url, vars),
    params: interpolateRecord(target.params, vars),
    headers: interpolateRecord(target.headers, vars),
    body: interpolateTemplate(target.body, vars),
  };
}

/** 汇总整个请求草稿中缺失的变量名（去重，保持 url→params→headers→body 顺序）。 */
export function missingVarsOf(
  target: TemplateTarget,
  vars: Record<string, string> = {},
): string[] {
  const pieces: string[] = [
    target.url ?? '',
    ...Object.entries(target.params ?? {}).flatMap(([k, v]) => [k, v]),
    ...Object.entries(target.headers ?? {}).flatMap(([k, v]) => [k, v]),
    target.body ?? '',
  ];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const piece of pieces) {
    for (const name of missingTemplateVars(piece, vars)) {
      if (!seen.has(name)) {
        seen.add(name);
        out.push(name);
      }
    }
  }
  return out;
}

/**
 * 将 `key=value` 多行文本解析为变量表。
 * - 兼容 CRLF；忽略空行与以 `#` 开头的注释行。
 * - 只按**第一个** `=` 分割，值中可再含 `=`。
 * - 键为空的行忽略；重复键后者覆盖前者。
 */
export function parseVariablesText(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of (text ?? '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim();
    if (!k) continue;
    out[k] = v;
  }
  return out;
}

/** 将变量表序列化为 `key=value` 多行文本（键按字典序，便于稳定 diff）。 */
export function variablesToText(vars: Record<string, string>): string {
  return Object.keys(vars ?? {})
    .sort((a, b) => a.localeCompare(b))
    .map((k) => `${k}=${vars[k]}`)
    .join('\n');
}
