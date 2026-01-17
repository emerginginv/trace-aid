import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";

/**
 * Case Status Category
 */
export interface CaseStatusCategory {
  id: string;
  organization_id: string;
  name: "New" | "Open" | "Complete" | "Closed";
  description: string | null;
  sort_order: number;
  color: string;
  created_at: string;
  updated_at: string;
}

/**
 * Case Status
 */
export interface CaseStatus {
  id: string;
  organization_id: string;
  category_id: string;
  name: string;
  color: string;
  notes: string | null;
  rank_order: number;
  monitor_due_date: boolean;
  is_active: boolean;
  is_reopenable: boolean;
  is_read_only: boolean;
  is_first_status: boolean;
  workflows: string[];
  created_at: string;
  updated_at: string;
  // Joined data
  category?: CaseStatusCategory;
}

/**
 * Category name type
 */
export type CategoryName = "New" | "Open" | "Complete" | "Closed";

/**
 * Category descriptions for seeding
 */
export const CATEGORY_DESCRIPTIONS: Record<CategoryName, string> = {
  New: "Newly received cases that require review before they are opened",
  Open: "Cases actively being worked, deliverables still outstanding",
  Complete: "All investigative work complete and delivered, but back office work may be required",
  Closed: "Case is closed and no additional work is required",
};

/**
 * Category colors
 */
export const CATEGORY_COLORS: Record<CategoryName, string> = {
  New: "#3b82f6", // blue
  Open: "#22c55e", // green
  Complete: "#f59e0b", // amber
  Closed: "#6b7280", // gray
};

/**
 * Hook to fetch case status categories
 */
export function useCaseStatusCategories() {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ["case-status-categories", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from("case_status_categories")
        .select("*")
        .eq("organization_id", organization.id)
        .order("sort_order");

      if (error) throw error;
      return (data || []) as CaseStatusCategory[];
    },
    enabled: !!organization?.id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch case statuses with category data
 */
export function useCaseStatuses() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  // Fetch categories
  const {
    data: categories = [],
    isLoading: isLoadingCategories,
  } = useCaseStatusCategories();

  // Fetch statuses
  const {
    data: statuses = [],
    isLoading: isLoadingStatuses,
    error,
    refetch,
  } = useQuery({
    queryKey: ["case-statuses", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from("case_statuses")
        .select(`
          *,
          category:case_status_categories(*)
        `)
        .eq("organization_id", organization.id)
        .order("rank_order");

      if (error) throw error;
      return (data || []) as CaseStatus[];
    },
    enabled: !!organization?.id,
    staleTime: 5 * 60 * 1000,
  });

  // === CATEGORY HELPERS ===

  /** Get category by ID */
  const getCategoryById = (categoryId: string): CaseStatusCategory | undefined => {
    return categories.find((c) => c.id === categoryId);
  };

  /** Get category by name */
  const getCategoryByName = (name: CategoryName): CaseStatusCategory | undefined => {
    return categories.find((c) => c.name === name);
  };

  // === STATUS HELPERS ===

  /** Get status by ID */
  const getStatusById = (statusId: string): CaseStatus | undefined => {
    return statuses.find((s) => s.id === statusId);
  };

  /** Get status by name */
  const getStatusByName = (name: string): CaseStatus | undefined => {
    return statuses.find((s) => s.name === name);
  };

  /** Get first status (for case creation) */
  const getFirstStatus = (): CaseStatus | undefined => {
    return statuses.find((s) => s.is_first_status && s.is_active);
  };

  /** Get active statuses */
  const activeStatuses = statuses.filter((s) => s.is_active);

  /** Get statuses by category */
  const getStatusesByCategory = (categoryName: CategoryName): CaseStatus[] => {
    const category = getCategoryByName(categoryName);
    if (!category) return [];
    return statuses.filter((s) => s.category_id === category.id);
  };

  /** Get statuses by category ID */
  const getStatusesByCategoryId = (categoryId: string): CaseStatus[] => {
    return statuses.filter((s) => s.category_id === categoryId);
  };

  // === STATUS BEHAVIOR HELPERS ===

  /** Check if status is read-only */
  const isReadOnly = (statusId: string): boolean => {
    const status = getStatusById(statusId);
    return status?.is_read_only ?? false;
  };

  /** Check if status monitors due date */
  const monitorsDueDate = (statusId: string): boolean => {
    const status = getStatusById(statusId);
    return status?.monitor_due_date ?? true;
  };

  /** Check if case can be reopened from this status */
  const isReopenable = (statusId: string): boolean => {
    const status = getStatusById(statusId);
    return status?.is_reopenable ?? true;
  };

  /** Check if status is in a "closed" category (Complete or Closed) */
  const isClosedCategory = (statusId: string): boolean => {
    const status = getStatusById(statusId);
    if (!status?.category) return false;
    return status.category.name === "Complete" || status.category.name === "Closed";
  };

  /** Get status color */
  const getStatusColor = (statusId: string): string => {
    const status = getStatusById(statusId);
    return status?.color || "#6366f1";
  };

  /** Get status display name */
  const getStatusDisplayName = (statusId: string): string => {
    const status = getStatusById(statusId);
    return status?.name || "Unknown";
  };

  // === NAVIGATION HELPERS ===

  /** Get next status in rank order */
  const getNextStatus = (currentStatusId: string): CaseStatus | undefined => {
    const current = getStatusById(currentStatusId);
    if (!current) return undefined;
    
    // Find next active status within same category first, then across categories
    const sameCategory = activeStatuses
      .filter((s) => s.category_id === current.category_id && s.rank_order > current.rank_order)
      .sort((a, b) => a.rank_order - b.rank_order)[0];
    
    if (sameCategory) return sameCategory;

    // If no more in same category, find first in next category
    const currentCategory = getCategoryById(current.category_id);
    if (!currentCategory) return undefined;

    const nextCategories = categories
      .filter((c) => c.sort_order > currentCategory.sort_order)
      .sort((a, b) => a.sort_order - b.sort_order);

    for (const cat of nextCategories) {
      const firstInCat = activeStatuses
        .filter((s) => s.category_id === cat.id)
        .sort((a, b) => a.rank_order - b.rank_order)[0];
      if (firstInCat) return firstInCat;
    }

    return undefined;
  };

  /** Get previous status in rank order */
  const getPrevStatus = (currentStatusId: string): CaseStatus | undefined => {
    const current = getStatusById(currentStatusId);
    if (!current) return undefined;
    
    // Find prev active status within same category first, then across categories
    const sameCategory = activeStatuses
      .filter((s) => s.category_id === current.category_id && s.rank_order < current.rank_order)
      .sort((a, b) => b.rank_order - a.rank_order)[0];
    
    if (sameCategory) return sameCategory;

    // If no more in same category, find last in prev category
    const currentCategory = getCategoryById(current.category_id);
    if (!currentCategory) return undefined;

    const prevCategories = categories
      .filter((c) => c.sort_order < currentCategory.sort_order)
      .sort((a, b) => b.sort_order - a.sort_order);

    for (const cat of prevCategories) {
      const lastInCat = activeStatuses
        .filter((s) => s.category_id === cat.id)
        .sort((a, b) => b.rank_order - a.rank_order)[0];
      if (lastInCat) return lastInCat;
    }

    return undefined;
  };

  // === SEED CATEGORIES ===

  const seedCategories = async () => {
    if (!organization?.id) return;

    const categoryNames: CategoryName[] = ["New", "Open", "Complete", "Closed"];
    
    for (let i = 0; i < categoryNames.length; i++) {
      const name = categoryNames[i];
      const { error } = await supabase
        .from("case_status_categories")
        .upsert({
          organization_id: organization.id,
          name,
          description: CATEGORY_DESCRIPTIONS[name],
          sort_order: i,
          color: CATEGORY_COLORS[name],
        }, {
          onConflict: "organization_id,name",
        });

      if (error) {
        console.error(`Error seeding category ${name}:`, error);
      }
    }

    queryClient.invalidateQueries({ queryKey: ["case-status-categories"] });
  };

  return {
    // Raw data
    categories,
    statuses,
    activeStatuses,

    // Category helpers
    getCategoryById,
    getCategoryByName,

    // Status helpers
    getStatusById,
    getStatusByName,
    getFirstStatus,
    getStatusesByCategory,
    getStatusesByCategoryId,

    // Behavior helpers
    isReadOnly,
    monitorsDueDate,
    isReopenable,
    isClosedCategory,
    getStatusColor,
    getStatusDisplayName,

    // Navigation helpers
    getNextStatus,
    getPrevStatus,

    // Actions
    seedCategories,
    refetch,

    // Loading states
    isLoading: isLoadingCategories || isLoadingStatuses,
    error,
  };
}

