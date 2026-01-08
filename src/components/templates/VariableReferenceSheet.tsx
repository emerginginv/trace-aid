import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { TEMPLATE_VARIABLES, getVariableCategories, getVariablesByCategory } from "@/lib/docxVariables";
import { toast } from "sonner";

interface VariableReferenceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VariableReferenceSheet({ open, onOpenChange }: VariableReferenceSheetProps) {
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);
  const categories = getVariableCategories();

  const handleCopy = (variable: string) => {
    navigator.clipboard.writeText(variable);
    setCopiedVariable(variable);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedVariable(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Template Variables</DialogTitle>
          <DialogDescription>
            Use these variables in your Word documents. Click to copy.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-6">
            {categories.map((category) => {
              const variables = getVariablesByCategory(category);
              return (
                <div key={category}>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                    [{category}]
                  </h3>
                  <div className="space-y-1">
                    {variables.map((v) => (
                      <div
                        key={v.variable}
                        className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 group cursor-pointer"
                        onClick={() => handleCopy(v.variable)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{v.label}</span>
                            {v.description && (
                              <span className="text-xs text-muted-foreground">
                                ({v.description})
                              </span>
                            )}
                          </div>
                          <code className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                            {v.variable}
                          </code>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(v.variable);
                          }}
                        >
                          {copiedVariable === v.variable ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}