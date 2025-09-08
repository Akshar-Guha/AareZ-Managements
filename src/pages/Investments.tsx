import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import { Button, Input, Select, Textarea } from '@/components/Field';
import { API } from '@/lib/api';
import KebabMenu from '@/components/KebabMenu';
import { InvestmentCard } from '@/components/InvestmentCard';
import { ConfirmationModal } from '@/components/ConfirmationModal';

export default function Investments() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [editingInvestment, setEditingInvestment] = useState<any>(null);
  const [viewingInvestment, setViewingInvestment] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [investmentToDelete, setInvestmentToDelete] = useState<number | null>(null);

  const refresh = async () => {
    const data = await API.get<any[]>('/investments');
    setItems(data);
  };

  const handleDeleteClick = (id: number) => {
    setInvestmentToDelete(id);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (investmentToDelete === null) return;
    console.log(`Attempting to delete investment with ID: ${investmentToDelete}`);
    setLoading(true);
    try {
      await API.del(`/investments/${investmentToDelete}`);
      console.log(`DELETE request successful for investment ID: ${investmentToDelete}`);
      refresh();
      setShowDeleteConfirm(false);
      setInvestmentToDelete(null);
    } catch (err) {
      console.error('Error during DELETE API call:', err);
      alert('Failed to delete investment');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Doctor Investments</h2>
        <Button onClick={() => setOpen(true)}>Add Investment</Button>
      </div>
      <div className="mb-4 flex items-center gap-4">
        <div className="flex-1">
          <input 
            type="text" 
            placeholder="Search by doctor name or ID..."
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
        </div>
        <button className="flex items-center gap-2 px-3 py-2 border rounded-md text-sm hover:bg-slate-50">
          <span>🔽</span> Filter by Doctor
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((x) => (
          <InvestmentCard
            key={x.id}
            investment={x}
            onView={setViewingInvestment}
            onEdit={setEditingInvestment}
            onDelete={handleDeleteClick}
          />
        ))}
      </div>

      <InvestmentModal
        open={open || !!editingInvestment || !!viewingInvestment}
        onClose={() => { setOpen(false); setEditingInvestment(null); setViewingInvestment(null); }}
        onSaved={() => { setOpen(false); setEditingInvestment(null); setViewingInvestment(null); refresh(); }}
        loading={loading}
        setLoading={setLoading}
        investment={editingInvestment || viewingInvestment}
        readOnly={!!viewingInvestment}
      />

      <ConfirmationModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title="Confirm Deletion"
        message="Are you sure you want to delete this investment? This action cannot be undone."
        loading={loading}
      />
    </div>
  );
}

