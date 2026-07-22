import { FunctionComponent } from 'react';

/**
 * Describes a single developer tool registered in the application.
 * Tools are rendered dynamically from the registry by `key`.
 */
export interface ToolModule {
  /** Unique, stable key (used in the URL: `/tool/:key`). */
  key: string;
  /** Human-readable title shown in the sidebar and page header. */
  title: string;
  /** Grouping category used to organize the sidebar. */
  category: string;
  /** Short description shown under the title. */
  description?: string;
  /** React component that renders the tool's UI. */
  Component: FunctionComponent;
}
