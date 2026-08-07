import { useCallback, useEffect, useRef, useState } from 'react';
import { boardsApi } from '../api/boards';
import { listsApi, BatchAction, BatchResult, ListPatch } from '../api/lists';
import { cardsApi, CardPatch } from '../api/cards';
import { checklistApi } from '../api/checklist';
import { activityApi } from '../api/activity';
import { tagsApi } from '../api/tags';
import { ApiError } from '../api/client';
import { Activity, BoardDetail, Card, ChecklistItem, List } from '../types';
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
    if (!Number.isFinite(boardId) || boardId <= 0) {
      setDetail(null);
      setError('无效的看板 ID');
      setLoading(false);
      return;
    }
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

  const updateList = useCallback(async (id: number, patch: ListPatch): Promise<void> => {
    // 乐观更新：WIP 上限调整需要立刻反映到列头徽标，等待往返会有滞后感。
    const before = detailRef.current?.lists.find((l) => l.id === id) ?? null;
    setDetail((prev) =>
      prev
        ? { ...prev, lists: prev.lists.map((l) => (l.id === id ? { ...l, ...patch } : l)) }
        : prev
    );
    try {
      const updated: List = await listsApi.update(id, patch);
      setDetail((prev) =>
        prev ? { ...prev, lists: prev.lists.map((l) => (l.id === id ? updated : l)) } : prev
      );
    } catch (e) {
      setError((e as ApiError).message || '更新列表失败，已回滚');
      if (before) {
        setDetail((prev) =>
          prev ? { ...prev, lists: prev.lists.map((l) => (l.id === id ? before : l)) } : prev
        );
      }
    }
  }, []);

  /** 设置某列的 WIP 上限；负数 / 非有限值一律归零（表示不限制）。 */
  const setListWipLimit = useCallback(
    async (id: number, wipLimit: number): Promise<void> => {
      const next: number =
        Number.isFinite(wipLimit) && wipLimit > 0 ? Math.floor(wipLimit) : 0;
      await updateList(id, { wipLimit: next });
    },
    [updateList]
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

  /**
   * 快捷移动：把卡片整体挪到目标列的末尾，不经过拖拽。
   * 复用 moveCard 的 `list-<id>` 落点语义，保证与拖拽走同一套重排/持久化逻辑，
   * 避免出现两份 position 计算导致顺序漂移。目标列与当前列相同时直接跳过。
   */
  const moveCardToList = useCallback(
    async (cardId: number, listId: number): Promise<void> => {
      const cur = detailRef.current;
      if (!cur) return;
      const card = cur.cards.find((c) => c.id === cardId);
      if (!card || card.listId === listId) return;
      await moveCard(cardId, `list-${listId}`);
    },
    [moveCard]
  );

  // ---- Activity / comment actions ----
  /** 拉取某张卡片的活动时间线；失败时返回空数组并写入 error。 */
  const loadActivity = useCallback(async (cardId: number): Promise<Activity[]> => {
    try {
      return await activityApi.listByCard(cardId);
    } catch (e) {
      setError((e as ApiError).message || '加载活动记录失败');
      return [];
    }
  }, []);

  /**
   * 发表评论。成功后同步把卡片的 commentCount +1，
   * 让列表上的评论徽标立刻更新，无需重新拉整块看板。
   */
  const addComment = useCallback(
    async (cardId: number, text: string, author: string = ''): Promise<Activity | null> => {
      const body: string = text.trim();
      if (!body) return null;
      try {
        const created: Activity = await activityApi.addComment(cardId, { text: body, author });
        setDetail((prev) =>
          prev
            ? {
                ...prev,
                cards: prev.cards.map((c) =>
                  c.id === cardId ? { ...c, commentCount: (c.commentCount ?? 0) + 1 } : c
                ),
              }
            : prev
        );
        return created;
      } catch (e) {
        setError((e as ApiError).message || '发表评论失败');
        return null;
      }
    },
    []
  );

  /** 删除评论（系统事件不可删，服务端会拒绝）。成功后 commentCount -1。 */
  const removeComment = useCallback(
    async (cardId: number, activityId: number): Promise<boolean> => {
      try {
        await activityApi.removeComment(activityId);
        setDetail((prev) =>
          prev
            ? {
                ...prev,
                cards: prev.cards.map((c) =>
                  c.id === cardId
                    ? { ...c, commentCount: Math.max(0, (c.commentCount ?? 0) - 1) }
                    : c
                ),
              }
            : prev
        );
        return true;
      } catch (e) {
        setError((e as ApiError).message || '删除评论失败');
        return false;
      }
    },
    []
  );

  // ---- Batch actions ----
  /**
   * 列批量操作。服务端在一个事务里完成，因此这里不做乐观更新，
   * 而是拿到结果后整体 reload——批量会同时改动多列的 position，
   * 本地推演容易和服务端算出的顺序不一致。
   */
  const batchList = useCallback(
    async (
      listId: number,
      action: BatchAction,
      targetListId?: number
    ): Promise<BatchResult | null> => {
      try {
        const result: BatchResult = await listsApi.batch(listId, { action, targetListId });
        await load();
        return result;
      } catch (e) {
        setError((e as ApiError).message || '批量操作失败');
        return null;
      }
    },
    [load]
  );

  // ---- Checklist actions ----
  /** 用给定的 updater 替换某张卡片的 checklist（局部 state 同步的统一入口）。 */
  const patchChecklist = useCallback(
    (cardId: number, updater: (items: ChecklistItem[]) => ChecklistItem[]): void => {
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              cards: prev.cards.map((c) =>
                c.id === cardId ? { ...c, checklist: updater(c.checklist ?? []) } : c
              ),
            }
          : prev
      );
    },
    []
  );

  const addChecklistItem = useCallback(
    async (cardId: number, text: string): Promise<void> => {
      const trimmed = text.trim();
      if (!trimmed) return;
      try {
        const created: ChecklistItem = await checklistApi.create(cardId, { text: trimmed });
        patchChecklist(cardId, (items) => [...items, created]);
      } catch (e) {
        setError((e as ApiError).message || '添加子任务失败');
      }
    },
    [patchChecklist]
  );

  const toggleChecklistItem = useCallback(
    async (cardId: number, itemId: number, done: number): Promise<void> => {
      const next = done === 1 ? 1 : 0;
      // 乐观更新：勾选是高频交互，等待往返会有明显滞后感。
      patchChecklist(cardId, (items) =>
        items.map((i) => (i.id === itemId ? { ...i, done: next } : i))
      );
      try {
        const updated: ChecklistItem = await checklistApi.update(itemId, { done: next });
        patchChecklist(cardId, (items) => items.map((i) => (i.id === itemId ? updated : i)));
      } catch (e) {
        setError((e as ApiError).message || '更新子任务失败，已回滚');
        patchChecklist(cardId, (items) =>
          items.map((i) => (i.id === itemId ? { ...i, done: next === 1 ? 0 : 1 } : i))
        );
      }
    },
    [patchChecklist]
  );

  const removeChecklistItem = useCallback(
    async (cardId: number, itemId: number): Promise<void> => {
      try {
        await checklistApi.remove(itemId);
        patchChecklist(cardId, (items) => items.filter((i) => i.id !== itemId));
      } catch (e) {
        setError((e as ApiError).message || '删除子任务失败');
      }
    },
    [patchChecklist]
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
    setListWipLimit,
    removeList,
    addCard,
    updateCard,
    removeCard,
    clearCompleted,
    moveCard,
    moveCardToList,
    loadActivity,
    addComment,
    removeComment,
    batchList,
    addChecklistItem,
    toggleChecklistItem,
    removeChecklistItem,
    addTag,
    removeTag,
    addCardTag,
    removeCardTag,
  };
}