function InvestmentModal({ open, onClose, onSaved, loading, setLoading, investment, readOnly }: {
  open: boolean; onClose: () => void; onSaved: () => void; loading: boolean; setLoading: (b: boolean) => void; investment?: any; readOnly?: boolean
}) {
  const [form, setForm] = useState({
    doctorName: '',
    amount: '',
    date: '',
    expected: '',
    actual: '',
    preferences: [] as string[],
    notes: '',
  });
  const [products, setProducts] = useState<any[]>([]);
  const [prefInput, setPrefInput] = useState('');
  const [errors, setErrors] = useState<{[k: string]: string}>({});

  useEffect(() => {
    if (open) {
      API.get<any[]>('/products').then(data => {
        // Trim product names immediately upon fetching for consistent comparison
        const trimmedProducts = data.map(p => ({ ...p, name: p.name.trim() }));
        setProducts(trimmedProducts);
        console.log('Fetched products (trimmed):', trimmedProducts); // Log trimmed products
      });
      if (investment) {
        setForm({
          doctorName: investment.doctor_name || '',
          amount: investment.amount || '',
          date: investment.investment_date ? investment.investment_date.split('T')[0] : '',
          expected: investment.expected_returns || '',
          actual: investment.actual_returns || '',
          preferences: investment.preferences || [],
          notes: investment.notes || '',
        });
      } else {
        setForm({
          doctorName: '',
          amount: '',
          date: '',
          expected: '',
          actual: '',
          preferences: [],
          notes: '',
        });
      }
      setPrefInput('');
      setErrors({});
    }
  }, [open, investment]);

  const addPref = () => {
    const v = prefInput.trim();
    console.log('addPref called. prefInput:', prefInput, 'trimmed:', v); // Log prefInput
    if (!v) return; // Prevent adding empty preferences

    const productExistsInAvailable = products.some(p => p.name === v); // Use already trimmed product names
    const isAlreadyAddedToForm = form.preferences.some(p => p === v); // Compare with already trimmed preferences

    console.log('productExistsInAvailable:', productExistsInAvailable, 'isAlreadyAddedToForm:', isAlreadyAddedToForm);

    if (productExistsInAvailable && !isAlreadyAddedToForm) {
      setForm(f => ({ ...f, preferences: [...new Set([...f.preferences, v])] }));
      setPrefInput(''); // Clear the input after adding
    }
  };

  function validate() {
    const errs: {[k: string]: string} = {};
    if (!form.doctorName.trim()) errs.doctorName = 'Doctor Name is required.';
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) errs.amount = 'Enter a valid positive amount.';
    if (!form.date) errs.date = 'Investment date is required.';
    if (form.expected && (isNaN(Number(form.expected)) || Number(form.expected) < 0)) errs.expected = 'Expected returns must be positive.';
    if (form.actual && (isNaN(Number(form.actual)) || Number(form.actual) < 0)) errs.actual = 'Actual returns must be positive.';
    if (form.expected && form.actual && Number(form.actual) > Number(form.expected)) errs.actual = 'Actual returns cannot exceed expected returns.';
    return errs;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setLoading(true);
    try {
      const payload = {
        doctor_name: form.doctorName,
        // doctor_id is now handled by backend
        amount: form.amount,
        investment_date: form.date,
        expected_returns: form.expected,
        actual_returns: form.actual,
        preferences: form.preferences,
        notes: form.notes,
      };

      if (investment) {
        await API.put(`/investments/${investment.id}`, payload);
      } else {
        await API.post('/investments', payload);
      }
      onSaved();
    } catch (err) {
      console.error(err);
      alert('Failed to save investment');
    } finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={investment ? (readOnly ? "Investment Details" : "Edit Investment") : "Add New Investment"}>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Input label="Doctor Name *" placeholder="Dr. John Smith" value={form.doctorName} onChange={e => setForm({ ...form, doctorName: e.target.value })} required={!readOnly} disabled={readOnly} error={!!errors.doctorName} />
          {errors.doctorName && <div className="text-xs text-red-600 mb-2">{errors.doctorName}</div>}
        </div>
        {/* Doctor ID is now handled by the backend */}
        <div />

        <div>
          <Input label="Investment Amount (₹) *" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required={!readOnly} disabled={readOnly} error={!!errors.amount} />
          {errors.amount && <div className="text-xs text-red-600 mb-2">{errors.amount}</div>}
        </div>
        <div>
          <Input label="Investment Date *" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required={!readOnly} disabled={readOnly} error={!!errors.date} />
          {errors.date && <div className="text-xs text-red-600 mb-2">{errors.date}</div>}
        </div>

        <div>
          <Input label="Expected Returns (₹)" type="number" value={form.expected} onChange={e => setForm({ ...form, expected: e.target.value })} disabled={readOnly} error={!!errors.expected} />
          {errors.expected && <div className="text-xs text-red-600 mb-2">{errors.expected}</div>}
        </div>
        {investment && (
          <div>
            <Input label="Actual Returns (₹)" type="number" value={form.actual} onChange={e => setForm({ ...form, actual: e.target.value })} disabled={readOnly} error={!!errors.actual} />
            {errors.actual && <div className="text-xs text-red-600 mb-2">{errors.actual}</div>}
          </div>
        )}

        <div className="md:col-span-2">
          <Select
            label="Product Preferences"
            value={prefInput}
            onChange={e => setPrefInput(e.target.value)}
            // Filter options based on already trimmed names
            options={products.filter(p => !form.preferences.includes(p.name)).map(p => ({ label: p.name, value: p.name }))}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPref(); } }}
            disabled={readOnly}
            error={!!errors.preferences}
          />
          {console.log('Button disabled check:', { 
            readOnly, 
            prefInput, 
            productExistsInDropdownOptions: products.some(p => p.name === prefInput.trim()), 
            isAlreadyAddedToForm: form.preferences.some(p => p === prefInput.trim())
          })} {/* Log button disable conditions */}
          <Button
            type="button"
            onClick={addPref}
            className="h-9 px-3 whitespace-nowrap text-sm mt-2"
            // Disabled if readOnly, no input, product not in available (trimmed) products, or already added
            disabled={readOnly || !prefInput.trim() || !products.some(p => p.name === prefInput.trim()) || form.preferences.some(p => p === prefInput.trim())}
          >
            Add Preference
          </Button>
          <div className="flex flex-wrap gap-2 mt-2">
            {form.preferences?.map((p: string) => (
              <span
                key={p}
                className="inline-flex items-center bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs"
              >
                {p}
                {!readOnly && <button type="button" onClick={() => setForm(f => ({ ...f, preferences: f.preferences.filter((x: string) => x !== p) }))} className="ml-1 text-slate-500 hover:text-slate-700">×</button>}
              </span>
            ))}
          </div>
          {errors.preferences && <div className="text-xs text-red-600 mt-1">{errors.preferences}</div>}
        </div>

        <Textarea label="Notes" className="md:col-span-2" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} disabled={readOnly} />

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
              Save Investment
            </Button>
          </div>
        )}
      </form>
    </Modal>
  );
}
