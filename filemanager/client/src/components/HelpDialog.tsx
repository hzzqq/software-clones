import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { helpContent } from '../help/helpContent';

interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
}

/** 简易帮助 / 关于对话框，复用 helpContent 内容。 */
export default function HelpDialog({ open, onClose }: HelpDialogProps): JSX.Element {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{helpContent.appName}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {helpContent.tagline}
        </Typography>
        {helpContent.sections.map((section, i) => (
          <Box key={i} sx={{ mt: 2 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              {section.title}
            </Typography>
            <List dense>
              {section.items.map((item, j) => (
                <ListItem key={j}>
                  <ListItemText primary={item} />
                </ListItem>
              ))}
            </List>
          </Box>
        ))}
        {helpContent.faq && helpContent.faq.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              常见问题
            </Typography>
            {helpContent.faq.map((f, k) => (
              <Box key={k} sx={{ mb: 1 }}>
                <Typography variant="body2" fontWeight={600}>
                  {f.q}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {f.a}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
}
