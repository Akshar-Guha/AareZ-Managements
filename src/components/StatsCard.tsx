import { ReactNode } from "react";

interface StatsCardProps {
  icon: ReactNode;
  title: string;
  value: string | number;
  description: string;
}

export function StatsCard({ icon, title, value, description }: StatsCardProps) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-8 w-8 rounded-md bg-green-100 text-green-600 grid place-items-center">{icon}</div>
        <div className="text-sm text-slate-500">{title}</div>
      </div>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-slate-500">{description}</div>
    </div>
  );
}
