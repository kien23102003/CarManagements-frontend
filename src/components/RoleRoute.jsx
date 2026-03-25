import { Navigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';

export default function RoleRoute({ allowRoles = [], children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  const roles = user?.roles || [];
  const allowed = allowRoles.length === 0 || allowRoles.some((r) => roles.includes(r));
  if (!allowed) {
    return <Navigate to="/" replace />;
  }

  return children;
}
