import { useAuth } from '@/stores/useAuthStore';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { InvestmentCard } from '@/components/InvestmentCard';
import { StatsCard } from '@/components/StatsCard';

export default function MRDashboard() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  console.log('useAuth in MRDashboard.tsx:', { user, isLoading });
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    totalRevenue: 0,
    totalInvestments: 0,
    totalProducts: 0,
    totalPharmacies: 0,
    recentInvestments: [],
    topSellingProducts: [],
    newPharmacies: [],
  });

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/sign-in');
    } else if (!isLoading && user && user.role !== 'mr') {
      navigate('/dashboard'); // Redirect non-MR users
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (user && user.role === 'mr') {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const revenueRes = await api.get<any>('/dashboard/revenue');
      const investmentsRes = await api.get<any>('/dashboard/investments');
      const productsRes = await api.get<any>('/dashboard/products');
      const pharmaciesRes = await api.get<any>('/dashboard/pharmacies');

      setDashboardData({
        totalRevenue: revenueRes.data.totalRevenue,
        totalInvestments: investmentsRes.data.totalInvestments,
        totalProducts: productsRes.data.totalProducts,
        totalPharmacies: pharmaciesRes.data.totalPharmacies,
        recentInvestments: investmentsRes.data.recentInvestments,
        topSellingProducts: productsRes.data.topSellingProducts,
        newPharmacies: pharmaciesRes.data.newPharmacies,
      });
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
      // Handle error, maybe show a toast notification
    } finally {
      setLoading(false);
    }
  };

  if (loading || isLoading) {
    return <div className="h-screen grid place-items-center">Loading MR Dashboard...</div>;
  }

  if (!user || user.role !== 'mr') {
    return null; // Should be redirected by useEffect, but a fallback
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">MR Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard title="Total Revenue" value={`$${dashboardData.totalRevenue.toLocaleString()}`} />
        <StatsCard title="Total Investments" value={`$${dashboardData.totalInvestments.toLocaleString()}`} />
        <StatsCard title="Total Products" value={dashboardData.totalProducts.toLocaleString()} />
        <StatsCard title="Total Pharmacies" value={dashboardData.totalPharmacies.toLocaleString()} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Investments</h2>
          {dashboardData.recentInvestments.length > 0 ? (
            <div className="space-y-4">
              {dashboardData.recentInvestments.map((investment: any) => (
                <InvestmentCard key={investment.id} investment={investment} />
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No recent investments.</p>
          )}
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Top Selling Products</h2>
          {dashboardData.topSellingProducts.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {dashboardData.topSellingProducts.map((product: any) => (
                <li key={product.id} className="py-3 flex justify-between items-center">
                  <span className="text-gray-900 font-medium">{product.name}</span>
                  <span className="text-gray-600">{product.sales} sales</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600">No top selling products.</p>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">New Pharmacies</h2>
        {dashboardData.newPharmacies.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {dashboardData.newPharmacies.map((pharmacy: any) => (
              <li key={pharmacy.id} className="py-3 flex justify-between items-center">
                <span className="text-gray-900 font-medium">{pharmacy.name}</span>
                <span className="text-gray-600">{pharmacy.location}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600">No new pharmacies.</p>
        )}
      </div>
    </div>
  );
}
