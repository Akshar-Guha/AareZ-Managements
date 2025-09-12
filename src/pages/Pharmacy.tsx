import { useEffect, useState } from 'react';
import { API } from '@/lib/api';
import { Button } from '@/components/Field';
import { PharmacyModal } from '@/components/PharmacyModal';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import KebabMenu from '@/components/KebabMenu';

export default function Pharmacy() {
  const [openAddModal, setOpenAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [editingPharmacy, setEditingPharmacy] = useState<any>(null);
  const [viewingPharmacy, setViewingPharmacy] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pharmacyToDelete, setPharmacyToDelete] = useState<number | null>(null);

  const refreshPharmacies = async () => {
    setLoading(true);
    try {
      const data = await API.get<any[]>('/pharmacies');
      setPharmacies(data);
    } catch (err) {
      console.error('Failed to fetch pharmacies:', err);
      alert('Failed to load pharmacies.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id: number) => {
    setPharmacyToDelete(id);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (pharmacyToDelete === null) return;
    setLoading(true);
    try {
      await API.del(`/pharmacies/${pharmacyToDelete}`);
      refreshPharmacies();
      setShowDeleteConfirm(false);
      setPharmacyToDelete(null);
    } catch (err) {
      console.error('Error deleting pharmacy:', err);
      alert('Failed to delete pharmacy.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshPharmacies();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Pharmacies</h2>
        <Button onClick={() => setOpenAddModal(true)}>Add New Pharmacy</Button>
      </div>

      {loading && <div className="text-center py-4">Loading pharmacies...</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {!loading && pharmacies.length === 0 && <p className="md:col-span-3 text-center text-slate-500">No pharmacies found. Add one!</p>}
        {pharmacies.map(pharmacy => (
          <div key={pharmacy.id} className="bg-white rounded-lg shadow-md p-4 flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-slate-800">{pharmacy.name}</h3>
              <KebabMenu
                actions={[
                  { label: 'View', onClick: () => setViewingPharmacy(pharmacy) },
                  { label: 'Edit', onClick: () => setEditingPharmacy(pharmacy) },
                  { label: 'Delete', onClick: () => handleDeleteClick(pharmacy.id) },
                ]}
              />
            </div>
            <p className="text-sm text-slate-600 mb-1"><strong>City:</strong> {pharmacy.city}</p>
            <p className="text-sm text-slate-600 mb-1"><strong>Address:</strong> {pharmacy.address}</p>
            <p className="text-sm text-slate-600 mb-1"><strong>Date Given:</strong> {pharmacy.date_given ? new Date(pharmacy.date_given).toLocaleDateString() : 'N/A'}</p>
            <p className="text-sm text-slate-600 mb-1"><strong>Due Date:</strong> {pharmacy.due_date_amount ? new Date(pharmacy.due_date_amount).toLocaleDateString() : 'N/A'}</p>
            <p className="text-sm text-slate-600 mb-1"><strong>Scheme:</strong> {pharmacy.scheme_applied || 'None'}</p>

            <div className="mt-2">
              <p className="text-sm font-semibold text-slate-700">Products Given:</p>
              {pharmacy.product_with_count_given && pharmacy.product_with_count_given.length > 0 ? (
                <ul className="list-disc list-inside text-sm text-slate-600">
                  {pharmacy.product_with_count_given.map((p: any, idx: number) => (
                    <li key={idx}>{p.productName}: {p.count}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">No products given.</p>
              )}
            </div>

            <div className="mt-2">
              <p className="text-sm font-semibold text-slate-700">Current Stock:</p>
              {pharmacy.current_stock_owns && pharmacy.current_stock_owns.length > 0 ? (
                <ul className="list-disc list-inside text-sm text-slate-600">
                  {pharmacy.current_stock_owns.map((p: any, idx: number) => (
                    <li key={idx}>{p.productName}: {p.count}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">No current stock info.</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <PharmacyModal
        open={openAddModal || !!editingPharmacy || !!viewingPharmacy}
        onClose={() => { setOpenAddModal(false); setEditingPharmacy(null); setViewingPharmacy(null); }}
        onSaved={() => { setOpenAddModal(false); setEditingPharmacy(null); setViewingPharmacy(null); refreshPharmacies(); }}
        loading={loading}
        setLoading={setLoading}
        pharmacy={editingPharmacy || viewingPharmacy}
        readOnly={!!viewingPharmacy}
      />

      <ConfirmationModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title="Confirm Deletion"
        message="Are you sure you want to delete this pharmacy? This action cannot be undone."
        loading={loading}
      />
    </div>
  );
}
