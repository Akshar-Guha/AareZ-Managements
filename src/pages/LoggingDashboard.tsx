import { useEffect, useState } from 'react';
import { API } from '@/lib/api';

interface ActivityLog {
  id: number;
  user_id: number;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: number;
  details: any;
  created_at: string;
}

const LoggingDashboard = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const data = await API.get<ActivityLog[]>('/logs');
        setLogs(data);
      } catch (err) {
        console.error('Failed to fetch activity logs:', err);
        setError('Failed to fetch activity logs.');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  if (loading) {
    return <div className="p-6">Loading activity logs...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Activity History</h1>
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Timestamp</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Entity Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Entity ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Details</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(log.created_at).toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{log.user_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{log.action}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{log.entity_type}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{log.entity_id || 'N/A'}</td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  <div className="whitespace-pre-wrap text-xs bg-slate-50 p-2 rounded">{formatDetails(log)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && !loading && !error && (
          <div className="p-6 text-center text-slate-500">No activity logs found.</div>
        )}
      </div>
    </div>
  );
};

export default LoggingDashboard;

function formatDetails(log: ActivityLog): string {
  const { action, entity_type, entity_id, details } = log;

  switch (action) {
    case 'CREATE':
      if (entity_type === 'investment' && details?.new_investment) {
        const { doctor_name, amount } = details.new_investment;
        return `New investment created for Dr. ${doctor_name || 'Unknown'} with amount ₹${Number(amount).toLocaleString() || 'N/A'} (ID: ${entity_id || 'N/A'})`;
      }
      break;
    case 'ATTENDANCE': {
      const t = details?.type;
      const lat = details?.lat;
      const lon = details?.lon;
      const acc = details?.accuracy;
      const where = lat != null && lon != null
        ? `at ${Number(lat).toFixed(5)}, ${Number(lon).toFixed(5)}${acc ? ` (±${Math.round(acc)}m)` : ''}`
        : 'location unavailable';
      return `MR ${t === 'punch_in' ? 'punched IN' : t === 'punch_out' ? 'punched OUT' : 'attendance'} ${where}.`;
    }
    case 'UPDATE':
      if (entity_type === 'investment' && details?.new_data && details?.old_data) {
        const changedFields: string[] = [];
        const oldData = details.old_data;
        const newData = details.new_data;

        const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

        for (const key of allKeys) {
          let oldValue = oldData[key];
          let newValue = newData[key];

          // Handle undefined/null values consistently
          const isOldValueNullish = oldValue === undefined || oldValue === null || oldValue === '';
          const isNewValueNullish = newValue === undefined || newValue === null || newValue === '';

          // Special handling for array fields like preferences
          if (Array.isArray(oldValue) || Array.isArray(newValue)) {
            const oldArr = Array.isArray(oldValue) ? oldValue : [];
            const newArr = Array.isArray(newValue) ? newValue : [];

            const oldSet = new Set(oldArr);
            const newSet = new Set(newArr);
            const added = [...newSet].filter(x => !oldSet.has(x));
            const removed = [...oldSet].filter(x => !newSet.has(x));

            if (added.length > 0) changedFields.push(`added '${added.join(', ')}' to ${key}`);
            if (removed.length > 0) changedFields.push(`removed '${removed.join(', ')}' from ${key}`);
            continue;
          }
          
          // Handle date conversion for comparison
          if (key.includes('date')) {
            oldValue = oldValue ? String(oldValue).split('T')[0] : '';
            newValue = newValue ? String(newValue).split('T')[0] : '';
          }

          // Convert numbers to string for consistent comparison
          if (!isOldValueNullish && !isNaN(Number(oldValue))) oldValue = String(Number(oldValue));
          if (!isNewValueNullish && !isNaN(Number(newValue))) newValue = String(Number(newValue));

          if (isOldValueNullish && !isNewValueNullish) {
            changedFields.push(`'${key}' added with value '${newValue}'`);
          } else if (!isOldValueNullish && isNewValueNullish) {
            changedFields.push(`'${key}' removed (was '${oldValue}')`);
          } else if (String(oldValue) !== String(newValue)) {
            changedFields.push(`'${key}' from '${oldValue}' to '${newValue}'`);
          }
        }

        if (changedFields.length > 0) {
          return `Investment (ID: ${entity_id || 'N/A'}) updated: ${changedFields.join(', ')}.`;
        } else {
          return `Investment (ID: ${entity_id || 'N/A'}) updated with no visible changes.`;
        }
      }
      break;
    case 'DELETE':
      if (entity_type === 'investment' && details?.deleted_investment) {
        const { doctor_name, amount } = details.deleted_investment;
        return `Investment for Dr. ${doctor_name || 'Unknown'} with amount ₹${Number(amount).toLocaleString() || 'N/A'} (ID: ${entity_id || 'N/A'}) was deleted.`;
      }
      break;
    default:
      return JSON.stringify(details, null, 2);
  }

  return JSON.stringify(details, null, 2);
}
