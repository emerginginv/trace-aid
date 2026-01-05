import { useState } from "react";
import { format } from "date-fns";
import { Calendar, Search, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { ReportFilterConfig } from "@/lib/analytics/reports/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";

interface ReportFiltersProps {
  config: ReportFilterConfig[];
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  onReset: () => void;
}

export function ReportFilters({ config, values, onChange, onReset }: ReportFiltersProps) {
  const { organization } = useOrganization();
  
  // Fetch clients for client filter
  const { data: clients } = useQuery({
    queryKey: ["accounts-filter", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data } = await supabase
        .from("accounts")
        .select("id, name")
        .eq("organization_id", organization.id)
        .order("name");
      return data || [];
    },
    enabled: !!organization?.id && config.some((f) => f.type === "client"),
  });
  
  // Fetch investigators for investigator filter (two-step query to avoid embedding issues)
  const { data: investigators } = useQuery({
    queryKey: ["investigators-filter", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      // Step 1: Get member user IDs
      const { data: members } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", organization.id);
      
      if (!members || members.length === 0) return [];
      
      // Step 2: Get profiles for those user IDs
      const userIds = members.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      
      return profiles?.map((p) => ({
        id: p.id,
        name: p.full_name || p.email || "Unknown",
      })) || [];
    },
    enabled: !!organization?.id && config.some((f) => f.type === "investigator"),
  });
  
  // Fetch cases for case filter
  const { data: cases } = useQuery({
    queryKey: ["cases-filter", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data } = await supabase
        .from("cases")
        .select("id, case_number, title")
        .eq("organization_id", organization.id)
        .order("case_number", { ascending: false })
        .limit(100);
      return data || [];
    },
    enabled: !!organization?.id && config.some((f) => f.type === "case"),
  });
  
  const handleChange = (key: string, value: unknown) => {
    onChange({ ...values, [key]: value });
  };
  
  const handleDateRangeChange = (key: string, field: "start" | "end", date: Date | undefined) => {
    const current = (values[key] as { start?: Date; end?: Date }) || {};
    onChange({
      ...values,
      [key]: { ...current, [field]: date },
    });
  };
  
  const activeFilterCount = Object.values(values).filter(
    (v) => v !== undefined && v !== null && v !== ""
  ).length;
  
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        {config.map((filter) => (
          <div key={filter.key} className="flex flex-col gap-1.5 min-w-[180px]">
            <Label className="text-sm">{filter.label}</Label>
            {renderFilterInput(filter, values, handleChange, handleDateRangeChange, {
              clients,
              investigators,
              cases,
            })}
          </div>
        ))}
      </div>
      
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{activeFilterCount} filter(s) active</Badge>
          <Button variant="ghost" size="sm" onClick={onReset}>
            <X className="h-3 w-3 mr-1" />
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}

function renderFilterInput(
  filter: ReportFilterConfig,
  values: Record<string, unknown>,
  handleChange: (key: string, value: unknown) => void,
  handleDateRangeChange: (key: string, field: "start" | "end", date: Date | undefined) => void,
  data: {
    clients?: { id: string; name: string }[];
    investigators?: { id: string; name: string }[];
    cases?: { id: string; case_number: string; title: string }[];
  }
) {
  const value = values[filter.key];
  
  switch (filter.type) {
    case "date_range": {
      const dateValue = value as { start?: Date; end?: Date } | undefined;
      return (
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-[130px] justify-start">
                <Calendar className="h-3 w-3 mr-2" />
                {dateValue?.start ? format(dateValue.start, "MMM d, yyyy") : "Start date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={dateValue?.start}
                onSelect={(date) => handleDateRangeChange(filter.key, "start", date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground">to</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-[130px] justify-start">
                <Calendar className="h-3 w-3 mr-2" />
                {dateValue?.end ? format(dateValue.end, "MMM d, yyyy") : "End date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={dateValue?.end}
                onSelect={(date) => handleDateRangeChange(filter.key, "end", date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      );
    }
    
    case "select":
      return (
        <Select
          value={value as string || "all"}
          onValueChange={(v) => handleChange(filter.key, v === "all" ? undefined : v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {filter.options?.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    
    case "client":
      return (
        <Select
          value={value as string || "all"}
          onValueChange={(v) => handleChange(filter.key, v === "all" ? undefined : v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {data.clients?.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    
    case "investigator":
      return (
        <Select
          value={value as string || "all"}
          onValueChange={(v) => handleChange(filter.key, v === "all" ? undefined : v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All investigators" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All investigators</SelectItem>
            {data.investigators?.map((inv) => (
              <SelectItem key={inv.id} value={inv.id}>
                {inv.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    
    case "case":
      return (
        <Select
          value={value as string || "all"}
          onValueChange={(v) => handleChange(filter.key, v === "all" ? undefined : v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All cases" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All cases</SelectItem>
            {data.cases?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.case_number} - {c.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    
    case "search":
      return (
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search..."
            value={value as string || ""}
            onChange={(e) => handleChange(filter.key, e.target.value || undefined)}
          />
        </div>
      );
    
    default:
      return null;
  }
}
