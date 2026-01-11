import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlanKey } from "@/lib/planLimits";
import {
  PLAN_FEATURES,
  FEATURE_CATEGORIES,
  getFeaturesByCategory,
  FeatureCategory,
} from "@/lib/planFeatures";

interface PlanFeatureMatrixProps {
  currentPlanKey?: PlanKey | null;
}

const PLAN_DISPLAY_NAMES: Record<PlanKey, string> = {
  solo: "The Investigator",
  team: "The Agency",
  enterprise: "The Enterprise",
};

const PLAN_ORDER: PlanKey[] = ["solo", "team", "enterprise"];

export function PlanFeatureMatrix({ currentPlanKey }: PlanFeatureMatrixProps) {
  const featuresByCategory = getFeaturesByCategory();
  const categories = Object.keys(FEATURE_CATEGORIES) as FeatureCategory[];

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 font-semibold text-foreground w-[40%]">
              Feature
            </th>
            {PLAN_ORDER.map((planKey) => (
              <th
                key={planKey}
                className={cn(
                  "text-center py-3 px-4 font-semibold w-[20%]",
                  currentPlanKey === planKey
                    ? "bg-primary/10 text-primary"
                    : "text-foreground"
                )}
              >
                <div className="flex flex-col items-center gap-1">
                  <span>{PLAN_DISPLAY_NAMES[planKey]}</span>
                  {currentPlanKey === planKey && (
                    <span className="text-xs font-normal text-muted-foreground">
                      (Current)
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => {
            const features = featuresByCategory[category];
            if (features.length === 0) return null;

            return (
              <>
                {/* Category Header */}
                <tr key={`header-${category}`} className="bg-muted/50">
                  <td
                    colSpan={4}
                    className="py-3 px-4 font-semibold text-foreground"
                  >
                    {FEATURE_CATEGORIES[category]}
                  </td>
                </tr>
                {/* Feature Rows */}
                {features.map((feature, idx) => (
                  <tr
                    key={feature.id}
                    className={cn(
                      "border-b border-border/50 hover:bg-muted/30 transition-colors",
                      idx === features.length - 1 && "border-b-0"
                    )}
                  >
                    <td className="py-3 px-4 text-foreground">
                      <span className="flex items-center gap-2">
                        {feature.name}
                      </span>
                      {feature.description && (
                        <span className="text-xs text-muted-foreground block mt-0.5">
                          {feature.description}
                        </span>
                      )}
                    </td>
                    {PLAN_ORDER.map((planKey) => {
                      const isAvailable =
                        planKey === "solo"
                          ? feature.solo
                          : planKey === "team"
                          ? feature.team
                          : feature.enterprise;
                      const isCurrentPlan = currentPlanKey === planKey;

                      return (
                        <td
                          key={`${feature.id}-${planKey}`}
                          className={cn(
                            "text-center py-3 px-4",
                            isCurrentPlan && "bg-primary/5"
                          )}
                        >
                          {isAvailable ? (
                            <Check className="w-5 h-5 text-green-600 dark:text-green-500 mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-red-500 dark:text-red-400 mx-auto" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default PlanFeatureMatrix;
