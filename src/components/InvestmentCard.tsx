import { Button } from "./Field";
import KebabMenu from "./KebabMenu";

export function InvestmentCard({
  investment,
  onView,
  onEdit,
  onDelete,
}: {investment: any; onView: (inv: any) => void; onEdit: (inv: any) => void; onDelete: (id: number) => void}) {
  const roi = investment.amount > 0 && investment.actual_returns ? ((investment.actual_returns / investment.amount) * 100).toFixed(1) : '0.0';
  return (
    <div key={investment.id} className="bg-white border rounded-lg p-4 hover:shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="font-medium">{investment.doctor_name || investment.doctor_code}</div>
        <KebabMenu
          actions={[
            { label: 'View Details', onClick: () => onView(investment) },
            { label: 'Edit', onClick: () => onEdit(investment) },
            { label: 'Delete', onClick: () => onDelete(investment.id) }
          ]}
        />
      </div>
      
      <div className="text-sm text-slate-600 mb-3">ID: {investment.doctor_code || '—'}</div>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">💰 Investment:</span>
          <span className="font-medium">₹{Number(investment.amount).toLocaleString()}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-slate-500">📈 Returns:</span>
          <span className="font-medium text-green-600">₹{Number(investment.actual_returns || 0).toLocaleString()}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-slate-500">📅 Date:</span>
          <span>{investment.investment_date}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-slate-500">📊 ROI:</span>
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            Number(roi) > 0 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
          }`}>
            {roi}%
          </span>
        </div>
      </div>

      {investment.preferences?.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <div className="text-xs text-slate-500 mb-1">Preferences:</div>
          <div className="flex flex-wrap gap-1">
            {investment.preferences.map((pref: string) => (
              <span key={pref} className="px-2 py-1 bg-slate-100 rounded text-xs">{pref}</span>
            ))}
          </div>
        </div>
      )}
      
      {investment.notes && (
        <div className="mt-3 pt-3 border-t">
          <div className="text-xs text-slate-500 mb-1">Notes:</div>
          <div className="text-xs text-slate-600">{investment.notes}</div>
        </div>
      )}
    </div>
  );
}
