import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import AddLinkIcon from '@mui/icons-material/AddLink';
import LinkIcon from '@mui/icons-material/Link';
import { useLinks } from '../hooks/useLinks';
import LinkCard from '../components/LinkCard';
import CreateLinkDialog from '../components/CreateLinkDialog';
import { formatClicks } from '../utils/shortLink';

/**
 * 短链接列表页：顶部汇总统计 + 创建按钮，下方为全部短链卡片。
 */
export default function LinksPage(): JSX.Element {
  const { links, summary, loading, error, refresh, create, remove } = useLinks();
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="body2" color="text.secondary">
            短链总数
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {formatClicks(summary.total)}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="body2" color="text.secondary">
            累计点击
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {formatClicks(summary.totalClicks)}
          </Typography>
        </Paper>
        <Paper
          sx={{
            p: 2,
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
          <Button
            variant="contained"
            startIcon={<AddLinkIcon />}
            onClick={() => setDialogOpen(true)}
          >
            创建短链接
          </Button>
        </Paper>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => void refresh()}>
          {error}（点击关闭重试）
        </Alert>
      ) : links.length === 0 ? (
        <Card variant="outlined">
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <LinkIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              还没有短链接，点击右上角「创建短链接」开始。
            </Typography>
            <Button variant="outlined" startIcon={<AddLinkIcon />} onClick={() => setDialogOpen(true)}>
              创建第一条短链
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={0}>
          {links.map((link) => (
            <Grid item xs={12} key={link.id}>
              <LinkCard link={link} onDelete={remove} />
            </Grid>
          ))}
        </Grid>
      )}

      <CreateLinkDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreate={create} />
    </Box>
  );
}
