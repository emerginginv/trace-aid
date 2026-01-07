import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Folder, FolderPlus, Files, FileQuestion, MoreVertical, Pencil, Trash2, ChevronRight, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export interface AttachmentFolder {
  id: string;
  case_id: string;
  organization_id: string;
  name: string;
  color: string;
  parent_folder_id: string | null;
  created_at: string;
  created_by: string | null;
}

interface FolderPanelProps {
  caseId: string;
  organizationId: string;
  selectedFolderId: string | null; // null = All Files, "unfiled" = Unfiled
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: () => void;
  onEditFolder: (folder: AttachmentFolder) => void;
  folders: AttachmentFolder[];
  attachmentCounts: Record<string, number>;
  unfiledCount: number;
  totalCount: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function FolderPanel({
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onEditFolder,
  folders,
  attachmentCounts,
  unfiledCount,
  totalCount,
  isCollapsed = false,
  onToggleCollapse,
}: FolderPanelProps) {
  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center py-2 px-1 border-r bg-muted/30">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="mb-2"
          title="Expand folders"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onSelectFolder(null)}
          className={cn(
            "mb-1",
            selectedFolderId === null && "bg-accent"
          )}
          title="All Files"
        >
          <Files className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onSelectFolder("unfiled")}
          className={cn(
            "mb-1",
            selectedFolderId === "unfiled" && "bg-accent"
          )}
          title="Unfiled"
        >
          <FileQuestion className="h-4 w-4" />
        </Button>
        {folders.slice(0, 5).map((folder) => (
          <Button
            key={folder.id}
            variant="ghost"
            size="icon"
            onClick={() => onSelectFolder(folder.id)}
            className={cn(
              "mb-1",
              selectedFolderId === folder.id && "bg-accent"
            )}
            title={folder.name}
          >
            <span
              className="w-4 h-4 rounded"
              style={{ backgroundColor: folder.color }}
            />
          </Button>
        ))}
        <Button
          variant="ghost"
          size="icon"
          onClick={onCreateFolder}
          className="mt-auto"
          title="New Folder"
        >
          <FolderPlus className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-56 border-r bg-muted/30 flex flex-col">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-semibold text-sm">Folders</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onCreateFolder}
            className="h-7 w-7"
            title="New Folder"
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="h-7 w-7"
              title="Collapse"
            >
              <ChevronDown className="h-4 w-4 rotate-90" />
            </Button>
          )}
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* All Files */}
          <button
            onClick={() => onSelectFolder(null)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left",
              selectedFolderId === null
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50"
            )}
          >
            <Files className="h-4 w-4 shrink-0" />
            <span className="truncate flex-1">All Files</span>
            <span className="text-xs text-muted-foreground">{totalCount}</span>
          </button>
          
          {/* Unfiled */}
          <button
            onClick={() => onSelectFolder("unfiled")}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left",
              selectedFolderId === "unfiled"
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50"
            )}
          >
            <FileQuestion className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate flex-1">Unfiled</span>
            <span className="text-xs text-muted-foreground">{unfiledCount}</span>
          </button>
          
          {/* Divider */}
          {folders.length > 0 && (
            <div className="border-t my-2" />
          )}
          
          {/* Folders */}
          {folders.map((folder) => (
            <div
              key={folder.id}
              className={cn(
                "group flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer",
                selectedFolderId === folder.id
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"
              )}
              onClick={() => onSelectFolder(folder.id)}
            >
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: folder.color }}
              />
              <Folder
                className="h-4 w-4 shrink-0"
                style={{ color: folder.color }}
              />
              <span className="truncate flex-1">{folder.name}</span>
              <span className="text-xs text-muted-foreground">
                {attachmentCounts[folder.id] || 0}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="opacity-0 group-hover:opacity-100 p-1 -mr-1 hover:bg-accent rounded transition-opacity"
                  >
                    <MoreVertical className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onEditFolder(folder);
                  }}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
