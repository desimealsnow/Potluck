import type { EventItem, Ownership } from '@common/types';

export type EventAction = {
  key: string;
  label: string;
  icon: string;
  color: string;
  handler: () => void;
};

export function getEventActions(
  item: EventItem,
  options: {
    ownershipFilter: Ownership;
    pendingActionKey: string | null;
    requestConfirmThenRun: (key: string, fn: () => Promise<void> | void) => Promise<void>;
    onPublish: (id: string) => Promise<void>;
    onCancel: (id: string) => Promise<void>;
    onComplete: (id: string) => Promise<void>;
    onPurge: (id: string) => Promise<void>;
    onRestore: (id: string) => Promise<void>;
  }
): EventAction[] {
  if (!item.actualStatus) return [];
  const { ownershipFilter, pendingActionKey, requestConfirmThenRun, onPublish, onCancel, onComplete, onPurge, onRestore } = options;

  const status = item.actualStatus;
  const isOwner = (item.ownership === 'mine') || (ownershipFilter === 'mine') || (status === 'draft') || (status === 'purged');
  if (!isOwner) return [];

  const actions: EventAction[] = [];

  switch (status) {
    case 'draft':
      actions.push({
        key: 'publish',
        label: pendingActionKey === `publish:${item.id}` ? 'Tap again to confirm' : 'Publish',
        icon: 'rocket-outline',
        color: '#4CAF50',
        handler: () => requestConfirmThenRun(`publish:${item.id}`, () => onPublish(item.id)),
      });
      actions.push({
        key: 'purge',
        label: pendingActionKey === `purge:${item.id}` ? 'Tap again to confirm' : 'Delete',
        icon: 'trash-outline',
        color: '#F44336',
        handler: () => requestConfirmThenRun(`purge:${item.id}`, () => onPurge(item.id)),
      });
      break;
    case 'published':
      actions.push({
        key: 'cancel',
        label: pendingActionKey === `cancel:${item.id}` ? 'Tap again to confirm' : 'Cancel',
        icon: 'close-circle-outline',
        color: '#FF9800',
        handler: () => requestConfirmThenRun(`cancel:${item.id}`, () => onCancel(item.id)),
      });
      actions.push({
        key: 'complete',
        label: pendingActionKey === `complete:${item.id}` ? 'Tap again to confirm' : 'Complete',
        icon: 'checkmark-circle-outline',
        color: '#2196F3',
        handler: () => requestConfirmThenRun(`complete:${item.id}`, () => onComplete(item.id)),
      });
      break;
    case 'completed':
      // no actions
      break;
    case 'cancelled':
      actions.push({
        key: 'purge',
        label: pendingActionKey === `purge:${item.id}` ? 'Tap again to confirm' : 'Delete',
        icon: 'trash-outline',
        color: '#F44336',
        handler: () => requestConfirmThenRun(`purge:${item.id}`, () => onPurge(item.id)),
      });
      break;
    case 'purged':
      actions.push({
        key: 'restore',
        label: pendingActionKey === `restore:${item.id}` ? 'Tap again to confirm' : 'Restore',
        icon: 'refresh-outline',
        color: '#9C27B0',
        handler: () => requestConfirmThenRun(`restore:${item.id}`, () => onRestore(item.id)),
      });
      break;
  }

  return actions;
}

