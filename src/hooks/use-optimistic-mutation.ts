import { useRef, useCallback } from "react";
import { toast } from "sonner";

interface PendingDeletion<T> {
  id: string;
  item: T;
  timeoutId: NodeJS.Timeout;
}

interface UseOptimisticDeleteOptions<T> {
  /** Function to perform the actual deletion */
  deleteFn: (id: string) => Promise<{ error: any }>;
  /** Current items array */
  items: T[];
  /** Setter for items */
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  /** Key function to get the item ID */
  getItemId: (item: T) => string;
  /** Name of the entity for toast messages */
  entityName: string;
  /** Delay before actual deletion (ms) - defaults to 5000 */
  undoDelay?: number;
}

export function useOptimisticDelete<T>({
  deleteFn,
  items,
  setItems,
  getItemId,
  entityName,
  undoDelay = 5000,
}: UseOptimisticDeleteOptions<T>) {
  const pendingDeletions = useRef<Map<string, PendingDeletion<T>>>(new Map());

  const deleteItem = useCallback(async (id: string) => {
    const item = items.find((i) => getItemId(i) === id);
    if (!item) return;

    // Optimistically remove from UI immediately
    setItems((prev) => prev.filter((i) => getItemId(i) !== id));

    // Clear any existing pending deletion for this item
    const existing = pendingDeletions.current.get(id);
    if (existing) {
      clearTimeout(existing.timeoutId);
    }

    // Show toast with undo action
    const toastId = toast(`${entityName} deleted`, {
      description: "Click undo to restore",
      action: {
        label: "Undo",
        onClick: () => {
          // Cancel the deletion
          const pending = pendingDeletions.current.get(id);
          if (pending) {
            clearTimeout(pending.timeoutId);
            // Restore the item
            setItems((prev) => [...prev, pending.item]);
            pendingDeletions.current.delete(id);
            toast.success(`${entityName} restored`);
          }
        },
      },
      duration: undoDelay,
    });

    // Schedule actual deletion
    const timeoutId = setTimeout(async () => {
      const { error } = await deleteFn(id);
      
      if (error) {
        // Restore the item on error
        const pending = pendingDeletions.current.get(id);
        if (pending) {
          setItems((prev) => [...prev, pending.item]);
          toast.error(`Failed to delete ${entityName.toLowerCase()}. Item restored.`);
        }
      }
      
      pendingDeletions.current.delete(id);
    }, undoDelay);

    pendingDeletions.current.set(id, {
      id,
      item,
      timeoutId,
    });
  }, [items, setItems, getItemId, deleteFn, entityName, undoDelay]);

  // Cleanup function to cancel all pending deletions
  const cancelAllPending = useCallback(() => {
    pendingDeletions.current.forEach((pending) => {
      clearTimeout(pending.timeoutId);
      setItems((prev) => [...prev, pending.item]);
    });
    pendingDeletions.current.clear();
  }, [setItems]);

  return {
    deleteItem,
    cancelAllPending,
    hasPendingDeletions: () => pendingDeletions.current.size > 0,
  };
}

// Hook for optimistic toggle/update operations
interface UseOptimisticToggleOptions<T> {
  updateFn: (id: string, newValue: any) => Promise<{ error: any }>;
  items: T[];
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  getItemId: (item: T) => string;
  entityName: string;
}

export function useOptimisticToggle<T>({
  updateFn,
  items,
  setItems,
  getItemId,
  entityName,
}: UseOptimisticToggleOptions<T>) {
  const toggleItem = useCallback(async (
    id: string,
    updateFn: (item: T) => T,
    dbUpdateFn: () => Promise<{ error: any }>,
    successMessage?: string
  ) => {
    const item = items.find((i) => getItemId(i) === id);
    if (!item) return;

    const previousItems = [...items];
    
    // Optimistically update UI
    setItems((prev) =>
      prev.map((i) => (getItemId(i) === id ? updateFn(i) : i))
    );

    if (successMessage) {
      toast.success(successMessage);
    }

    // Perform actual update
    const { error } = await dbUpdateFn();

    if (error) {
      // Rollback on error
      setItems(previousItems);
      toast.error(`Failed to update ${entityName.toLowerCase()}. Change reverted.`);
    }
  }, [items, setItems, getItemId, entityName]);

  return { toggleItem };
}
