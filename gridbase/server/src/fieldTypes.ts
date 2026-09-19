/**
 * 字段类型的服务端权威清单（复刻 Airtable 的可配置列类型）。
 * 客户端展示同构，见 client/src/fieldTypes.ts。
 */
export const FIELD_TYPES = [
  { id: 'text', label: '文本' },
  { id: 'number', label: '数字' },
  { id: 'select', label: '单选' },
  { id: 'checkbox', label: '勾选' },
  { id: 'date', label: '日期' },
  { id: 'url', label: '链接' },
] as const;

/** 字段类型 id 联合类型。 */
export type FieldType = (typeof FIELD_TYPES)[number]['id'];

/** 所有受支持的字段类型 id。 */
export const FIELD_TYPE_IDS: readonly FieldType[] = FIELD_TYPES.map((t) => t.id);

/** 判断任意值是否为受支持的字段类型。 */
export function isSupportedFieldType(value: unknown): value is FieldType {
  return typeof value === 'string' && (FIELD_TYPE_IDS as readonly string[]).includes(value);
}
