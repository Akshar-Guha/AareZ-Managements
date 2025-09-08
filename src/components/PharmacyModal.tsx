import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import { Button, Input, Select, Textarea } from '@/components/Field';
import { API } from '@/lib/api';

interface ProductWithCount {
  productName: string;
  count: number;
}

interface PharmacyForm {
  name: string;
  city: string;
  address: string;
  product_with_count_given: ProductWithCount[];
  date_given: string;
  current_stock_owns: ProductWithCount[];
  due_date_amount: string;
  scheme_applied: string;
}

export function PharmacyModal({
  open,
  onClose,
  onSaved,
  loading,
  setLoading,
  pharmacy,
  readOnly
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  loading: boolean;
  setLoading: (b: boolean) => void;
  pharmacy?: any; // Existing pharmacy data for editing or viewing
  readOnly?: boolean;
}) {
  const [form, setForm] = useState<PharmacyForm>({
    name: '',
    city: '',
    address: '',
    product_with_count_given: [],
    date_given: '',
    current_stock_owns: [],
    due_date_amount: '',
    scheme_applied: '',
  });
  const [products, setProducts] = useState<any[]>([]); // All available products
  const [currentProductGivenInput, setCurrentProductGivenInput] = useState('');
  const [currentCountGivenInput, setCurrentCountGivenInput] = useState<number>(0);
  const [currentProductStockInput, setCurrentProductStockInput] = useState('');
  const [currentCountStockInput, setCurrentCountStockInput] = useState<number>(0);
  const [errors, setErrors] = useState<{[k: string]: string}>({});

  useEffect(() => {
    if (open) {
      API.get<any[]>('/products').then(data => {
        // Trim product names immediately upon fetching for consistent comparison
        const trimmedProducts = data.map(p => ({ ...p, name: p.name.trim() }));
        setProducts(trimmedProducts);
      });

      if (pharmacy) {
        setForm({
          name: pharmacy.name || '',
          city: pharmacy.city || '',
          address: pharmacy.address || '',
          product_with_count_given: pharmacy.product_with_count_given || [],
          date_given: pharmacy.date_given ? pharmacy.date_given.split('T')[0] : '',
          current_stock_owns: pharmacy.current_stock_owns || [],
          due_date_amount: pharmacy.due_date_amount ? pharmacy.due_date_amount.split('T')[0] : '',
          scheme_applied: pharmacy.scheme_applied || '',
        });
      } else {
        setForm({
          name: '',
          city: '',
          address: '',
          product_with_count_given: [],
          date_given: '',
          current_stock_owns: [],
          due_date_amount: '',
          scheme_applied: '',
        });
      }
      setErrors({});
    }
  }, [open, pharmacy]);

  const addProductGiven = () => {
    const productName = currentProductGivenInput.trim();
    const count = currentCountGivenInput;
    if (!productName || count <= 0) return;
    if (!products.some(p => p.name === productName)) return; // Only allow available products
    
    setForm(f => ({
      ...f,
      product_with_count_given: [
        ...f.product_with_count_given,
        { productName, count }
      ]
    }));
    setCurrentProductGivenInput('');
    setCurrentCountGivenInput(0);
  };

  const removeProductGiven = (index: number) => {
    setForm(f => ({
      ...f,
      product_with_count_given: f.product_with_count_given.filter((_, i) => i !== index)
    }));
  };

  const addCurrentStock = () => {
    const productName = currentProductStockInput.trim();
    const count = currentCountStockInput;
    if (!productName || count <= 0) return;
    if (!products.some(p => p.name === productName)) return; // Only allow available products

    setForm(f => ({
      ...f,
      current_stock_owns: [
        ...f.current_stock_owns,
        { productName, count }
      ]
    }));
    setCurrentProductStockInput('');
    setCurrentCountStockInput(0);
  };

  const removeCurrentStock = (index: number) => {
    setForm(f => ({
      ...f,
      current_stock_owns: f.current_stock_owns.filter((_, i) => i !== index)
    }));
  };

  function validate() {
    const errs: {[k: string]: string} = {};
    if (!form.name.trim()) errs.name = 'Pharmacy Name is required.';
    if (!form.city.trim()) errs.city = 'City is required.';
    if (!form.address.trim()) errs.address = 'Address is required.';
    if (!form.date_given) errs.date_given = 'Date Given is required.';
    if (!form.due_date_amount) errs.due_date_amount = 'Due Date of Amount is required.';

    return errs;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setLoading(true);
    try {
      const payload: any = {
        name: form.name,
        city: form.city,
        address: form.address,
        product_with_count_given: form.product_with_count_given,
        date_given: form.date_given,
        current_stock_owns: form.current_stock_owns,
        due_date_amount: form.due_date_amount,
        scheme_applied: form.scheme_applied || null,
      };

      if (pharmacy) {
        await API.put(`/pharmacies/${pharmacy.id}`, payload);
      } else {
        await API.post('/pharmacies', payload);
      }
      onSaved();
    } catch (err) {
      console.error(err);
      alert('Failed to save pharmacy');
    } finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={pharmacy ? (readOnly ? "Pharmacy Details" : "Edit Pharmacy") : "Add New Pharmacy"}>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Input label="Pharmacy Name *" placeholder="MediCare Pharmacy" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required={!readOnly} disabled={readOnly} error={!!errors.name} />
          {errors.name && <div className="text-xs text-red-600 mb-2">{errors.name}</div>}
        </div>
        <div>
          <Input label="City *" placeholder="Mumbai" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} required={!readOnly} disabled={readOnly} error={!!errors.city} />
          {errors.city && <div className="text-xs text-red-600 mb-2">{errors.city}</div>}
        </div>
        <div className="md:col-span-2">
          <Textarea label="Address *" placeholder="123, Main Street, Bandra" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} required={!readOnly} disabled={readOnly} error={!!errors.address} />
          {errors.address && <div className="text-xs text-red-600 mb-2">{errors.address}</div>}
        </div>

        {/* Product with Count Given */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Products Given</label>
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-2 mt-1">
            <div className="flex-1 min-w-[150px]">
              <Select
                label="Product Name"
                value={currentProductGivenInput}
                onChange={e => setCurrentProductGivenInput(e.target.value)}
                options={products.map(p => ({ label: p.name, value: p.name }))}
                disabled={readOnly}
              />
            </div>
            <div className="min-w-[100px]">
              <Input
                label="Count"
                type="number"
                value={currentCountGivenInput}
                onChange={e => setCurrentCountGivenInput(Number(e.target.value))}
                disabled={readOnly}
                min={0}
              />
            </div>
            <Button
              type="button"
              onClick={addProductGiven}
              className="h-9 px-3 whitespace-nowrap text-sm"
              disabled={readOnly || !currentProductGivenInput || currentCountGivenInput <= 0 || !products.some(p => p.name === currentProductGivenInput)}
            >
              Add Product
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {form.product_with_count_given.map((item, index) => (
              <span key={index} className="inline-flex items-center bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                {item.productName} ({item.count})
                {!readOnly && <button type="button" onClick={() => removeProductGiven(index)} className="ml-1 text-slate-500 hover:text-slate-700">×</button>}
              </span>
            ))}
          </div>
        </div>

        {/* Current Stock Owns */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Current Stock Owned</label>
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-2 mt-1">
            <div className="flex-1 min-w-[150px]">
              <Select
                label="Product Name"
                value={currentProductStockInput}
                onChange={e => setCurrentProductStockInput(e.target.value)}
                options={products.map(p => ({ label: p.name, value: p.name }))}
                disabled={readOnly}
              />
            </div>
            <div className="min-w-[100px]">
              <Input
                label="Count"
                type="number"
                value={currentCountStockInput}
                onChange={e => setCurrentCountStockInput(Number(e.target.value))}
                disabled={readOnly}
                min={0}
              />
            </div>
            <Button
              type="button"
              onClick={addCurrentStock}
              className="h-9 px-3 whitespace-nowrap text-sm"
              disabled={readOnly || !currentProductStockInput || currentCountStockInput <= 0 || !products.some(p => p.name === currentProductStockInput)}
            >
              Add Stock
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {form.current_stock_owns.map((item, index) => (
              <span key={index} className="inline-flex items-center bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">
                {item.productName} ({item.count})
                {!readOnly && <button type="button" onClick={() => removeCurrentStock(index)} className="ml-1 text-slate-500 hover:text-slate-700">×</button>}
              </span>
            ))}
          </div>
        </div>

        <div>
          <Input label="Date Given *" type="date" value={form.date_given} onChange={e => setForm({ ...form, date_given: e.target.value })} required={!readOnly} disabled={readOnly} error={!!errors.date_given} />
          {errors.date_given && <div className="text-xs text-red-600 mb-2">{errors.date_given}</div>}
        </div>
        <div>
          <Input label="Due Date of Amount *" type="date" value={form.due_date_amount} onChange={e => setForm({ ...form, due_date_amount: e.target.value })} required={!readOnly} disabled={readOnly} error={!!errors.due_date_amount} />
          {errors.due_date_amount && <div className="text-xs text-red-600 mb-2">{errors.due_date_amount}</div>}
        </div>

        <div className="md:col-span-2">
          <Input label="Scheme Applied" placeholder="Discount 10%" value={form.scheme_applied} onChange={e => setForm({ ...form, scheme_applied: e.target.value })} disabled={readOnly} />
        </div>

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
              Save Pharmacy
            </Button>
          </div>
        )}
      </form>
    </Modal>
  );
}
