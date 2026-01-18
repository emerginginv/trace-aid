import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

export interface StatCardData {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

interface DashboardStatsCardsProps {
  stats: StatCardData[];
}

export function DashboardStatsCards({ stats }: DashboardStatsCardsProps) {
  return (
    <div className="grid gap-3 grid-cols-2 xl:grid-cols-4">
      {stats.map((stat, index) => (
        <Card key={index} className="relative overflow-hidden min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium truncate min-w-0">{stat.title}</CardTitle>
            <div className={`p-2 rounded-full shrink-0 ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default DashboardStatsCards;
