import { useState, useCallback } from 'react';

/**
 * A reusable hook for managing form dialog state.
 * Reduces boilerplate across components that need open/close + edit functionality.
 * 
 * @example
 * const { open, editing, openNew, openEdit, close } = useFormDialog<Contact>();
 * 
 * <Button onClick={openNew}>Add Contact</Button>
 * <ContactForm 
 *   open={open} 
 *   onClose={close} 
 *   initialData={editing} 
 * />
 */
export function useFormDialog<T = unknown>() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);

  const openNew = useCallback(() => {
    setEditing(null);
    setOpen(true);
  }, []);

  const openEdit = useCallback((item: T) => {
    setEditing(item);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    // Delay clearing editing to allow close animation
    setTimeout(() => setEditing(null), 150);
  }, []);

  return {
    /** Whether the dialog is open */
    open,
    /** The item being edited, or null for new */
    editing,
    /** Open dialog for creating new item */
    openNew,
    /** Open dialog for editing existing item */
    openEdit,
    /** Close the dialog */
    close,
    /** Check if we're in edit mode */
    isEditing: editing !== null,
  };
}

export default useFormDialog;
