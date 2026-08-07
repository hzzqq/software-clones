import { useCallback, useState } from 'react';
import {
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card as MuiCard,
  CircularProgress,
  Snackbar,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DndProvider from '../dnd/DndProvider';
import Board from '../components/Board';
import Toolbar from '../components/Toolbar';
import CardModal from '../components/CardModal';
import { useBoard } from '../hooks/useBoard';
import { boardsApi } from '../api/boards';
import { ApiError } from '../api/client';
import { CardPatch } from '../api/cards';
import { Card } from '../types';
import {
  applyCardFilters,
  boardCompletion,
  countCardsByPriority,
  countCardsByTag,
  dueSoonCards,
  overdueCards,
  type CardFilterCriteria,
} from '../utils/filterCards';
import { formatBoardSummary } from '../utils/boardSummary';
import { parseIdParam } from '../utils/id';

/** 空筛选条件：所有字段显式给出，避免各处对「缺省」理解不一致。 */
const EMPTY_CRITERIA: CardFilterCriteria = {
  query: '',
  tagIds: [],
  tagMode: 'or',
  priority: null,
  dueRange: 'all',
  onlyIncomplete: false,
};

/** Single-board view: toolbar + drag-enabled columns + card editor. */
export default function BoardPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const boardId: number | null = parseIdParam(id);
  const board = useBoard(boardId ?? 0);
  const navigate = useNavigate();

  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [criteria, setCriteria] = useState<CardFilterCriteria>(EMPTY_CRITERIA);
  const [error, setError] = useState<string>('');
  const [copyTip, setCopyTip] = useState<string>('');

  const selectedCard: Card | null =
    board.detail?.cards.find((c) => c.id === selectedCardId) ?? null;

  const patchCriteria = useCallback((patch: Partial<CardFilterCriteria>): void => {
    setCriteria((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetCriteria = useCallback((): void => {
    setCriteria(EMPTY_CRITERIA);
  }, []);

  /** 点击卡片上的标签：在多标签筛选中切换该标签（再次点击取消）。 */
  const toggleFilterTag = useCallback((tagId: number): void => {
    setCriteria((prev) => {
      const cur: number[] = prev.tagIds ?? [];
      return {
        ...prev,
        tagIds: cur.includes(tagId) ? cur.filter((t) => t !== tagId) : [...cur, tagId],
      };
    });
  }, []);

  const onDragStart = (event: DragStartEvent): void => {
    const cid: number = Number(event.active.id);
    setActiveCard(board.detail?.cards.find((c) => c.id === cid) ?? null);
  };

  const onDragEnd = (event: DragEndEvent): void => {
    setActiveCard(null);
    if (!event.over) return;
    void board.moveCard(Number(event.active.id), String(event.over.id));
  };

  const openCard = (cid: number): void => {
    setSelectedCardId(cid);
    setModalOpen(true);
  };

  const toggleComplete = (cid: number, completed: number): void => {
    void board.updateCard(cid, { completed });
  };

  const saveCard = (cid: number, patch: CardPatch): void => {
    void board.updateCard(cid, patch);
  };

  const deleteCard = async (cid: number): Promise<void> => {
    setModalOpen(false);
    await board.removeCard(cid);
  };

  const toggleTag = (cid: number, tid: number): void => {
    const c = board.detail?.cards.find((x) => x.id === cid);
    if (!c) return;
    if (c.tagIds.includes(tid)) {
      void board.removeCardTag(cid, tid);
    } else {
      void board.addCardTag(cid, tid);
    }
  };

  const deleteBoard = async (): Promise<void> => {
    if (boardId === null) return;
    try {
      await boardsApi.remove(boardId);
      navigate('/boards');
    } catch (e) {
      setError((e as ApiError).message);
    }
  };

  const copySummary = async (): Promise<void> => {
    if (!board.detail) return;
    const text = formatBoardSummary(board.detail);
    try {
      await navigator.clipboard?.writeText(text);
      setCopyTip('已复制看板摘要');
    } catch {
      setCopyTip('复制失败，请手动选择');
    }
  };

  if (boardId === null) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        无效的看板 ID
      </Alert>
    );
  }

  if (board.loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!board.detail) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        看板不存在或已被删除。
      </Alert>
    );
  }

  const overlay =
    activeCard !== null ? (
      <MuiCard sx={{ p: 1.5, width: 280, boxShadow: 6 }}>
        <Typography>{activeCard.title}</Typography>
      </MuiCard>
    ) : null;

  const visibleCount: number = applyCardFilters(
    board.detail.cards,
    criteria,
    board.tags
  ).length;

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/boards')}
        sx={{ mb: 1 }}
      >
        返回
      </Button>
      {error && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}
      <Toolbar
        board={board.detail}
        tags={board.tags}
        criteria={criteria}
        onCriteriaChange={patchCriteria}
        onResetFilters={resetCriteria}
        onDeleteBoard={() => void deleteBoard()}
        onTagsChanged={() => board.reload()}
        onClearCompleted={() => void board.clearCompleted()}
        onCopySummary={() => void copySummary()}
        visibleCards={visibleCount}
        totalCards={board.detail.cards.length}
        completedCards={board.detail.cards.filter((c) => c.completed === 1).length}
        completionPercent={boardCompletion(board.detail.cards)}
        priorityCounts={countCardsByPriority(board.detail.cards)}
        tagCounts={countCardsByTag(board.detail.cards)}
        dueSoonCount={dueSoonCards(board.detail.cards).length}
        overdueCount={overdueCards(board.detail.cards).length}
      />
      <DndProvider onDragEnd={onDragEnd} onDragStart={onDragStart} overlay={overlay}>
        <Board
          lists={board.lists}
          cardsByList={board.cardsByList}
          tags={board.tags}
          criteria={criteria}
          onTagClick={toggleFilterTag}
          onAddList={(t) => void board.addList(t)}
          onDeleteList={(lid) => void board.removeList(lid)}
          onUpdateListWip={(lid, limit) => void board.setListWipLimit(lid, limit)}
          onAddCard={(lid, t) => void board.addCard(lid, t)}
          onOpenCard={openCard}
          onToggleComplete={toggleComplete}
          onMoveCardToList={(cid, lid) => void board.moveCardToList(cid, lid)}
          onBatchList={(lid, action, target) => void board.batchList(lid, action, target)}
        />
      </DndProvider>
      <CardModal
        card={selectedCard}
        tags={board.tags}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={saveCard}
        onDelete={deleteCard}
        onToggleTag={toggleTag}
        onAddChecklistItem={(cid, text) => void board.addChecklistItem(cid, text)}
        onToggleChecklistItem={(cid, itemId, done) =>
          void board.toggleChecklistItem(cid, itemId, done)
        }
        onRemoveChecklistItem={(cid, itemId) => void board.removeChecklistItem(cid, itemId)}
        onLoadActivity={board.loadActivity}
        onAddComment={board.addComment}
        onRemoveComment={board.removeComment}
      />
      <Snackbar
        open={copyTip !== ''}
        autoHideDuration={2000}
        onClose={() => setCopyTip('')}
        message={copyTip}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
