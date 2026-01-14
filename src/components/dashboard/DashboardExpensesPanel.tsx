import React from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, X } from 'lucide-react';
import { DashboardExpense } from '@/hooks/useDashboardData';
import { BasePanel, PanelListItem } from '@/components/shared/Panel';
import { UserAvatar } from '@/components/shared/UserAvatar';

interface DashboardExpensesPanelProps {
  expenses: DashboardExpense[];
  filter: 'my' | 'all';
  onFilterChange: (filter: 'my' | 'all') => void;
  canViewAll: boolean;
  onExpenseClick: (expense: DashboardExpense) => void;
  expandedId: string | null;
  onExpandedChange: (id: string | null) => void;
  isLoading?: boolean;
}

export function DashboardExpensesPanel({
  expenses,
  filter,
  onFilterChange,
  canViewAll,
  onExpenseClick,
  expandedId,
  onExpandedChange,
  isLoading = false,
}: DashboardExpensesPanelProps) {
  const filterOptions = canViewAll
    ? [
        { value: 'my', label: 'My Expenses' },
        { value: 'all', label: 'All Expenses' },
      ]
    : [];

  return (
    <BasePanel
      title="Recent Expenses"
      count={expenses.length}
      emptyIcon={DollarSign}
      emptyMessage="No recent expenses"
      showFilter={canViewAll}
      filterOptions={filterOptions}
      filterValue={filter}
      onFilterChange={(v) => onFilterChange(v as 'my' | 'all')}
      filterWidth="w-[130px]"
      isLoading={isLoading}
    >
      {expenses.map((expense) => {
        const isExpanded = expandedId === expense.id;

        return (
          <PanelListItem
            key={expense.id}
            onClick={() => onExpandedChange(isExpanded ? null : expense.id)}
            isExpanded={isExpanded}
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium leading-tight truncate">
                    {expense.description}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                      ${expense.amount.toFixed(2)}
                    </span>
                    {isExpanded && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onExpandedChange(null);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(expense.date), 'MMM d, yyyy')}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {expense.category}
                  </Badge>
                  {expense.submittedByName && (
                    <UserAvatar name={expense.submittedByName} size="xs" showName />
                  )}
                </div>
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onExpenseClick(expense);
                      }}
                    >
                      Edit Expense
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </PanelListItem>
        );
      })}
    </BasePanel>
  );
}

export default DashboardExpensesPanel;
