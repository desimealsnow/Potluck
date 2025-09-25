import { useMemo } from 'react';

import type { Ownership, EventItem } from '@common/types';

type ConfirmRunner = (key: string, fn: () => Promise<void> | void) => Promise<void> | void;

type ActionHandlers = {
  onPublish: (eventId: string) => Promise<void> | void;
  onCancel: (eventId: string) => Promise<void> | void;
  onComplete: (eventId: string) => Promise<void> | void;
  onPurge: (eventId: string) => Promise<void> | void;
  onRestore: (eventId: string) => Promise<void> | void;
};

type Context = {
  ownershipFilter: Ownership;
  pendingActionKey: string | null;
  requestConfirmThenRun: ConfirmRunner;
} & ActionHandlers;

export function useEventActions(ctx: Context) {
  // Defer requiring to avoid cycles and keep screen light
  const getEventActions = useMemo(() => {
    const { getEventActions: compute } = require('@/features/events/lib/getEventActions');
    return (item: EventItem) =>
      compute(item, {
        ownershipFilter: ctx.ownershipFilter,
        pendingActionKey: ctx.pendingActionKey,
        requestConfirmThenRun: ctx.requestConfirmThenRun,
        onPublish: ctx.onPublish,
        onCancel: ctx.onCancel,
        onComplete: ctx.onComplete,
        onPurge: ctx.onPurge,
        onRestore: ctx.onRestore,
      });
  }, [
    ctx.ownershipFilter,
    ctx.pendingActionKey,
    ctx.requestConfirmThenRun,
    ctx.onPublish,
    ctx.onCancel,
    ctx.onComplete,
    ctx.onPurge,
    ctx.onRestore,
  ]);

  return getEventActions;
}

