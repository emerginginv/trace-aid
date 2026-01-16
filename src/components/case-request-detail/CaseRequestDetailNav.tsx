import { cn } from "@/lib/utils";

export type RequestDetailTab = 'overview' | 'subjects' | 'files' | 'history';

interface CaseRequestDetailNavProps {
  activeTab: RequestDetailTab;
  onTabChange: (tab: RequestDetailTab) => void;
  subjectsCount: number;
  filesCount: number;
}

const TABS: { id: RequestDetailTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'subjects', label: 'Subjects' },
  { id: 'files', label: 'Files' },
  { id: 'history', label: 'History' },
];

export function CaseRequestDetailNav({
  activeTab,
  onTabChange,
  subjectsCount,
  filesCount,
}: CaseRequestDetailNavProps) {
  const getTabLabel = (tab: { id: RequestDetailTab; label: string }) => {
    if (tab.id === 'subjects' && subjectsCount > 0) {
      return `${tab.label} (${subjectsCount})`;
    }
    if (tab.id === 'files' && filesCount > 0) {
      return `${tab.label} (${filesCount})`;
    }
    return tab.label;
  };

  return (
    <div className="border-b border-border">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
            )}
          >
            {getTabLabel(tab)}
          </button>
        ))}
      </nav>
    </div>
  );
}
