import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Attachment } from '@/hooks/useAttachments';

interface AttachmentEditDialogProps {
  attachment: Attachment | null;
  onClose: () => void;
  onSave: (updates: { name: string; description: string; tags: string[] }) => void;
}

export function AttachmentEditDialog({ attachment, onClose, onSave }: AttachmentEditDialogProps) {
  const [form, setForm] = React.useState({
    name: '',
    description: '',
    tags: '',
  });

  React.useEffect(() => {
    if (attachment) {
      setForm({
        name: attachment.name || attachment.file_name,
        description: attachment.description || '',
        tags: attachment.tags?.join(', ') || '',
      });
    }
  }, [attachment]);

  const handleSave = () => {
    const tagsArray = form.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    onSave({
      name: form.name || (attachment?.file_name ?? ''),
      description: form.description,
      tags: tagsArray,
    });
  };

  return (
    <Dialog open={!!attachment} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Attachment</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Name</label>
            <Input
              type="text"
              placeholder="Attachment name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Description</label>
            <Textarea
              placeholder="Add a description..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="text-sm resize-none"
              rows={3}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Tags</label>
            <Input
              type="text"
              placeholder="Tags (comma separated)"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AttachmentEditDialog;
