import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Wallet, Receipt, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const financeRoutes = [
  { path: "/retainers", label: "Retainers", icon: Wallet },
  { path: "/expenses", label: "Expenses", icon: Receipt },
  { path: "/invoices", label: "Invoices", icon: FileText },
];

export function FinanceNavTabs() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit">
      {financeRoutes.map((route) => {
        const Icon = route.icon;
        const isActive = location.pathname === route.path;
        
        return (
          <Button
            key={route.path}
            variant={isActive ? "secondary" : "ghost"}
            size="sm"
            onClick={() => navigate(route.path)}
            className={cn(
              "gap-2",
              isActive && "bg-background shadow-sm"
            )}
          >
            <Icon className="h-4 w-4" />
            {route.label}
          </Button>
        );
      })}
    </div>
  );
}
