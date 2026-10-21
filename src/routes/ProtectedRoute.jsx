import { Navigate, Outlet, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useEffect } from 'react';
import { useAuth, homePathFor } from '../context/AuthContext';

export default function ProtectedRoute({ role }) {
  const { user } = useAuth();
  const loc = useLocation();
  const wrongRole = user && user.role !== role;
  useEffect(() => {
    if (wrongRole) toast.error('You do not have access to that area.', { id: 'role' });
  }, [wrongRole]);
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname, role }} />;
  if (wrongRole) return <Navigate to={homePathFor(user.role)} replace />;
  return <Outlet />;
}
