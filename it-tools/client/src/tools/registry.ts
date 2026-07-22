import { ToolModule } from './types';

import HashTool from './hash/HashTool';
import Base64Tool from './base64/Base64Tool';
import JsonTool from './json/JsonTool';
import YamlTool from './yaml/YamlTool';
import RegexTool from './regex/RegexTool';
import TimestampTool from './timestamp/TimestampTool';
import UuidTool from './uuid/UuidTool';
import UrlTool from './url/UrlTool';
import ColorTool from './color/ColorTool';
import JwtTool from './jwt/JwtTool';
import CronTool from './cron/CronTool';
import DiffTool from './diff/DiffTool';
import NumberBaseTool from './number-base/NumberBaseTool';
import CaseTool from './case/CaseTool';
import QrCodeTool from './qrcode/QrCodeTool';
import PasswordTool from './password/PasswordTool';
import SqlFormatTool from './sql/SqlFormatTool';
import UnitTool from './unit/UnitTool';
import HtmlEntityTool from './html/HtmlEntityTool';
import AesTool from './encrypt/AesTool';
import MorseTool from './morse/MorseTool';
import LoremTool from './lorem/LoremTool';
import SlugTool from './slug/SlugTool';
import TokenTool from './token/TokenTool';
import JsonCsvTool from './jsoncsv/JsonCsvTool';

/**
 * Central registry of every developer tool. Adding a new tool is a single
 * entry here plus its component file — no other wiring required.
 */
export const tools: ToolModule[] = [
  { key: 'hash', title: '哈希', category: '加密与哈希', description: 'MD5 / SHA-1 / SHA-256 / SHA-512', Component: HashTool },
  { key: 'aes', title: 'AES 加解密', category: '加密与哈希', description: '使用密码的 AES 对称加密', Component: AesTool },
  { key: 'base64', title: 'Base64', category: '编码', description: 'UTF-8 安全的 Base64 编解码', Component: Base64Tool },
  { key: 'url', title: 'URL 编解码', category: '编码', description: 'encodeURI / encodeURIComponent', Component: UrlTool },
  { key: 'html', title: 'HTML 实体', category: '编码', description: 'HTML 实体编解码', Component: HtmlEntityTool },
  { key: 'morse', title: '摩斯密码', category: '编码', description: '文本与摩斯码互转', Component: MorseTool },
  { key: 'json', title: 'JSON 格式化', category: '格式化', description: '格式化与校验 JSON', Component: JsonTool },
  { key: 'yaml', title: 'YAML 转换', category: '格式化', description: 'JSON 与 YAML 互转', Component: YamlTool },
  { key: 'sql', title: 'SQL 格式化', category: '格式化', description: '轻量 SQL 美化', Component: SqlFormatTool },
  { key: 'regex', title: '正则测试', category: '文本', description: '测试正则表达式与匹配', Component: RegexTool },
  { key: 'diff', title: '文本对比', category: '文本', description: '逐行文本差异', Component: DiffTool },
  { key: 'case', title: '大小写转换', category: '文本', description: '命名风格转换', Component: CaseTool },
  { key: 'slug', title: 'Slugify', category: '文本', description: '生成 URL 友好的 slug', Component: SlugTool },
  { key: 'timestamp', title: '时间戳', category: '日期时间', description: '时间戳与日期互转', Component: TimestampTool },
  { key: 'uuid', title: 'UUID 生成', category: '生成器', description: '生成 UUID', Component: UuidTool },
  { key: 'password', title: '密码生成', category: '生成器', description: '强随机密码', Component: PasswordTool },
  { key: 'token', title: 'Token 生成', category: '生成器', description: '随机 Hex / Base62 Token', Component: TokenTool },
  { key: 'lorem', title: 'Lorem 文本', category: '生成器', description: '生成占位文本', Component: LoremTool },
  { key: 'color', title: '颜色转换', category: '转换', description: 'HEX / RGB / HSL 互转', Component: ColorTool },
  { key: 'number-base', title: '进制转换', category: '转换', description: '2/8/10/16 进制互转', Component: NumberBaseTool },
  { key: 'unit', title: '单位换算', category: '转换', description: '长度 / 重量 / 温度', Component: UnitTool },
  { key: 'jwt', title: 'JWT 解析', category: '开发', description: '解码 JWT（不校验签名）', Component: JwtTool },
  { key: 'cron', title: 'Cron 解析', category: '开发', description: '解析 5 段 Cron 表达式', Component: CronTool },
  { key: 'qrcode', title: '二维码', category: '图像', description: '生成可下载的二维码', Component: QrCodeTool },
  { key: 'jsoncsv', title: 'JSON ⇄ CSV', category: '转换', description: 'JSON 数组与 CSV 互转', Component: JsonCsvTool },
];

/** Look up a tool by its stable key. */
export function getTool(key: string): ToolModule | undefined {
  return tools.find((t) => t.key === key);
}
