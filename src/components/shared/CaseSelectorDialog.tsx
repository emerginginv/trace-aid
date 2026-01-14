import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Briefcase } from "lucide-react";

interface CaseOption {
  id: string;
  case_number: string;
  title: string;
}

interface CaseSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectCase: (caseId: string) => void;
  title: string;
  description?: string;
}

export function CaseSelectorDialog({
  open,
  onOpenChange,
  onSelectCase,
  title,
  description,
}: CaseSelectorDialogProps) {
  const { organization } = useOrganization();
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (open && organization?.id) {
      fetchCases();
    }
  }, [open, organization?.id]);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  const fetchCases = async () => {
    if (!organization?.id) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("cases")
        .select("id, case_number, title")
        .eq("organization_id", organization.id)
        .neq("status", "closed")
        .order("case_number", { ascending: false })
        .limit(100);

      if (error) throw error;
      setCases(data || []);
    } catch (error) {
      console.error("Error fetching cases:", error);
      setCases([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredCases = cases.filter((c) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      c.case_number.toLowerCase().includes(query) ||
      c.title.toLowerCase().includes(query)
    );
  });

  const handleSelect = (caseId: string) => {
    onSelectCase(caseId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="mt-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : cases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Briefcase className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">No open cases found</p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                Create a case first before adding items
              </p>
            </div>
          ) : (
            <Command className="rounded-lg border">
              <CommandInput
                placeholder="Search cases..."
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList className="max-h-[300px]">
                <CommandEmpty>No cases found.</CommandEmpty>
                <CommandGroup>
                  {filteredCases.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={`${c.case_number} ${c.title}`}
                      onSelect={() => handleSelect(c.id)}
                      className="cursor-pointer"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{c.case_number}</span>
                        <span className="text-sm text-muted-foreground truncate max-w-[350px]">
                          {c.title}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          )}
        </div>

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
