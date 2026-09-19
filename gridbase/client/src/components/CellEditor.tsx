import { useEffect, useState } from 'react';
import { Checkbox, Link as MuiLink, MenuItem, TextField } from '@mui/material';
import type { Field } from '../types';

interface CellEditorProps {
  field: Field;
  value: string | null;
  /** 提交（保存）单元格值。失焦 / 离散操作时触发。 */
  onCommit: (value: string | null) => void;
}

/**
 * 按字段类型渲染不同的单元格编辑器：
 *  - text / number / url：文本输入，失焦保存
 *  - select：下拉，选中即时保存
 *  - checkbox：勾选，切换即时保存
 *  - date：日期输入，失焦保存
 */
export default function CellEditor({ field, value, onCommit }: CellEditorProps): JSX.Element {
  const [local, setLocal] = useState<string>(value ?? '');

  // 外部值变化（如行切换 / 保存回写）时同步本地输入。
  useEffect(() => {
    setLocal(value ?? '');
  }, [value]);

  if (field.type === 'checkbox') {
    const checked = local === 'true' || local === '1';
    return (
      <Checkbox
        checked={checked}
        onChange={(e) => {
          const next = e.target.checked ? 'true' : 'false';
          setLocal(next);
          onCommit(next);
        }}
      />
    );
  }

  if (field.type === 'select') {
    const options = field.options ?? [];
    return (
      <TextField
        select
        size="small"
        fullWidth
        value={local}
        onChange={(e) => {
          const v = e.target.value;
          setLocal(v);
          onCommit(v || null);
        }}
        sx={{ minWidth: 140 }}
      >
        <MenuItem value="">—</MenuItem>
        {options.map((opt) => (
          <MenuItem key={opt} value={opt}>
            {opt}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  if (field.type === 'url') {
    return (
      <TextField
        size="small"
        fullWidth
        placeholder="https://"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => onCommit(local.trim() === '' ? null : local.trim())}
        InputProps={{
          endAdornment: local ? (
            <MuiLink
              href={local}
              target="_blank"
              rel="noreferrer"
              sx={{ fontSize: 12, ml: 1, whiteSpace: 'nowrap' }}
            >
              打开
            </MuiLink>
          ) : null,
        }}
      />
    );
  }

  const inputType = field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text';

  return (
    <TextField
      type={inputType}
      size="small"
      fullWidth
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => onCommit(local === '' ? null : local)}
      InputLabelProps={field.type === 'date' ? { shrink: true } : undefined}
    />
  );
}
