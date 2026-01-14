import React from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, ChevronDown, ChevronUp, X } from 'lucide-react';
import { DashboardExpense } from '@/hooks/useDashboardData';

interface DashboardExpensesPanelProps {
  expenses: DashboardExpense[];
  filter: 'my' | 'all';
  onFilterChange: (filter: 'my' | 'all') => void;
  canViewAll: boolean;
  onExpenseClick: (expense: DashboardExpense) => void;
  expandedId: string | null;
  onExpandedChange: (id: string | null) => void;
}

function getUserInitials(name: string | null) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function DashboardExpensesPanel({
  expenses,
  filter,
  onFilterChange,
  canViewAll,
  onExpenseClick,
  expandedId,
  onExpandedChange,
}: DashboardExpensesPanelProps) {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-3">
          <CardTitle className="text-base font-semibold">Recent Expenses</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {expenses.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {canViewAll && (
            <Select value={filter} onValueChange={(v) => onFilterChange(v as 'my' | 'all')}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="my">My Expenses</SelectItem>
                <SelectItem value="all">All Expenses</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8 p-0"
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {!collapsed && (
        <CardContent className="pt-0">
          {expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <DollarSign className="h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No recent expenses</p>
            </div>
          ) : (
            <div className="space-y-2">
              {expenses.map((expense) => {
                const isExpanded = expandedId === expense.id;

                return (
                  <div
                    key={expense.id}
                    className={`p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors ${
                      isExpanded ? 'ring-1 ring-primary/20' : ''
                    }`}
                    onClick={() => onExpandedChange(isExpanded ? null : expense.id)}
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
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium">
                                {getUserInitials(expense.submittedByName)}
                              </span>
                              {expense.submittedByName.split(' ')[0]}
                            </span>
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
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default DashboardExpensesPanel;
