import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DelayedTooltip } from "@/components/ui/tooltip";
import { Copy, Info, FileSpreadsheet, Download } from "lucide-react";
import { toast } from "sonner";
import { 
  getEntityDefinition, 
  getAllEntitiesSorted,
  type ColumnDefinition 
} from "@/lib/templateColumnDefinitions";

interface ColumnGuideModalProps {
  entityType: string | null;
  onClose: () => void;
}

function ColumnTypeLabel({ type }: { type: ColumnDefinition['type'] }) {
  const colors: Record<string, string> = {
    text: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    number: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    date: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    boolean: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    reference: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
    json: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  };
  
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[type]}`}>
      {type}
    </span>
  );
}

export function ColumnGuideModal({ entityType, onClose }: ColumnGuideModalProps) {
  const allEntities = getAllEntitiesSorted();
  const entity = entityType ? getEntityDefinition(entityType) : null;
  
  const handleCopyColumns = () => {
    if (!entity) return;
    const columnNames = entity.columns.map(c => c.name).join(',');
    navigator.clipboard.writeText(columnNames);
    toast.success('Column names copied to clipboard');
  };

  const handleEntityChange = (newType: string) => {
    // We can't directly change since it's controlled, but we can use the same modal
    // This is a workaround - parent should control this
    if (entityType !== newType) {
      onClose();
      setTimeout(() => {
        // Re-open with new type by dispatching an event or using state
        window.dispatchEvent(new CustomEvent('open-column-guide', { detail: newType }));
      }, 100);
    }
  };

  return (
    <Dialog open={!!entityType} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Column Guide
              </DialogTitle>
              <DialogDescription className="mt-1">
                {entity?.description}
              </DialogDescription>
            </div>
            <Select value={entityType || ''} onValueChange={handleEntityChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select entity" />
              </SelectTrigger>
              <SelectContent>
                {allEntities.map((e) => (
                  <SelectItem key={e.entityType} value={e.entityType}>
                    {e.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>
        
        {entity && (
          <>
            {/* Actions */}
            <div className="flex items-center gap-2 pb-2 border-b">
              <Button variant="outline" size="sm" onClick={handleCopyColumns}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Column Names
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={`/import-templates/${entity.fileName}`} download>
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </a>
              </Button>
            </div>

            {/* Dependencies info */}
            {entity.dependsOn.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Depends on:</span>
                {entity.dependsOn.map((dep) => (
                  <Badge key={dep} variant="secondary">
                    {getEntityDefinition(dep)?.displayName || dep}
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Column Table */}
            <ScrollArea className="h-[400px] pr-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Column</TableHead>
                    <TableHead className="w-[80px]">Required</TableHead>
                    <TableHead className="w-[80px]">Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[150px]">Example</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entity.columns.map((column) => (
                    <TableRow key={column.name}>
                      <TableCell className="font-mono text-sm">
                        <div className="flex items-center gap-1">
                          {column.name}
                          {column.tips && (
                            <DelayedTooltip content={column.tips}>
                              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </DelayedTooltip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {column.required ? (
                          <Badge variant="destructive" className="text-xs">Required</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">Optional</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <ColumnTypeLabel type={column.type} />
                      </TableCell>
                      <TableCell className="text-sm">
                        {column.description}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {column.example}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 pt-2 border-t text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <ColumnTypeLabel type="text" />
                <span>Text values</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ColumnTypeLabel type="number" />
                <span>Numeric values</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ColumnTypeLabel type="date" />
                <span>Date (YYYY-MM-DD)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ColumnTypeLabel type="boolean" />
                <span>True/False</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ColumnTypeLabel type="reference" />
                <span>Links to another record</span>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
