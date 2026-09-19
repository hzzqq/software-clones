import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { FIELD_TYPES } from '../fieldTypes';
import type { Field, FieldType } from '../types';

export interface FieldFormValues {
  name: string;
  type: FieldType;
  options: string;
}

interface FieldEditorDialogProps {
  open: boolean;
  /** 传入则为编辑模式，否则为新增模式。 */
  field: Field | null;
  onClose: () => void;
  onSaved: (values: { name: string; type: FieldType; options: string[] | null }) => void;
}

/**
 * 字段新增 / 编辑对话框。select 类型的选项以逗号分隔的文本录入。
 */
export default function FieldEditorDialog({
  open,
  field,
  onClose,
  onSaved,
}: FieldEditorDialogProps): JSX.Element {
  const [name, setName] = useState<string>('');
  const [type, setType] = useState<FieldType>('text');
  const [options, setOptions] = useState<string>('');

  // 打开时根据编辑 / 新增填充初始值。
  useEffect(() => {
    if (!open) {
      return;
    }
    if (field) {
      setName(field.name);
      setType(field.type);
      setOptions((field.options ?? []).join(', '));
    } else {
      setName('');
      setType('text');
      setOptions('');
    }
  }, [open, field]);

  const handleSave = (): void => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }
    const opts: string[] | null =
      type === 'select'
        ? options
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : null;
    onSaved({ name: trimmedName, type, options: opts });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{field ? '编辑字段' : '添加字段'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <TextField
            label="字段名称"
            size="small"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <FormControl size="small" fullWidth>
            <InputLabel id="field-type-label">类型</InputLabel>
            <Select
              labelId="field-type-label"
              label="类型"
              value={type}
              onChange={(e) => setType(e.target.value as FieldType)}
            >
              {FIELD_TYPES.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {type === 'select' ? (
            <TextField
              label="选项（逗号分隔）"
              size="small"
              fullWidth
              placeholder="例如：高, 中, 低"
              value={options}
              onChange={(e) => setOptions(e.target.value)}
            />
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>
          取消
        </Button>
        <Button variant="contained" disabled={!name.trim()} onClick={handleSave}>
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}
