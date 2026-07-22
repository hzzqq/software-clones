import { apiClient } from './client';
import { WidgetDTO, WidgetType, WidgetLayout, WidgetConfig } from '../types';

export interface CreateWidgetInput {
  type: WidgetType;
  title: string;
  layout: WidgetLayout;
  config: WidgetConfig;
  enabled?: boolean;
}

export interface UpdateWidgetInput {
  type?: WidgetType;
  title?: string;
  layout?: WidgetLayout;
  config?: WidgetConfig;
  enabled?: boolean;
}

export const widgetsApi = {
  list: (): Promise<WidgetDTO[]> => apiClient.get<WidgetDTO[]>('/widgets'),

  create: (input: CreateWidgetInput): Promise<WidgetDTO> =>
    apiClient.post<WidgetDTO>('/widgets', {
      type: input.type,
      title: input.title,
      layoutJson: JSON.stringify(input.layout),
      configJson: JSON.stringify(input.config),
      enabled: input.enabled === false ? 0 : 1,
    }),

  update: (id: number, patch: UpdateWidgetInput): Promise<WidgetDTO> => {
    const body: Record<string, unknown> = {};
    if (patch.type !== undefined) body.type = patch.type;
    if (patch.title !== undefined) body.title = patch.title;
    if (patch.layout !== undefined) body.layoutJson = JSON.stringify(patch.layout);
    if (patch.config !== undefined) body.configJson = JSON.stringify(patch.config);
    if (patch.enabled !== undefined) body.enabled = patch.enabled ? 1 : 0;
    return apiClient.patch<WidgetDTO>(`/widgets/${id}`, body);
  },

  remove: (id: number): Promise<null> =>
    apiClient.delete<null>(`/widgets/${id}`),
};
