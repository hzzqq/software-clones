import { useState } from 'react';
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
import { countCardsByPriority, dueSoonCards, overdueCards } from '../utils/filterCards';

/** Single-board view: toolbar + drag-enabled columns + card editor. */
export default function BoardPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const boardId: number = Number(id);
  const board = useBoard(boardId);
  const navigate = useNavigate();

  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [filterTagId, setFilterTagId] = useState<number | null>(null);
  const [search, setSearch] = useState<string>('');
  const [error, setError] = useState<string>('');

  const selectedCard: Card | null =
    board.detail?.cards.find((c) => c.id === selectedCardId) ?? null;

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
    try {
      await boardsApi.remove(boardId);
      navigate('/boards');
    } catch (e) {
      setError((e as ApiError).message);
    }
  };

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
        filterTagId={filterTagId}
        onFilterChange={setFilterTagId}
        onDeleteBoard={() => void deleteBoard()}
        onTagsChanged={() => board.reload()}
        searchQuery={search}
        onSearchChange={setSearch}
        onClearCompleted={() => void board.clearCompleted()}
        totalCards={board.detail.cards.length}
        completedCards={board.detail.cards.filter((c) => c.completed === 1).length}
        priorityCounts={countCardsByPriority(board.detail.cards)}
        dueSoonCount={dueSoonCards(board.detail.cards).length}
        overdueCount={overdueCards(board.detail.cards).length}
      />
      <DndProvider onDragEnd={onDragEnd} onDragStart={onDragStart} overlay={overlay}>
        <Board
          lists={board.lists}
          cardsByList={board.cardsByList}
          tags={board.tags}
          filterTagId={filterTagId}
          searchQuery={search}
          onAddList={(t) => void board.addList(t)}
          onDeleteList={(lid) => void board.removeList(lid)}
          onAddCard={(lid, t) => void board.addCard(lid, t)}
          onOpenCard={openCard}
          onToggleComplete={toggleComplete}
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
      />
    </Box>
  );
}
