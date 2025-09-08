import { useEffect, useRef, useState } from 'react';
import { API } from '@/lib/api';
import { Button } from '@/components/Field';
import { RefreshCw, Download, BarChart3, Users } from 'lucide-react';
import { StatsCard } from '@/components/StatsCard';
import { FilterPanel } from '@/components/FilterPanel';
import { ChartWrapper } from '@/components/ChartWrapper';
import { ChartConfiguration } from 'chart.js/auto';

type SummaryResponse = { totalInvestments: number; totalExpected: number; totalActual: number };
type MonthlySummaryResponse = { labels: string[]; amounts: number[]; actuals: number[] };
type Investment = {
  id: number;
  doctor_id?: number | null;
  doctor_code?: string | null;
  doctor_name?: string | null;
  amount: number | string;
  investment_date: string;
  expected_returns?: number | string | null;
  actual_returns?: number | string | null;
  preferences?: string[] | null;
  notes?: string | null;
  created_by?: number | null;
  created_at?: string | null;
};
type Doctor = { id: number; code: string; name: string; specialty?: string | null; created_at: string };

export default function Analytics() {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    doctors: 'All Doctors',
    selectedMonth: 'All',
    selectedYear: 'All',
    quickRange: 'This Month' as 'Custom' | 'This Month' | 'Last Month' | 'Last 3 Months' | 'Year to Date' | 'Financial Year'
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [stats, setStats] = useState<{ totalInvestments: number; totalReturns: number; roi: number } | null>(null);
  const [topDoctors, setTopDoctors] = useState<Array<{ name: string; id: string; amount: number; returns: number }>>([]);
  const [activeDoctorCount, setActiveDoctorCount] = useState<number>(0);
  const [doctorOptions, setDoctorOptions] = useState<{ label: string; value: string }[]>([
    { label: 'All Doctors', value: 'All Doctors' }
  ]);
  const [loading, setLoading] = useState(false);

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i >= currentYear - 10; i--) {
      years.push({ label: String(i), value: String(i) });
    }
    return [{ label: 'All', value: 'All' }, ...years];
  };

  const monthOptions = [
    { label: 'All', value: 'All' },
    { label: 'January', value: '01' },
    { label: 'February', value: '02' },
    { label: 'March', value: '03' },
    { label: 'April', value: '04' },
    { label: 'May', value: '05' },
    { label: 'June', value: '06' },
    { label: 'July', value: '07' },
    { label: 'August', value: '08' },
    { label: 'September', value: '09' },
    { label: 'October', value: '10' },
    { label: 'November', value: '11' },
    { label: 'December', value: '12' },
  ];

  // Load doctors for filter
  useEffect(() => {
    API.get<Doctor[]>('/doctors').then((docs) => {
      const opts = [{ label: 'All Doctors', value: 'All Doctors' }, ...docs.map(d => ({ label: `${d.name} (${d.code})`, value: d.code || d.name }))];
      setDoctorOptions(opts);
    }).catch(() => {
      setDoctorOptions([{ label: 'All Doctors', value: 'All Doctors' }]);
    });
  }, []);

  const [mainChartConfig, setMainChartConfig] = useState<ChartConfiguration | null>(null);
  const [timelineChartConfig, setTimelineChartConfig] = useState<ChartConfiguration | null>(null);
  const [topDoctorsChartConfig, setTopDoctorsChartConfig] = useState<ChartConfiguration | null>(null);

  useEffect(() => {
    const queryParams = new URLSearchParams();
    if (appliedFilters.selectedMonth !== 'All') {
      queryParams.append('month', appliedFilters.selectedMonth);
    }
    if (appliedFilters.selectedYear !== 'All') {
      queryParams.append('year', appliedFilters.selectedYear);
    }
    if (appliedFilters.startDate) {
      queryParams.append('startDate', appliedFilters.startDate);
    }
    if (appliedFilters.endDate) {
      queryParams.append('endDate', appliedFilters.endDate);
    }
    if (appliedFilters.doctors !== 'All Doctors') {
      queryParams.append('doctor', appliedFilters.doctors);
    }

    const queryString = queryParams.toString();
    const summaryUrl = `/investments/summary?${queryString}`;
    const chartDataUrl = `/investments/summary-by-month?${queryString}`;
    const allInvestmentsUrl = `/investments?${queryString}`;

    setLoading(true);
    Promise.all([
      API.get<SummaryResponse>(summaryUrl),
      API.get<MonthlySummaryResponse>(chartDataUrl),
      API.get<Investment[]>(allInvestmentsUrl)
    ]).then(([summaryData, chartData, allInvestments]) => {
      setStats({
        totalInvestments: summaryData.totalInvestments || 0,
        totalReturns: summaryData.totalActual || 0,
        roi: summaryData.totalInvestments > 0 ?
          (summaryData.totalActual / summaryData.totalInvestments) * 100 : 0
      });

      // Group by doctor and calculate totals (for current filter)
      const doctorMap = new Map<string, { name: string; id: string; amount: number; returns: number }>();
      (allInvestments as Investment[]).forEach((inv: Investment) => {
        const key = inv.doctor_code || inv.doctor_name || 'Unknown';
        if (!doctorMap.has(key)) {
          doctorMap.set(key, { name: inv.doctor_name || key, id: (inv.doctor_code || key) as string, amount: 0, returns: 0 });
        }
        const doc = doctorMap.get(key)!;
        doc.amount += Number(inv.amount || 0);
        doc.returns += Number(inv.actual_returns || 0);
      });
      const computedTopDoctors = Array.from(doctorMap.values()).sort((a, b) => b.amount - a.amount).slice(0, 5);
      setTopDoctors(computedTopDoctors);
      setActiveDoctorCount(doctorMap.size);

      // Main chart
      setMainChartConfig({
        type: 'bar',
        data: {
          labels: chartData.labels,
          datasets: [
            { label: 'Investment', backgroundColor: '#6366f1', data: chartData.amounts },
            { label: 'Actual Returns', backgroundColor: '#22c55e', data: chartData.actuals },
          ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
      });

      // Timeline chart
      const sorted = [...(allInvestments as Investment[])].sort((a: Investment, b: Investment) => new Date(a.investment_date).getTime() - new Date(b.investment_date).getTime());
      const last = sorted.slice(-20);
      setTimelineChartConfig({
        type: 'line',
        data: {
          labels: last.map((inv: Investment) => inv.investment_date),
          datasets: [{
            label: 'Investment Timeline',
            data: last.map((inv: Investment) => Number(inv.amount)),
            borderColor: '#3b82f6',
            backgroundColor: '#3b82f6',
            tension: 0.4
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });

      // Top doctors chart
      if (computedTopDoctors.length > 0) {
        setTopDoctorsChartConfig({
          type: 'doughnut',
          data: {
            labels: computedTopDoctors.map(d => d.name),
            datasets: [{
              data: computedTopDoctors.map(d => d.amount),
              backgroundColor: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6']
            }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
      } else {
        setTopDoctorsChartConfig(null);
      }
    }).catch((err) => {
      console.error('Failed to load analytics data:', err);
      setStats({ totalInvestments: 0, totalReturns: 0, roi: 0 });
      setTopDoctors([]);
      setActiveDoctorCount(0);
      setMainChartConfig(null);
      setTimelineChartConfig(null);
      setTopDoctorsChartConfig(null);
    }).finally(() => {
      setLoading(false);
    });
  }, [appliedFilters]);

  // INR helpers
  const formatINR = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
  const percent = (v: any) => `${Number(v || 0).toFixed(2)}%`;

  const handleApplyFilters = (newFilters: any) => {
    setFilters(newFilters);
    setAppliedFilters(newFilters);
  };

  const handleClearFilters = () => {
    const initialFilters = { startDate: '', endDate: '', doctors: 'All Doctors', selectedMonth: 'All', selectedYear: 'All', quickRange: 'This Month' as const };
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
  };

  // Quick range effects (now handled by FilterPanel, can remove from here)
  // useEffect(() => {
  //   const today = new Date();
  //   const y = today.getFullYear();
  //   const m = String(today.getMonth() + 1).padStart(2, '0');

  //   if (filters.quickRange === 'This Month') {
  //     const next = { ...filters, selectedMonth: m, selectedYear: String(y), startDate: '', endDate: '' };
  //     setFilters(next);
  //     setAppliedFilters(next);
  //   } else if (filters.quickRange === 'Last Month') {
  //     const d = new Date(y, today.getMonth(), 1);
  //     d.setMonth(d.getMonth() - 1);
  //     const ym = String(d.getMonth() + 1).padStart(2, '0');
  //     const next = { ...filters, selectedMonth: ym, selectedYear: String(d.getFullYear()), startDate: '', endDate: '' };
  //     setFilters(next);
  //     setAppliedFilters(next);
  //   } else if (filters.quickRange === 'Last 3 Months') {
  //     const end = new Date(y, today.getMonth() + 1, 0);
  //     const start = new Date(end);
  //     start.setMonth(start.getMonth() - 2); // 3 month window inclusive
  //     start.setDate(1);
  //     const next = { ...filters, startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10), selectedMonth: 'All' };
  //     setFilters(next);
  //     setAppliedFilters(next);
  //   } else if (filters.quickRange === 'Year to Date') {
  //     const start = new Date(y, 0, 1);
  //     const end = today;
  //     const next = { ...filters, startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10), selectedMonth: 'All', selectedYear: String(y) };
  //     setFilters(next);
  //     setAppliedFilters(next);
  //   } else if (filters.quickRange === 'Financial Year') {
  //     // Indian FY: Apr 1 - Mar 31
  //     const fyStartYear = today.getMonth() + 1 >= 4 ? y : y - 1;
  //     const start = new Date(fyStartYear, 3, 1);
  //     const end = new Date(fyStartYear + 1, 2, 31);
  //     const next = { ...filters, startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10), selectedMonth: 'All', selectedYear: 'All' };
  //     setFilters(next);
  //     setAppliedFilters(next);
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [filters.quickRange]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Analytics Dashboard</h1>
          <p className="text-slate-600">Visual insights into your pharmaceutical investments</p>
        </div>
        <div className="flex gap-2">
          <Button disabled={loading} className="bg-slate-100 text-slate-700 hover:bg-slate-200" onClick={() => setAppliedFilters({ ...appliedFilters })}><RefreshCw size={16} /> Refresh</Button>
          <Button disabled={loading} className="bg-slate-100 text-slate-700 hover:bg-slate-200" onClick={async () => {
            const queryParams = new URLSearchParams();
            if (appliedFilters.selectedMonth !== 'All') queryParams.append('month', appliedFilters.selectedMonth);
            if (appliedFilters.selectedYear !== 'All') queryParams.append('year', appliedFilters.selectedYear);
            if (appliedFilters.startDate) queryParams.append('startDate', appliedFilters.startDate);
            if (appliedFilters.endDate) queryParams.append('endDate', appliedFilters.endDate);
            if (appliedFilters.doctors !== 'All Doctors') queryParams.append('doctor', appliedFilters.doctors);
            const data = await API.get<Investment[]>(`/investments?${queryParams.toString()}`);
            const headers = ['doctor_code', 'doctor_name', 'amount', 'investment_date', 'expected_returns', 'actual_returns'];
            const rows = data.map(inv => [
              inv.doctor_code ?? '',
              inv.doctor_name ?? '',
              inv.amount ?? '',
              inv.investment_date ?? '',
              inv.expected_returns ?? '',
              inv.actual_returns ?? ''
            ].map(v => JSON.stringify(v)).join(','));
            const csv = [headers.join(','), ...rows].join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'investments.csv';
            a.click();
            URL.revokeObjectURL(url);
          }}><Download size={16} /> Export</Button>
        </div>
      </div>
      {loading && <div className="text-sm text-slate-500">Loading analytics…</div>}

      {/* Filters */}
      <FilterPanel
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
        loading={loading}
        doctorOptions={doctorOptions}
        monthOptions={monthOptions}
        yearOptions={generateYearOptions()}
        initialFilters={filters} // Pass current filters to keep state in sync
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon="₹"
          title="Total Investment"
          value={formatINR(Number(stats?.totalInvestments || 0))}
          description="Investments during selected period"
        />

        <StatsCard
          icon="📈"
          title="Total Returns"
          value={formatINR(Number(stats?.totalReturns || 0))}
          description="Actual returns realised"
        />

        <StatsCard
          icon="%"
          title="ROI Percentage"
          value={percent(stats?.roi || 0)}
          description="Return on Investment"
        />

        <StatsCard
          icon="👥"
          title="Active Doctors"
          value={activeDoctorCount}
          description="Distinct partners in selection"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Investment Timeline */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-slate-600" />
            <h3 className="font-semibold">Investment Timeline</h3>
          </div>
          {timelineChartConfig && <ChartWrapper config={timelineChartConfig} />}
        </div>

        {/* Top Performing Doctors */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-slate-600" />
            <h3 className="font-semibold">Top Performing Doctors</h3>
          </div>
          <div className="space-y-3 mb-4">
            {topDoctors.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{doc.name}</div>
                  <div className="text-xs text-slate-500">ID: {doc.id}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">₹{Number(doc.amount).toLocaleString()}</div>
                  <div className="text-xs text-green-600">Returns: ₹{Number(doc.returns).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
          {topDoctorsChartConfig && <ChartWrapper config={topDoctorsChartConfig} height="h-32" />}
        </div>
      </div>

      {/* Main Investment Chart */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="font-semibold mb-4">Monthly Investment Overview</h3>
        {mainChartConfig && <ChartWrapper config={mainChartConfig} />}
      </div>
    </div>
  );
}
