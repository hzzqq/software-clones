import type { FieldType } from './fieldTypes';

/** 表（元数据）。 */
export interface Table {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

/** 字段（元数据，动态结构）。 */
export interface Field {
  id: number;
  tableId: number;
  name: string;
  type: FieldType;
  /** select 选项数组（JSON 反序列化后）。 */
  options: string[] | null;
  sortOrder: number;
}

/** 行（数据容器）。 */
export interface Row {
  id: number;
  tableId: number;
  createdAt: string;
  updatedAt: string;
}

/** 单元格（EAV 取值）。 */
export interface Cell {
  id: number;
  rowId: number;
  fieldId: number;
  value: string | null;
}

/** 网格视图里的一行，cells 为 fieldId -> value 的映射。 */
export interface GridRow {
  id: number;
  createdAt: string;
  updatedAt: string;
  cells: Record<number, string | null>;
}

/** 网格视图：表 + 字段定义 + 行数据。 */
export interface GridView {
  table: Table;
  fields: Field[];
  rows: GridRow[];
}
