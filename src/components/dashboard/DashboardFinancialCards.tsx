import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

export interface FinancialCardData {
  title: string;
  value: number;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  formatter?: (value: number) => string;
}

interface DashboardFinancialCardsProps {
  cards: FinancialCardData[];
}

const defaultFormatter = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export function DashboardFinancialCards({ cards }: DashboardFinancialCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((card, index) => (
        <Card key={index} className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <div className={`p-2 rounded-full ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(card.formatter || defaultFormatter)(card.value)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default DashboardFinancialCards;