/**
 * Hook for case status mutations (CRUD operations)
 */
export function useCaseStatusMutations() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["case-statuses"] });
    queryClient.invalidateQueries({ queryKey: ["case-status-categories"] });
  };

  // Create status
  const createStatus = useMutation({
    mutationFn: async (status: Omit<CaseStatus, "id" | "created_at" | "updated_at" | "category">) => {
      const { data, error } = await supabase
        .from("case_statuses")
        .insert(status)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateQueries();
      toast.success("Status created successfully");
    },
    onError: (error) => {
      console.error("Error creating status:", error);
      toast.error("Failed to create status");
    },
  });

  // Update status
  const updateStatus = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CaseStatus> & { id: string }) => {
      const { data, error } = await supabase
        .from("case_statuses")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateQueries();
      toast.success("Status updated successfully");
    },
    onError: (error) => {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    },
  });

  // Delete status
  const deleteStatus = useMutation({
    mutationFn: async (id: string) => {
      // Check if status is in use
      const { count } = await supabase
        .from("cases")
        .select("*", { count: "exact", head: true })
        .eq("current_status_id", id);

      if (count && count > 0) {
        throw new Error(`Cannot delete status: it is used by ${count} cases`);
      }

      const { error } = await supabase
        .from("case_statuses")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateQueries();
      toast.success("Status deleted successfully");
    },
    onError: (error: Error) => {
      console.error("Error deleting status:", error);
      toast.error(error.message || "Failed to delete status");
    },
  });

  // Update rank orders (for drag-and-drop)
  const updateRankOrders = useMutation({
    mutationFn: async (updates: Array<{ id: string; rank_order: number }>) => {
      for (const update of updates) {
        const { error } = await supabase
          .from("case_statuses")
          .update({ rank_order: update.rank_order })
          .eq("id", update.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidateQueries();
      toast.success("Order saved successfully");
    },
    onError: (error) => {
      console.error("Error updating rank orders:", error);
      toast.error("Failed to update order");
    },
  });

  return {
    createStatus,
    updateStatus,
    deleteStatus,
    updateRankOrders,
  };
}
