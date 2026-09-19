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
  /** select 选项数组。 */
  options: string[] | null;
  sortOrder: number;
}

/** 网格视图中的一行；cells 为 fieldId -> value 映射。 */
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
