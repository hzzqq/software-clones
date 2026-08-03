import { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertTitle, Box, Button, Stack } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

/**
 * 捕获子树渲染期错误，展示友好提示并允许用户恢复，
 * 而不是直接白屏崩溃。
 */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message ?? 'Unknown error' };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, info);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleRetry = (): void => {
    this.setState({ hasError: false, message: '' });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 4, maxWidth: 560, mx: 'auto', mt: 8 }}>
          <Alert severity="error">
            <AlertTitle>出错了</AlertTitle>
            {this.state.message}
          </Alert>
          <Stack direction="row" spacing={1} sx={{ mt: 2 }} justifyContent="flex-end">
            <Button variant="outlined" onClick={this.handleRetry}>
              重试
            </Button>
            <Button variant="contained" startIcon={<RefreshIcon />} onClick={this.handleReload}>
              重新加载
            </Button>
          </Stack>
        </Box>
      );
    }
    return this.props.children;
  }
}
