import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '@/lib/api';
import { TrendingUp, Users, Package, Calendar, Plus, BarChart3, UserCog } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  interface RecentInvestment {
  id: number;
  doctor_name: string;
  doctor_code: string;
  amount: number;
  investment_date: string;
}
const [recentInvestments, setRecentInvestments] = useState<RecentInvestment[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      API.get('/dashboard/stats'),
      API.get<RecentInvestment[]>('/investments/recent')
    ]).then(([s, r]) => {
      setStats(s);
      setRecentInvestments(r as RecentInvestment[]);
    }).catch((err) => {
      console.error('Failed to load dashboard data:', err);
      // Set empty state when API fails
      setStats({ totalInvestments: 0, activeDoctors: 0, products: 0, roi: 0 });
      setRecentInvestments([]);
    });
  }, []);

  const currentMonth = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Welcome back, Admin User!</h1>
          <p className="text-slate-600">Here's your pharmaceutical business overview</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">Role: ADMIN</span>
          <button className="text-indigo-600 hover:underline">Refresh</button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-md bg-green-100 text-green-600 grid place-items-center">
              <TrendingUp size={16} />
            </div>
            <div className="text-sm text-slate-500">Total Investments</div>
          </div>
          <div className="text-2xl font-semibold">{stats?.totalInvestments || 6}</div>
          <div className="text-xs text-green-600">↑ +15% vs last month</div>
        </div>
        
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-md bg-blue-100 text-blue-600 grid place-items-center">
              <Users size={16} />
            </div>
            <div className="text-sm text-slate-500">Active Doctors</div>
          </div>
          <div className="text-2xl font-semibold">{stats?.activeDoctors || 6}</div>
          <div className="text-xs text-blue-600">↑ +5% vs last month</div>
        </div>
        
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-md bg-purple-100 text-purple-600 grid place-items-center">
              <Package size={16} />
            </div>
            <div className="text-sm text-slate-500">Products</div>
          </div>
          <div className="text-2xl font-semibold">{stats?.products || 3}</div>
          <div className="text-xs text-purple-600">↑ +8% vs last month</div>
        </div>
        
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-md bg-orange-100 text-orange-600 grid place-items-center">
              <Calendar size={16} />
            </div>
            <div className="text-sm text-slate-500">This Month</div>
          </div>
          <div className="text-2xl font-semibold">{currentMonth}</div>
          <div className="text-xs text-orange-600">↑ Active vs last month</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Investments */}
        <div className="lg:col-span-2 bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Investments</h2>
            <button onClick={() => navigate('/investments')} className="text-indigo-600 hover:underline text-sm">View All</button>
          </div>
          <div className="space-y-3">
            {recentInvestments.slice(0, 5).map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 border rounded-md">
                <div>
                  <div className="font-medium">{inv.doctor_name}</div>
                  <div className="text-sm text-slate-500">Dr. ID: {inv.doctor_code}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-green-600">₹{Number(inv.amount).toLocaleString()}</div>
                  <div className="text-xs text-slate-500">{inv.investment_date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button onClick={() => navigate('/investments')} className="w-full flex items-center gap-3 p-3 rounded-md bg-indigo-600 text-white hover:bg-indigo-700">
              <Plus size={16} />
              <span>Add Investment</span>
            </button>
            <button onClick={() => navigate('/analytics')} className="w-full flex items-center gap-3 p-3 rounded-md border hover:bg-slate-50">
              <BarChart3 size={16} />
              <span>View Analytics</span>
            </button>
            <button onClick={() => navigate('/products')} className="w-full flex items-center gap-3 p-3 rounded-md border hover:bg-slate-50">
              <Package size={16} />
              <span>Products</span>
            </button>
            <button onClick={() => navigate('/doctors')} className="w-full flex items-center gap-3 p-3 rounded-md border hover:bg-slate-50">
              <UserCog size={16} />
              <span>Manage Doctors</span>
            </button>
          </div>
        </div>
      </div>

      {/* Business Insights */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
          <div className="text-green-800 font-medium">Investment Growth</div>
          <div className="text-2xl font-semibold text-green-900">+24%</div>
          <div className="text-sm text-green-700">This quarter</div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
          <div className="text-blue-800 font-medium">Doctor Engagement</div>
          <div className="text-2xl font-semibold text-blue-900">89%</div>
          <div className="text-sm text-blue-700">Active rate</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
          <div className="text-purple-800 font-medium">ROI Average</div>
          <div className="text-2xl font-semibold text-purple-900">{stats?.roi || 18.5}%</div>
          <div className="text-sm text-purple-700">Yearly return</div>
        </div>
      </div>
    </div>
  );
}
