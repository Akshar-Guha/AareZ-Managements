import { useState, useEffect, ReactNode } from 'react';
import { Input, Select, Button } from "./Field";
import { Filter } from 'lucide-react';

interface FilterPanelProps {
  onApplyFilters: (filters: any) => void;
  onClearFilters: () => void;
  loading: boolean;
  doctorOptions: { label: string; value: string }[];
  monthOptions: { label: string; value: string }[];
  yearOptions: { label: string; value: string }[];
  initialFilters?: any; // Optional: to set initial filter values
}

export function FilterPanel({
  onApplyFilters,
  onClearFilters,
  loading,
  doctorOptions,
  monthOptions,
  yearOptions,
  initialFilters,
}: FilterPanelProps) {
  const [filters, setFilters] = useState(initialFilters || {
    startDate: '',
    endDate: '',
    doctors: 'All Doctors',
    selectedMonth: 'All',
    selectedYear: 'All',
    quickRange: 'This Month' as 'Custom' | 'This Month' | 'Last Month' | 'Last 3 Months' | 'Year to Date' | 'Financial Year'
  });

  useEffect(() => {
    if (initialFilters) {
      setFilters(initialFilters);
    }
  }, [initialFilters]);

  useEffect(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');

    if (filters.quickRange === 'This Month') {
      const next = { ...filters, selectedMonth: m, selectedYear: String(y), startDate: '', endDate: '' };
      setFilters(next);
      onApplyFilters(next);
    } else if (filters.quickRange === 'Last Month') {
      const d = new Date(y, today.getMonth(), 1);
      d.setMonth(d.getMonth() - 1);
      const ym = String(d.getMonth() + 1).padStart(2, '0');
      const next = { ...filters, selectedMonth: ym, selectedYear: String(d.getFullYear()), startDate: '', endDate: '' };
      setFilters(next);
      onApplyFilters(next);
    } else if (filters.quickRange === 'Last 3 Months') {
      const end = new Date(y, today.getMonth() + 1, 0);
      const start = new Date(end);
      start.setMonth(start.getMonth() - 2); // 3 month window inclusive
      start.setDate(1);
      const next = { ...filters, startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10), selectedMonth: 'All' };
      setFilters(next);
      onApplyFilters(next);
    } else if (filters.quickRange === 'Year to Date') {
      const start = new Date(y, 0, 1);
      const end = today;
      const next = { ...filters, startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10), selectedMonth: 'All', selectedYear: String(y) };
      setFilters(next);
      onApplyFilters(next);
    } else if (filters.quickRange === 'Financial Year') {
      // Indian FY: Apr 1 - Mar 31
      const fyStartYear = today.getMonth() + 1 >= 4 ? y : y - 1;
      const start = new Date(fyStartYear, 3, 1);
      const end = new Date(fyStartYear + 1, 2, 31);
      const next = { ...filters, startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10), selectedMonth: 'All', selectedYear: 'All' };
      setFilters(next);
      onApplyFilters(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.quickRange]);

  const handleApply = () => {
    onApplyFilters(filters);
  };

  const handleClear = () => {
    const initial = { startDate: '', endDate: '', doctors: 'All Doctors', selectedMonth: 'All', selectedYear: 'All', quickRange: 'This Month' as const };
    setFilters(initial);
    onClearFilters();
  };

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-500" />
          <span className="font-medium">Filters</span>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <Button disabled={loading} className="bg-slate-100 text-slate-700 hover:bg-slate-200" onClick={handleClear}>Clear</Button>
          <Button disabled={loading} onClick={handleApply}>Apply</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Select label="Quick Range" value={filters.quickRange} onChange={e => setFilters({ ...filters, quickRange: e.target.value as any })} options={[
          { label: 'This Month', value: 'This Month' },
          { label: 'Last Month', value: 'Last Month' },
          { label: 'Last 3 Months', value: 'Last 3 Months' },
          { label: 'Year to Date', value: 'Year to Date' },
          { label: 'Financial Year', value: 'Financial Year' },
          { label: 'Custom', value: 'Custom' },
        ]} />
        <Select label="Doctor" value={filters.doctors} onChange={e => setFilters({ ...filters, doctors: e.target.value })} options={doctorOptions} />
        <Select label="Month" value={filters.selectedMonth} onChange={e => setFilters({ ...filters, selectedMonth: e.target.value })} options={monthOptions} />
        <Select label="Year" value={filters.selectedYear} onChange={e => setFilters({ ...filters, selectedYear: e.target.value })} options={yearOptions} />
        <div className="grid grid-cols-2 gap-2">
          <Input label="Start" type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} disabled={filters.quickRange !== 'Custom'} />
          <Input label="End" type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} disabled={filters.quickRange !== 'Custom'} />
        </div>
      </div>
      <div className="md:hidden flex justify-end gap-2 mt-4">
        <Button disabled={loading} className="bg-slate-100 text-slate-700 hover:bg-slate-200" onClick={handleClear}>Clear</Button>
        <Button disabled={loading} onClick={handleApply}>Apply</Button>
      </div>
      {/* Active filter chips */}
      <div className="flex flex-wrap gap-2 mt-3 text-xs">
        {filters.doctors !== 'All Doctors' && <span className="px-2 py-1 bg-slate-100 rounded">Doctor: {filters.doctors}</span>}
        {filters.selectedMonth !== 'All' && <span className="px-2 py-1 bg-slate-100 rounded">Month: {monthOptions.find(m => m.value === filters.selectedMonth)?.label}</span>}
        {filters.selectedYear !== 'All' && <span className="px-2 py-1 bg-slate-100 rounded">Year: {filters.selectedYear}</span>}
        {(filters.startDate || filters.endDate) && <span className="px-2 py-1 bg-slate-100 rounded">Range: {filters.startDate || '—'} → {filters.endDate || '—'}</span>}
        <span className="px-2 py-1 bg-slate-50 rounded text-slate-600">Preset: {filters.quickRange}</span>
      </div>
    </div>
  );
}
