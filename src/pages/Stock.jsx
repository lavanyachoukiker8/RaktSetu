import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { api } from '../api';
import useFetch from '../hooks/useFetch';
import { FormSelect } from '../components/Forms';
import { TableSkeleton, EmptyState } from '../components/Feedback';
import { BLOOD_GROUPS, CITIES } from '../utils/constants';
import { timeAgo } from '../utils/helpers';

export default function Stock() {
  const [city, setCity] = useState('');
  const inv = useFetch(() => api.getInventory({ city: city || undefined }), [city]);
  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-extrabold">Blood stock by hospital</h1>
      <p className="muted mb-6">Units currently available. Cells marked with a warning are below the hospital's low-stock threshold.</p>
      <div className="card mb-6 max-w-xs p-4">
        <FormSelect label="City" placeholder="All cities" options={CITIES} value={city} onChange={(e) => setCity(e.target.value)} />
      </div>
      <div className="card overflow-x-auto">
        {inv.loading ? <TableSkeleton rows={6} /> : (inv.data || []).length === 0 ? <EmptyState title="No hospitals in this city" message="Choose another city." /> : (
          <table className="w-full min-w-[820px] text-center">
            <caption className="sr-only">Blood units available by hospital and blood group</caption>
            <thead>
              <tr>
                <th className="th" scope="col">Hospital</th>
                {BLOOD_GROUPS.map((g) => <th key={g} className="th text-center" scope="col">{g}</th>)}
                <th className="th" scope="col">Updated</th>
              </tr>
            </thead>
            <tbody>
              {inv.data.map((h) => (
                <tr key={h.hospitalId} className="border-t border-red-100">
                  <th scope="row" className="td text-left font-bold">{h.hospitalName}<span className="muted block text-xs font-normal">{h.city}</span></th>
                  {(h.groups || []).map((g) => (
                    <td key={g.group} className={`td ${g.low ? 'bg-red-200' : ''}`}>
                      <span className={`inline-flex items-center gap-1 font-bold ${g.low ? 'text-red-900' : ''}`}>
                        {g.low && <AlertTriangle size={13} aria-hidden="true" />}{g.units}
                        {g.low && <span className="sr-only">low stock</span>}
                      </span>
                    </td>
                  ))}
                  <td className="td muted text-xs">{timeAgo(h.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
