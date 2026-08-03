/**
 * 使用说明弹窗。
 *
 * 内容全部来自各 App 的 help/helpContent.ts（纯文本、无图），
 * 本组件只负责排版呈现。
 */
import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useModalPresence } from './hooks/useModalBroadcast';
import { useSettingsHelp } from './SettingsHelpProvider';

/** 使用说明。 */
export function HelpModal(): JSX.Element {
  const { helpContent, helpOpen, closeHelp } = useSettingsHelp();
  const { appName, tagline, sections, shortcuts, faq } = helpContent;

  useModalPresence(helpOpen, 'help');

  return (
    <Dialog open={helpOpen} onClose={closeHelp} maxWidth="sm" fullWidth scroll="paper">
      <DialogTitle sx={{ pr: 6 }}>
        {appName} · 使用说明
        <Typography variant="body2" color="text.secondary">
          {tagline}
        </Typography>
        <IconButton
          aria-label="关闭使用说明"
          onClick={closeHelp}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          {sections.map((section) => (
            <Box key={section.title}>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                {section.title}
              </Typography>
              <List dense disablePadding>
                {section.items.map((item) => (
                  <ListItem key={item} disableGutters sx={{ py: 0.25, alignItems: 'flex-start' }}>
                    <ListItemText
                      primary={`· ${item}`}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          ))}

          {shortcuts && shortcuts.length > 0 ? (
            <Box>
              <Divider sx={{ mb: 1.5 }} />
              <Typography variant="subtitle2" color="primary" gutterBottom>
                快捷键
              </Typography>
              <Stack spacing={0.75}>
                {shortcuts.map((shortcut) => (
                  <Stack
                    key={shortcut.key}
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Chip
                      size="small"
                      label={shortcut.key}
                      variant="outlined"
                      sx={{ fontFamily: 'monospace', flexShrink: 0 }}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'right' }}>
                      {shortcut.desc}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          ) : null}

          {faq && faq.length > 0 ? (
            <Box>
              <Divider sx={{ mb: 1.5 }} />
              <Typography variant="subtitle2" color="primary" gutterBottom>
                常见问题
              </Typography>
              <Stack spacing={1.25}>
                {faq.map((entry) => (
                  <Box key={entry.q}>
                    <Typography variant="body2" fontWeight={600}>
                      Q：{entry.q}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      A：{entry.a}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          ) : null}

          <Box>
            <Divider sx={{ mb: 1.5 }} />
            <Typography variant="subtitle2" color="primary" gutterBottom>
              通用快捷键
            </Typography>
            <Stack spacing={0.75}>
              <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
                <Chip size="small" label="F1" variant="outlined" sx={{ fontFamily: 'monospace', flexShrink: 0 }} />
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'right' }}>
                  打开本使用说明
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
                <Chip
                  size="small"
                  label="Ctrl / Cmd + ,"
                  variant="outlined"
                  sx={{ fontFamily: 'monospace', flexShrink: 0 }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'right' }}>
                  打开设置面板
                </Typography>
              </Stack>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

export default HelpModal;
