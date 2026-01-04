import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Check, 
  AlertTriangle, 
  Plus, 
  ArrowRight 
} from "lucide-react";
import { TypeMapping } from "@/types/import";

interface TypeMappingTableProps {
  title: string;
  externalValues: string[];
  picklistValues: string[];
  mappings: TypeMapping[];
  onMappingsChange: (mappings: TypeMapping[]) => void;
}

export function TypeMappingTable({
  title,
  externalValues,
  picklistValues,
  mappings,
  onMappingsChange
}: TypeMappingTableProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  
  const getMapping = (externalValue: string): TypeMapping | undefined => {
    return mappings.find(m => m.externalValue === externalValue);
  };
  
  const updateMapping = (externalValue: string, casewyzeValue: string, autoCreate: boolean = false) => {
    const existing = mappings.find(m => m.externalValue === externalValue);
    
    if (existing) {
      onMappingsChange(
        mappings.map(m => 
          m.externalValue === externalValue 
            ? { ...m, casewyzeValue, autoCreate }
            : m
        )
      );
    } else {
      onMappingsChange([
        ...mappings,
        { externalValue, casewyzeValue, autoCreate }
      ]);
    }
  };
  
  const getMappingStatus = (externalValue: string): 'mapped' | 'exact' | 'unmapped' | 'create' => {
    const mapping = getMapping(externalValue);
    
    if (mapping?.autoCreate) {
      return 'create';
    }
    
    if (mapping?.casewyzeValue) {
      return 'mapped';
    }
    
    // Check for exact match in picklist
    if (picklistValues.some(pv => pv.toLowerCase() === externalValue.toLowerCase())) {
      return 'exact';
    }
    
    return 'unmapped';
  };
  
  const handleCreateNew = (externalValue: string) => {
    setCreatingFor(externalValue);
    setNewValue(externalValue);
    setShowCreateDialog(true);
  };
  
  const confirmCreate = () => {
    if (creatingFor && newValue.trim()) {
      updateMapping(creatingFor, newValue.trim(), true);
      setShowCreateDialog(false);
      setCreatingFor(null);
      setNewValue("");
    }
  };
  
  const handleSelectChange = (externalValue: string, value: string) => {
    if (value === '__create_new__') {
      handleCreateNew(externalValue);
    } else {
      updateMapping(externalValue, value, false);
    }
  };
  
  if (externalValues.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No {title.toLowerCase()} found in uploaded files</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">{title}</h4>
        <div className="flex gap-2 text-xs">
          <Badge variant="outline" className="gap-1">
            <Check className="h-3 w-3 text-green-500" />
            {externalValues.filter(v => ['mapped', 'exact'].includes(getMappingStatus(v))).length} mapped
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Plus className="h-3 w-3 text-blue-500" />
            {externalValues.filter(v => getMappingStatus(v) === 'create').length} to create
          </Badge>
          <Badge variant="outline" className="gap-1">
            <AlertTriangle className="h-3 w-3 text-yellow-500" />
            {externalValues.filter(v => getMappingStatus(v) === 'unmapped').length} unmapped
          </Badge>
        </div>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">External Value</TableHead>
            <TableHead className="w-[20px]"></TableHead>
            <TableHead className="w-[40%]">CaseWyze Value</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {externalValues.map((externalValue) => {
            const mapping = getMapping(externalValue);
            const status = getMappingStatus(externalValue);
            
            return (
              <TableRow key={externalValue}>
                <TableCell className="font-mono text-sm">
                  {externalValue}
                </TableCell>
                <TableCell>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </TableCell>
                <TableCell>
                  <Select
                    value={mapping?.casewyzeValue || ''}
                    onValueChange={(value) => handleSelectChange(externalValue, value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select or create..." />
                    </SelectTrigger>
                    <SelectContent>
                      {picklistValues.map((pv) => (
                        <SelectItem key={pv} value={pv}>
                          {pv}
                        </SelectItem>
                      ))}
                      <SelectItem value="__create_new__" className="text-primary">
                        <span className="flex items-center gap-1">
                          <Plus className="h-3 w-3" />
                          Create new...
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  {status === 'mapped' && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                      <Check className="h-3 w-3 mr-1" />
                      Mapped
                    </Badge>
                  )}
                  {status === 'exact' && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                      <Check className="h-3 w-3 mr-1" />
                      Exact
                    </Badge>
                  )}
                  {status === 'create' && (
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200">
                      <Plus className="h-3 w-3 mr-1" />
                      Create
                    </Badge>
                  )}
                  {status === 'unmapped' && (
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-200">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Unmapped
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      
      {/* Create new value inline dialog */}
      {showCreateDialog && (
        <div className="flex items-center gap-2 p-4 border rounded-lg bg-muted/50">
          <span className="text-sm text-muted-foreground">Create new value for "{creatingFor}":</span>
          <Input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="New picklist value"
            className="max-w-xs"
          />
          <Button size="sm" onClick={confirmCreate}>
            Create
          </Button>
          <Button size="sm" variant="outline" onClick={() => {
            setShowCreateDialog(false);
            setCreatingFor(null);
          }}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
