import { apiClient } from './client';

const BASE_URL: string =
  import.meta.env.VITE_API_BASE ?? 'http://localhost:4103/api';

export const configApi = {
  /** Returns the full dashboard config serialized as YAML text. */
  exportYaml: async (): Promise<string> => {
    const res: Response = await fetch(`${BASE_URL}/config/export`);
    if (!res.ok) {
      throw new Error('导出配置失败');
    }
    return await res.text();
  },

  importYaml: (yaml: string): Promise<{ imported: number }> =>
    apiClient.post<{ imported: number }>('/config/import', { yaml }),
};
