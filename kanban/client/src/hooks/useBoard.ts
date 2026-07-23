import { useCallback, useEffect, useRef, useState } from 'react';
import { boardsApi } from '../api/boards';
import { listsApi } from '../api/lists';
import { cardsApi, CardPatch } from '../api/cards';
import { tagsApi } from '../api/tags';
import { ApiError } from '../api/client';
import { BoardDetail, Card, List } from '../types';
import { reorderCards } from '../utils/reorder';

/**
 * Central state container for a single board. Loads the aggregated board
 * detail and exposes CRUD + drag-move actions with optimistic updates and
 * rollback on server failure.
 */
export function useBoard(boardId: number) {
  const [detail, setDetail] = useState<BoardDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const detailRef = useRef<BoardDetail | null>(null);
  detailRef.current = detail;

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const d: BoardDetail = await boardsApi.get(boardId);
      setDetail(d);
      setError('');
    } catch (e) {
      setError((e as ApiError).message || '加载失败');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    void load();
  }, [load]);

  const lists: List[] = detail
    ? [...detail.lists].sort((a, b) => a.position - b.position)
    : [];
  const tags = detail?.tags ?? [];
  const cardsByList: Record<number, Card[]> = {};
  if (detail) {
    for (const list of detail.lists) cardsByList[list.id] = [];
    for (const card of detail.cards) {
      (cardsByList[card.listId] ??= []).push(card);
    }
    for (const id of Object.keys(cardsByList)) {
      cardsByList[Number(id)].sort((a, b) => a.position - b.position);
    }
  }

  // ---- List actions ----
  const addList = useCallback(
    async (title: string): Promise<void> => {
      const cur = detailRef.current;
      if (!cur) return;
      const created = await listsApi.create({
        boardId: cur.id,
        title,
        position: cur.lists.length,
      });
      setDetail((prev) => (prev ? { ...prev, lists: [...prev.lists, created] } : prev));
    },
    []
  );

  const updateList = useCallback(
    async (id: number, patch: { title?: string; position?: number }): Promise<void> => {
      await listsApi.update(id, patch);
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              lists: prev.lists.map((l) => (l.id === id ? { ...l, ...patch } : l)),
            }
          : prev
      );
    },
    []
  );

  const removeList = useCallback(async (id: number): Promise<void> => {
    await listsApi.remove(id);
    setDetail((prev) =>
      prev
        ? {
            ...prev,
            lists: prev.lists.filter((l) => l.id !== id),
            cards: prev.cards.filter((c) => c.listId !== id),
          }
        : prev
    );
  }, []);

  // ---- Card actions ----
  const addCard = useCallback(
    async (listId: number, title: string): Promise<void> => {
      const cur = detailRef.current;
      if (!cur) return;
      const count = cur.cards.filter((c) => c.listId === listId).length;
      const created = await cardsApi.create({ listId, title, position: count });
      setDetail((prev) => (prev ? { ...prev, cards: [...prev.cards, created] } : prev));
    },
    []
  );

  const updateCard = useCallback(
    async (id: number, patch: CardPatch): Promise<void> => {
      const updated = await cardsApi.update(id, patch);
      setDetail((prev) =>
        prev ? { ...prev, cards: prev.cards.map((c) => (c.id === id ? updated : c)) } : prev
      );
    },
    []
  );

  const removeCard = useCallback(async (id: number): Promise<void> => {
    await cardsApi.remove(id);
    setDetail((prev) =>
      prev ? { ...prev, cards: prev.cards.filter((c) => c.id !== id) } : prev
    );
  }, []);

  const clearCompleted = useCallback(async (): Promise<void> => {
    const cur = detailRef.current;
    if (!cur) return;
    const done = cur.cards.filter((c) => c.completed === 1);
    for (const c of done) {
      await cardsApi.remove(c.id);
    }
    setDetail((prev) =>
      prev ? { ...prev, cards: prev.cards.filter((c) => c.completed !== 1) } : prev
    );
  }, []);

  /**
   * Moves a card to a new list/index based on the dnd-kit drop target.
   * `overId` is either a card id or `list-<id>` (empty-column droppable).
   */
  const moveCard = useCallback(
    async (activeId: number, overId: string): Promise<void> => {
      const prev = detailRef.current;
      if (!prev) return;

      const newCards: Card[] = reorderCards(prev.cards, activeId, overId);

      // Optimistic update.
      setDetail((p) => (p ? { ...p, cards: newCards } : p));

      // Persist every card whose position/list changed.
      try {
        for (const c of newCards) {
          const old = prev.cards.find((o) => o.id === c.id);
          if (c.id === activeId) {
            await cardsApi.update(c.id, { listId: c.listId, position: c.position });
          } else if (!old || old.position !== c.position || old.listId !== c.listId) {
            await cardsApi.update(c.id, { position: c.position, listId: c.listId });
          }
        }
      } catch (e) {
        setError((e as ApiError).message || '移动失败，已回滚');
        await load();
      }
    },
    [load]
  );

  // ---- Tag actions ----
  const addTag = useCallback(
    async (name: string, color: string): Promise<void> => {
      const cur = detailRef.current;
      if (!cur) return;
      const created = await tagsApi.create({ boardId: cur.id, name, color });
      setDetail((prev) => (prev ? { ...prev, tags: [...prev.tags, created] } : prev));
    },
    []
  );

  const removeTag = useCallback(async (id: number): Promise<void> => {
    await tagsApi.remove(id);
    setDetail((prev) =>
      prev
        ? {
            ...prev,
            tags: prev.tags.filter((t) => t.id !== id),
            cards: prev.cards.map((c) => ({
              ...c,
              tagIds: c.tagIds.filter((tid) => tid !== id),
            })),
          }
        : prev
    );
  }, []);

  const addCardTag = useCallback(async (cardId: number, tagId: number): Promise<void> => {
    await cardsApi.addTag(cardId, tagId);
    setDetail((prev) =>
      prev
        ? {
            ...prev,
            cards: prev.cards.map((c) =>
              c.id === cardId && !c.tagIds.includes(tagId)
                ? { ...c, tagIds: [...c.tagIds, tagId] }
                : c
            ),
          }
        : prev
    );
  }, []);

  const removeCardTag = useCallback(async (cardId: number, tagId: number): Promise<void> => {
    await cardsApi.removeTag(cardId, tagId);
    setDetail((prev) =>
      prev
        ? {
            ...prev,
            cards: prev.cards.map((c) =>
              c.id === cardId ? { ...c, tagIds: c.tagIds.filter((t) => t !== tagId) } : c
            ),
          }
        : prev
    );
  }, []);

  return {
    detail,
    lists,
    tags,
    cardsByList,
    loading,
    error,
    reload: load,
    addList,
    updateList,
    removeList,
    addCard,
    updateCard,
    removeCard,
    clearCompleted,
    moveCard,
    addTag,
    removeTag,
    addCardTag,
    removeCardTag,
  };
}
