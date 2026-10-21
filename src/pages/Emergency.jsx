import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { CheckCircle2, Siren } from 'lucide-react';
import RequestForm from '../components/RequestForm';
import { useAuth } from '../context/AuthContext';

export default function Emergency() {
  const { user } = useAuth();
  const [done, setDone] = useState(null);
  if (user?.role === 'hospital') return <Navigate to="/hospital/create" replace />;
  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="flex items-center gap-2 text-3xl font-extrabold"><Siren className="text-red-600" aria-hidden="true" /> Emergency blood request</h1>
      <p className="muted mb-6">Fill this in under a minute. Matching donors in the city are found immediately. Critical requests notify them automatically.</p>
      {done ? (
        <div className="card animate-pop p-8 text-center">
          <CheckCircle2 size={48} className="mx-auto text-red-700" aria-hidden="true" />
          <h2 className="mt-3 text-2xl font-bold">Request {done.id} raised</h2>
          <p className="muted mt-1">{done.matchCount} compatible donor(s) found in {done.city}. {done.autoNotified ? `${done.autoNotified} were notified automatically.` : 'The hospital team can now notify them.'}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button type="button" className="btn-primary" onClick={() => setDone(null)}>Raise another</button>
            <Link to="/find-blood" className="btn-outline">Search stock</Link>
          </div>
        </div>
      ) : (
        <>
          <RequestForm onCreated={setDone} />
          <p className="muted mt-4 text-sm">Hospital staff? <Link to="/login" className="font-bold text-red-700 underline">Log in</Link> to manage requests and stock.</p>
        </>
      )}
    </div>
  );
}
