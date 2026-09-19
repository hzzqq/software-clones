import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  List,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import TodayIcon from '@mui/icons-material/Today';
import CheckBoxOutlinedIcon from '@mui/icons-material/CheckBoxOutlined';
import type { Project, Task, TodayItem } from '../types';
import { PRIORITIES } from '../types';
import { ApiError } from '../api/client';
import { tasksApi } from '../api/tasks';
import ProjectSidebar from '../components/ProjectSidebar';
import TaskItem from '../components/TaskItem';
import TaskEditorDialog from '../components/TaskEditorDialog';

type TabValue = 'active' | 'completed';

function priorityMeta(p: number) {
  return PRIORITIES.find((x) => x.value === p) ?? PRIORITIES[0];
}

/**
 * 清单任务主页：项目侧栏 + 今日视图 + 顶部快速添加 + 任务列表（含优先级/子任务）。
 */
export default function TasksPage(): JSX.Element {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [today, setToday] = useState<TodayItem[]>([]);
  const [tab, setTab] = useState<TabValue>('active');
  const [quick, setQuick] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [notice, setNotice] = useState<string>('');

  const [editorOpen, setEditorOpen] = useState<boolean>(false);

  const loadProjects = useCallback(async (): Promise<void> => {
    try {
      const data = await tasksApi.listProjects();
      setProjects(data);
      if (data.length > 0 && (activeId === null || !data.some((p) => p.id === activeId))) {
        setActiveId(data[0].id);
      }
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '加载清单失败');
    }
  }, [activeId]);

  const loadTasks = useCallback(async (): Promise<void> => {
    if (activeId === null) {
      setTasks([]);
      return;
    }
    try {
      const data = await tasksApi.listTasks(activeId, {
        completed: tab === 'completed' ? true : false,
      });
      setTasks(data);
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '加载任务失败');
    }
  }, [activeId, tab]);

  const loadToday = useCallback(async (): Promise<void> => {
    try {
      setToday(await tasksApi.today());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    void loadTasks();
    void loadToday();
  }, [loadTasks, loadToday]);

  const quickAdd = async (): Promise<void> => {
    const title = quick.trim();
    if (!title || activeId === null) return;
    try {
      await tasksApi.createTask(activeId, { title });
      setQuick('');
      setNotice('已添加任务');
      void loadTasks();
      void loadToday();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '添加失败');
    }
  };

  const handleSaved = (): void => {
    setNotice('任务已保存');
    void loadTasks();
    void loadToday();
  };

  const reloadAll = (): void => {
    void loadProjects();
    void loadTasks();
    void loadToday();
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
      <Paper sx={{ width: 240, p: 1.5, flexShrink: 0 }} elevation={0}>
        <ProjectSidebar
          projects={projects}
          activeId={activeId}
          onSelect={setActiveId}
          onChanged={reloadAll}
        />
      </Paper>

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        {/* 今日视图 */}
        <Paper sx={{ p: 2, mb: 2 }} elevation={0}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <TodayIcon color="primary" />
            <Typography variant="subtitle1" fontWeight={700}>
              今日视图
            </Typography>
            <Chip label={`${today.length} 项`} size="small" color="primary" variant="outlined" />
          </Stack>
          {today.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              今天没有高优先级或临近截止的未完成任务，轻松一下。
            </Typography>
          ) : (
            <Stack spacing={0.5}>
              {today.map((item) => {
                const meta = priorityMeta(item.priority);
                return (
                  <Stack key={item.id} direction="row" spacing={1} alignItems="center">
                    <CheckBoxOutlinedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                    <Typography variant="body2" noWrap sx={{ flexGrow: 1 }}>
                      {item.title}
                    </Typography>
                    <Chip label={item.projectName} size="small" variant="outlined" />
                    <Chip
                      label={meta.label}
                      size="small"
                      sx={{ backgroundColor: meta.color, color: '#fff', fontWeight: 700 }}
                    />
                    {item.dueDate ? (
                      <Typography variant="caption" color="text.secondary">
                        {item.dueDate.slice(0, 10)}
                      </Typography>
                    ) : null}
                  </Stack>
                );
              })}
            </Stack>
          )}
        </Paper>

        {/* 顶部快速添加 */}
        <Paper sx={{ p: 1.5, mb: 2 }} elevation={0}>
          <Stack direction="row" spacing={1}>
            <TextField
              value={quick}
              onChange={(e) => setQuick(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void quickAdd();
              }}
              placeholder={activeId === null ? '请先创建清单' : '快速添加任务，回车确认…'}
              size="small"
              fullWidth
              disabled={activeId === null}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={quickAdd}
              disabled={activeId === null}
            >
              添加
            </Button>
            <Button variant="outlined" onClick={() => setEditorOpen(true)} disabled={activeId === null}>
              详细
            </Button>
          </Stack>
        </Paper>

        {/* 任务列表 */}
        <Paper sx={{ p: 1.5 }} elevation={0}>
          <Tabs value={tab} onChange={(_e, v: TabValue) => setTab(v)} sx={{ mb: 1 }}>
            <Tab value="active" label="进行中" />
            <Tab value="completed" label="已完成" />
          </Tabs>
          <Divider />
          {error ? (
            <Alert severity="error" sx={{ mt: 1 }} onClose={() => setError('')}>
              {error}
            </Alert>
          ) : null}
          {tasks.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
              {tab === 'active' ? '这个清单还没有进行中的任务，添加一个吧。' : '还没有已完成的任务。'}
            </Typography>
          ) : (
            <List sx={{ p: 0 }}>
              {tasks.map((task) => (
                <TaskItem key={task.id} task={task} onChanged={() => {
                  void loadTasks();
                  void loadToday();
                }} />
              ))}
            </List>
          )}
        </Paper>
      </Box>

      <TaskEditorDialog
        open={editorOpen}
        task={null}
        projectId={activeId ?? 0}
        onClose={() => setEditorOpen(false)}
        onSaved={handleSaved}
      />

      <Snackbar
        open={notice.length > 0}
        autoHideDuration={2400}
        onClose={() => setNotice('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setNotice('')}>
          {notice}
        </Alert>
      </Snackbar>
    </Box>
  );
}
