import { apiClient } from './client';
import type { Table, Field, GridView, FieldType } from '../types';

/** gridbase 后端 API 封装。 */
export const gridApi = {
  // 表
  listTables: (): Promise<Table[]> => apiClient.get<Table[]>('/tables'),
  createTable: (name: string): Promise<Table> => apiClient.post<Table>('/tables', { name }),
  getTable: (id: number): Promise<Table> => apiClient.get<Table>(`/tables/${id}`),
  renameTable: (id: number, name: string): Promise<Table> =>
    apiClient.patch<Table>(`/tables/${id}`, { name }),
  deleteTable: (id: number): Promise<{ id: number }> =>
    apiClient.delete<{ id: number }>(`/tables/${id}`),

  // 字段
  listFields: (tableId: number): Promise<Field[]> =>
    apiClient.get<Field[]>(`/tables/${tableId}/fields`),
  addField: (
    tableId: number,
    body: { name: string; type: FieldType; options?: string[] | null },
  ): Promise<Field> => apiClient.post<Field>(`/tables/${tableId}/fields`, body),
  updateField: (
    id: number,
    body: Partial<{ name: string; type: FieldType; options: string[] | null; sortOrder: number }>,
  ): Promise<Field> => apiClient.patch<Field>(`/fields/${id}`, body),
  deleteField: (id: number): Promise<{ id: number }> =>
    apiClient.delete<{ id: number }>(`/fields/${id}`),

  // 行 + 网格
  getGrid: (tableId: number): Promise<GridView> =>
    apiClient.get<GridView>(`/tables/${tableId}/rows`),
  addRow: (
    tableId: number,
  ): Promise<{ id: number; tableId: number; createdAt: string; updatedAt: string }> =>
    apiClient.post<{ id: number; tableId: number; createdAt: string; updatedAt: string }>(
      `/tables/${tableId}/rows`,
      {},
    ),
  deleteRow: (id: number): Promise<{ id: number }> =>
    apiClient.delete<{ id: number }>(`/rows/${id}`),

  // 单元格
  setCell: (
    rowId: number,
    fieldId: number,
    value: string | null,
  ): Promise<{ rowId: number; fieldId: number; value: string | null }> =>
    apiClient.put<{ rowId: number; fieldId: number; value: string | null }>('/cells', {
      rowId,
      fieldId,
      value,
    }),
};
