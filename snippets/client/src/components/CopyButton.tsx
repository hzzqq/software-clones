import { useState } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';

interface CopyButtonProps {
  text: string;
  size?: 'small' | 'medium';
}

/**
 * 复制按钮：点击后把文本写入剪贴板，成功后短暂显示对勾。
 * 剪贴板 API 不可用（非 HTTPS / iframe 权限）时回退到 execCommand。
 */
export default function CopyButton({ text, size = 'small' }: CopyButtonProps): JSX.Element {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = async (): Promise<void> => {
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    } catch {
      ok = false;
    }
    if (!ok) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        ok = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  };

  return (
    <Tooltip title={copied ? '已复制' : '复制代码'}>
      <IconButton size={size} onClick={() => void handleCopy()} aria-label="复制代码">
        {copied ? (
          <CheckIcon fontSize={size} color="success" />
        ) : (
          <ContentCopyIcon fontSize={size} />
        )}
      </IconButton>
    </Tooltip>
  );
}
