import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import { Button, Input, Select } from '@/components/Field';
import { API } from '@/lib/api';
import { ProductCategory, ProductStatus } from '@/types/enums';

// Assuming these enums are defined globally or imported from a shared location, 
// for now, we'll redefine them here for the modal's scope to avoid import issues.
// In a real app, these would likely be in src/types/enums.ts or similar.
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

interface ProductForm {
  name: string;
  category: ProductCategory;
  status: ProductStatus;
  price: number;
  product_type: ProductType;
  packaging_type: PackagingType;
  strips_per_box: number | null;
  units_per_strip: number | null;
}

export function ProductModal({
  open,
  onClose,
  onSaved,
  loading,
  setLoading,
  product,
  readOnly,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  loading: boolean;
  setLoading: (b: boolean) => void;
  product?: any; // Existing product data for editing or viewing
  readOnly?: boolean;
}) {
  const [form, setForm] = useState<ProductForm>({
    name: '',
    category: ProductCategory.General,
    status: ProductStatus.Active,
    price: 0,
    product_type: ProductType.Tablet,
    packaging_type: PackagingType.Strip,
    strips_per_box: null,
    units_per_strip: null,
  });
  const [errors, setErrors] = useState<{ [k: string]: string }>({});

  useEffect(() => {
    if (open) {
      if (product) {
        setForm({
          name: product.name || '',
          category: product.category || ProductCategory.General,
          status: product.status || ProductStatus.Active,
          price: product.price || 0,
          product_type: product.product_type || ProductType.Tablet,
          packaging_type: product.packaging_type || PackagingType.Strip,
          strips_per_box: product.strips_per_box || null,
          units_per_strip: product.units_per_strip || null,
        });
      } else {
        setForm({
          name: '',
          category: ProductCategory.General,
          status: ProductStatus.Active,
          price: 0,
          product_type: ProductType.Tablet,
          packaging_type: PackagingType.Strip,
          strips_per_box: null,
          units_per_strip: null,
        });
      }
      setErrors({});
    }
  }, [open, product]);

  const validate = () => {
    const errs: { [k: string]: string } = {};
    if (!form.name.trim()) errs.name = 'Product name is required.';
    if (form.price <= 0) errs.price = 'Price must be a positive number.';

    if (form.packaging_type === PackagingType.Strip) {
      if (!form.strips_per_box || form.strips_per_box <= 0) {
        errs.strips_per_box = 'Strips per box is required and must be positive for strip packaging.';
      }
      if (!form.units_per_strip || form.units_per_strip <= 0) {
        errs.units_per_strip = 'Units per strip is required and must be positive for strip packaging.';
      }
    }
    return errs;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setLoading(true);

    try {
      const payload = {
        name: form.name,
        category: form.category,
        status: form.status,
        price: form.price,
        product_type: form.product_type,
        packaging_type: form.packaging_type,
        strips_per_box: form.packaging_type === PackagingType.Strip ? form.strips_per_box : null,
        units_per_strip: form.packaging_type === PackagingType.Strip ? form.units_per_strip : null,
      };

      if (product) {
        await API.put(`/products/${product.id}`, payload);
      } else {
        await API.post('/products', payload);
      }
      onSaved();
    } catch (err) {
      console.error(err);
      alert('Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={product ? (readOnly ? "Product Details" : "Edit Product") : "Add New Product"}>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Input label="Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required={!readOnly} disabled={readOnly} error={!!errors.name} />
          {errors.name && <div className="text-xs text-red-600 mb-2">{errors.name}</div>}
        </div>
        <div>
          <Select label="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value as ProductCategory })} options={Object.values(ProductCategory).map(x => ({ label: x, value: x }))} disabled={readOnly} />
        </div>
        <div>
          <Select label="Status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as ProductStatus })} options={Object.values(ProductStatus).map(x => ({ label: x, value: x }))} disabled={readOnly} />
        </div>
        <div>
          <Input label="Price *" type="number" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} required={!readOnly} disabled={readOnly} error={!!errors.price} />
          {errors.price && <div className="text-xs text-red-600 mt-1">{errors.price}</div>}
        </div>

        {/* New Product Attributes */}
        <div>
          <Select label="Product Type" value={form.product_type} onChange={e => setForm({ ...form, product_type: e.target.value as ProductType })} options={Object.values(ProductType).map(x => ({ label: x, value: x }))} disabled={readOnly} />
        </div>
        <div>
          <Select label="Packaging Type" value={form.packaging_type} onChange={e => setForm({ ...form, packaging_type: e.target.value as PackagingType })} options={Object.values(PackagingType).map(x => ({ label: x, value: x }))} disabled={readOnly} />
        </div>

        {form.packaging_type === PackagingType.Strip && (
          <>
            <div>
              <Input label="Strips Per Box" type="number" value={form.strips_per_box || ''} onChange={e => setForm({ ...form, strips_per_box: Number(e.target.value) })} required={!readOnly} disabled={readOnly} error={!!errors.strips_per_box} />
              {errors.strips_per_box && <div className="text-xs text-red-600 mt-1">{errors.strips_per_box}</div>}
            </div>
            <div>
              <Input label="Units Per Strip" type="number" value={form.units_per_strip || ''} onChange={e => setForm({ ...form, units_per_strip: Number(e.target.value) })} required={!readOnly} disabled={readOnly} error={!!errors.units_per_strip} />
              {errors.units_per_strip && <div className="text-xs text-red-600 mt-1">{errors.units_per_strip}</div>}
            </div>
          </>
        )}

        {!readOnly && (
          <div className="md:col-span-2 flex flex-row justify-end gap-2 mt-6">
            <button
              type="button"
              className="px-5 py-2 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-medium transition"
              onClick={onClose}
            >
              Cancel
            </button>
            <Button
              type="submit"
              className="px-6 py-2 font-semibold text-base"
              disabled={loading}
            >
              Save Product
            </Button>
          </div>
        )}
      </form>
    </Modal>
  );
}
