import { useEffect, useState } from 'react';
import { API } from '@/lib/api';
import { Button, Input, Select } from '@/components/Field';
import { ProductCategory, ProductStatus } from '@/types/enums';
import { ProductModal } from '@/components/ProductModal'; // Import ProductModal
import { ConfirmationModal } from '@/components/ConfirmationModal'; // Import ConfirmationModal
import KebabMenu from '@/components/KebabMenu'; // Import KebabMenu

// Define new enums for ProductType and PackagingType if they don't exist
enum ProductType { 
  Tablet = 'tablet',
  Liquid = 'liquid',
  Other = 'other',
}

enum PackagingType { 
  Strip = 'strip',
  Bottle = 'bottle',
  Vial = 'vial',
  Other = 'other',
}

export default function Products() {
  const [items, setItems] = useState<any[]>([]);
  const [openAddModal, setOpenAddModal] = useState(false); // State for opening add product modal
  const [editingProduct, setEditingProduct] = useState<any>(null); // State for product being edited
  const [viewingProduct, setViewingProduct] = useState<any>(null); // State for product being viewed
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // State for delete confirmation modal
  const [productToDelete, setProductToDelete] = useState<number | null>(null); // State for product ID to delete
  const [loading, setLoading] = useState(false);

  const refresh = async () => setItems(await API.get<any[]>('/products'));
  useEffect(() => { refresh(); }, []);

  const handleDeleteClick = (id: number) => {
    setProductToDelete(id);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (productToDelete === null) return;
    setLoading(true);
    try {
      await API.del(`/products/${productToDelete}`);
      refresh();
      setShowDeleteConfirm(false);
      setProductToDelete(null);
    } catch (err) {
      console.error('Error deleting product:', err);
      alert('Failed to delete product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Products</h2>
        <Button onClick={() => setOpenAddModal(true)}>Add New Product</Button>
      </div>

      {loading && <div className="text-center py-4">Loading products...</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {!loading && items.length === 0 && <p className="md:col-span-3 text-center text-slate-500">No products found. Add one!</p>}
        {items.map((p) => (
          <div key={p.id} className="bg-white border rounded-lg p-4 flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-slate-800">{p.name}</h3>
              <KebabMenu
                actions={[
                  { label: 'View', onClick: () => setViewingProduct(p) },
                  { label: 'Edit', onClick: () => setEditingProduct(p) },
                  { label: 'Delete', onClick: () => handleDeleteClick(p.id) },
                ]}
              />
            </div>
            <p className="text-sm text-slate-600 mb-1"><strong>Category:</strong> {p.category}</p>
            <p className="text-sm text-slate-600 mb-1"><strong>Status:</strong> {p.status}</p>
            <p className="text-sm text-slate-600 mb-1"><strong>Price:</strong> ₹{Number(p.price).toLocaleString()}</p>
            <p className="text-sm text-slate-600 mb-1"><strong>Type:</strong> {p.product_type} • <strong>Packaging:</strong> {p.packaging_type}</p>
            {p.packaging_type === PackagingType.Strip && (
              <p className="text-sm text-slate-600 mb-1"><strong>Strips/Box:</strong> {p.strips_per_box} • <strong>Units/Strip:</strong> {p.units_per_strip}</p>
            )}
          </div>
        ))}
      </div>

      <ProductModal
        open={openAddModal || !!editingProduct || !!viewingProduct}
        onClose={() => { setOpenAddModal(false); setEditingProduct(null); setViewingProduct(null); }}
        onSaved={() => { setOpenAddModal(false); setEditingProduct(null); setViewingProduct(null); refresh(); }}
        loading={loading}
        setLoading={setLoading}
        product={editingProduct || viewingProduct}
        readOnly={!!viewingProduct}
      />

      <ConfirmationModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title="Confirm Deletion"
        message="Are you sure you want to delete this product? This action cannot be undone."
        loading={loading}
      />
    </div>
  );
}
