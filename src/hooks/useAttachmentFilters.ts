import { useState, useMemo, useCallback } from 'react';
import { Attachment } from '@/hooks/useAttachments';

interface UseAttachmentFiltersOptions {
  attachments: Attachment[];
  selectedFolderId: string | null;
}

export function getFileTypeCategory(fileType: string) {
  if (fileType.startsWith('image/')) return 'image';
  if (fileType.startsWith('video/')) return 'video';
  if (fileType.startsWith('audio/')) return 'audio';
  if (fileType.includes('pdf') || fileType.includes('document') || fileType.includes('word'))
    return 'document';
  return 'other';
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function useAttachmentFilters({ attachments, selectedFolderId }: UseAttachmentFiltersOptions) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');

  // Get unique tags from all attachments
  const allTags = useMemo(
    () =>
      Array.from(
        new Set(attachments.flatMap((attachment) => attachment.tags || []).filter(Boolean))
      ).sort(),
    [attachments]
  );

  // Filter attachments
  const filteredAttachments = useMemo(() => {
    return attachments.filter((attachment) => {
      const displayName = attachment.name || attachment.file_name;
      const matchesSearch =
        searchQuery === '' ||
        displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attachment.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attachment.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType =
        typeFilter === 'all' || getFileTypeCategory(attachment.file_type) === typeFilter;

      const matchesTag = tagFilter === 'all' || attachment.tags?.includes(tagFilter);

      // Folder filter
      const matchesFolder =
        selectedFolderId === null || // All files
        (selectedFolderId === 'unfiled' && !attachment.folder_id) || // Unfiled
        attachment.folder_id === selectedFolderId; // Specific folder

      return matchesSearch && matchesType && matchesTag && matchesFolder;
    });
  }, [attachments, searchQuery, typeFilter, tagFilter, selectedFolderId]);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setTypeFilter('all');
    setTagFilter('all');
  }, []);

  return {
    // Filter values
    searchQuery,
    typeFilter,
    tagFilter,
    allTags,

    // Setters
    setSearchQuery,
    setTypeFilter,
    setTagFilter,

    // Results
    filteredAttachments,

    // Helpers
    clearFilters,
  };
}

export default useAttachmentFilters;
