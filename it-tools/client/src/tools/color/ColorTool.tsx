import { useState } from 'react';
import { Alert, Box, Button, Paper, Stack, TextField } from '@mui/material';
import { copyToClipboard } from '../../utils/format';

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): Rgb {
  let h: string = hex.replace('#', '');
  if (h.length === 3) {
    h = h.split('').map((c) => c + c).join('');
  }
  const num: number = parseInt(h, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex({ r, g, b }: Rgb): string {
  const toHex = (v: number): string => v.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** Converts between HEX, RGB and HSL color representations. */
export default function ColorTool(): JSX.Element {
  const [hex, setHex] = useState<string>('#3b82f6');
  const [error, setError] = useState<string>('');

  const valid: boolean = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex);
  const rgb: Rgb | null = valid ? hexToRgb(hex) : null;
  const hsl = rgb ? rgbToHsl(rgb) : null;

  const convert = (): void => {
    if (!valid) {
      setError('请输入合法的 HEX 颜色（如 #3b82f6）');
      return;
    }
    setError('');
  };

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          label="HEX"
          value={hex}
          onChange={(e) => setHex(e.target.value)}
          className="mono"
          sx={{ width: 220 }}
        />
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 1,
            bgcolor: valid ? hex : '#ccc',
            border: '1px solid #ddd',
          }}
        />
        <Button variant="contained" onClick={convert}>
          转换
        </Button>
      </Box>
      {error && <Alert severity="error">{error}</Alert>}
      {rgb && hsl && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <Box>
              <Box component="div" sx={{ color: 'text.secondary', fontSize: 12 }}>
                RGB
              </Box>
              <Box className="mono" sx={{ cursor: 'pointer' }} onClick={() => void copyToClipboard(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`)}>
                rgb({rgb.r}, {rgb.g}, {rgb.b})
              </Box>
            </Box>
            <Box>
              <Box component="div" sx={{ color: 'text.secondary', fontSize: 12 }}>
                HSL
              </Box>
              <Box className="mono" sx={{ cursor: 'pointer' }} onClick={() => void copyToClipboard(`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`)}>
                hsl({hsl.h}, {hsl.s}%, {hsl.l}%)
              </Box>
            </Box>
            <Box>
              <Box component="div" sx={{ color: 'text.secondary', fontSize: 12 }}>
                HEX
              </Box>
              <Box className="mono" sx={{ cursor: 'pointer' }} onClick={() => void copyToClipboard(rgbToHex(rgb))}>
                {rgbToHex(rgb)}
              </Box>
            </Box>
          </Box>
        </Paper>
      )}
    </Stack>
  );
}
