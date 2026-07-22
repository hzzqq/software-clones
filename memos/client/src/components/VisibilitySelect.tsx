import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { Visibility } from '../types';

interface Props {
  value: Visibility;
  onChange: (v: Visibility) => void;
  disabled?: boolean;
}

export default function VisibilitySelect({ value, onChange, disabled }: Props): JSX.Element {
  return (
    <FormControl size="small" fullWidth disabled={disabled}>
      <InputLabel id="vis-label">可见性</InputLabel>
      <Select
        labelId="vis-label"
        label="可见性"
        value={value}
        onChange={(e) => onChange(e.target.value as Visibility)}
      >
        <MenuItem value="public">公开</MenuItem>
        <MenuItem value="protected">受限</MenuItem>
        <MenuItem value="private">私有</MenuItem>
      </Select>
    </FormControl>
  );
}
