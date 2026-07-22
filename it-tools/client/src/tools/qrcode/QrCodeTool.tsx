import { useState } from 'react';
import { Alert, Button, Paper, Stack, TextField } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';

/** Generates a QR code (SVG) from arbitrary text. */
export default function QrCodeTool(): JSX.Element {
  const [text, setText] = useState<string>('https://example.com');
  const [error, setError] = useState<string>('');

  const onDownload = (): void => {
    const svg: SVGSVGElement | null = document.querySelector('#qr-svg svg');
    if (!svg) {
      setError('未找到二维码图像');
      return;
    }
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'qrcode.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Stack spacing={2}>
      <TextField
        label="文本 / URL"
        fullWidth
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {error && <Alert severity="error">{error}</Alert>}
      {text && (
        <Paper
          variant="outlined"
          id="qr-svg"
          sx={{ p: 2, width: 'fit-content' }}
        >
          <QRCodeSVG value={text} size={220} level="M" />
        </Paper>
      )}
      <Button variant="contained" onClick={onDownload} disabled={!text}>
        下载 SVG
      </Button>
    </Stack>
  );
}
