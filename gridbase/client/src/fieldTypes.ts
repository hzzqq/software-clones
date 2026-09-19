/** 字段类型（与后端 src/fieldTypes.ts 同构）。 */
export type FieldType = 'text' | 'number' | 'select' | 'checkbox' | 'date' | 'url';

/** 字段类型选项（用于下拉与展示）。 */
export interface FieldTypeOption {
  id: FieldType;
  label: string;
}

export const FIELD_TYPES: FieldTypeOption[] = [
  { id: 'text', label: '文本' },
  { id: 'number', label: '数字' },
  { id: 'select', label: '单选' },
  { id: 'checkbox', label: '勾选' },
  { id: 'date', label: '日期' },
  { id: 'url', label: '链接' },
];

/** 字段类型 -> 中文标签。 */
export const FIELD_TYPE_LABELS: Record<FieldType, string> = FIELD_TYPES.reduce(
  (acc, opt) => {
    acc[opt.id] = opt.label;
    return acc;
  },
  {} as Record<FieldType, string>,
);
