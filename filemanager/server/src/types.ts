/** File Manager 领域类型。 */

export interface FsEntry {
  name: string;
  path: string;
  isDir: boolean;
  size: number | null;
  modified: string;
}

export interface BrowseResult {
  path: string;
  parent: string;
  entries: FsEntry[];
}

export interface Share {
  id: number;
  code: string;
  path: string;
  expiry: string | null;
  createdAt: string;
}

export interface Bookmark {
  id: number;
  path: string;
  name: string;
  createdAt: string;
}
