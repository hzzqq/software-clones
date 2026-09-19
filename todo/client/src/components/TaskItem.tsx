import { useState } from 'react';
import {
  Box,
  Chip,
  Collapse,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import CheckBoxOutlinedIcon from '@mui/icons-material/CheckBoxOutlined';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';
import AddIcon from '@mui/icons-material/Add';
import type { Task } from '../types';
import { PRIORITIES } from '../types';
import { ApiError } from '../api/client';
import { tasksApi } from '../api/tasks';

interface TaskItemProps {
  task: Task;
  onChanged: () => void;
}

function priorityMeta(p: number) {
  return PRIORITIES.find((x) => x.value === p) ?? PRIORITIES[0];
}

/**
 * 单个任务行：勾选完成、优先级徽标、截止日期、子任务（一级）、删除。
 */
export default function TaskItem({ task, onChanged }: TaskItemProps): JSX.Element {
  const [subOpen, setSubOpen] = useState<boolean>(false);
  const [subText, setSubText] = useState<string>('');

  const toggleComplete = async (): Promise<void> => {
    try {
      await tasksApi.updateTask(task.id, { isCompleted: !task.isCompleted });
      onChanged();
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : '操作失败');
    }
  };

  const addSub = async (): Promise<void> => {
    const title = subText.trim();
    if (!title) return;
    try {
      await tasksApi.createTask(task.projectId, { parentId: task.id, title });
      setSubText('');
      onChanged();
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : '添加子任务失败');
    }
  };

  const remove = async (): Promise<void> => {
    if (!window.confirm(`删除任务「${task.title}」？`)) return;
    try {
      await tasksApi.removeTask(task.id);
      onChanged();
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : '删除失败');
    }
  };

  const meta = priorityMeta(task.priority);

  return (
    <>
      <ListItem
        disablePadding
        secondaryAction={
          <Tooltip title="删除">
            <IconButton edge="end" size="small" color="error" onClick={remove}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        }
      >
        <ListItemButton onClick={toggleComplete} alignItems="flex-start">
          <ListItemIcon sx={{ minWidth: 36 }}>
            {task.isCompleted ? (
              <CheckBoxIcon color="success" />
            ) : (
              <CheckBoxOutlinedIcon />
            )}
          </ListItemIcon>
          <ListItemText
            primary={
              <Stack direction="row" spacing={1} alignItems="center">
                <span
                  style={{
                    textDecoration: task.isCompleted ? 'line-through' : 'none',
                    color: task.isCompleted ? 'gray' : 'inherit',
                  }}
                >
                  {task.title}
                </span>
                <Chip
                  label={meta.label}
                  size="small"
                  sx={{ backgroundColor: meta.color, color: '#fff', fontWeight: 700 }}
                />
                {task.dueDate ? (
                  <Chip label={task.dueDate.slice(0, 10)} size="small" variant="outlined" />
                ) : null}
                {task.description ? (
                  <Chip label="备注" size="small" variant="outlined" />
                ) : null}
              </Stack>
            }
            secondary={task.description || undefined}
          />
        </ListItemButton>
      </ListItem>

      {/* 子任务（一级自引用） */}
      <Box sx={{ pl: 7 }}>
        <ListItemButton onClick={() => setSubOpen((v) => !v)} sx={{ py: 0 }}>
          <SubdirectoryArrowRightIcon fontSize="small" sx={{ mr: 1, color: 'text.disabled' }} />
          <ListItemText
            primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
            primary="子任务"
          />
        </ListItemButton>
        <Collapse in={subOpen} timeout="auto" unmountOnExit>
          <Stack spacing={0.5} sx={{ pl: 4, pr: 2, pb: 1 }}>
            {task.subTasks?.map((sub) => (
              <SubTaskRow key={sub.id} sub={sub} onChanged={onChanged} />
            ))}
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                value={subText}
                onChange={(e) => setSubText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void addSub();
                }}
                placeholder="添加子任务，回车确认"
                size="small"
                fullWidth
              />
              <IconButton size="small" onClick={addSub}>
                <AddIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>
        </Collapse>
      </Box>
    </>
  );
}

interface SubTaskRowProps {
  sub: Task;
  onChanged: () => void;
}

function SubTaskRow({ sub, onChanged }: SubTaskRowProps): JSX.Element {
  const toggle = async (): Promise<void> => {
    try {
      await tasksApi.updateTask(sub.id, { isCompleted: !sub.isCompleted });
      onChanged();
    } catch {
      /* ignore */
    }
  };
  const remove = async (): Promise<void> => {
    try {
      await tasksApi.removeTask(sub.id);
      onChanged();
    } catch {
      /* ignore */
    }
  };
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <IconButton size="small" onClick={toggle}>
        {sub.isCompleted ? <CheckBoxIcon fontSize="small" color="success" /> : <CheckBoxOutlinedIcon fontSize="small" />}
      </IconButton>
      <span
        style={{
          flexGrow: 1,
          textDecoration: sub.isCompleted ? 'line-through' : 'none',
          color: sub.isCompleted ? 'gray' : 'inherit',
        }}
      >
        {sub.title}
      </span>
      <IconButton size="small" color="error" onClick={remove}>
        <DeleteOutlineIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
}
