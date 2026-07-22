import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (user === null) {
    return (
      <div className="min-h-screen grid place-items-center bg-bmw-surface">
        <div className="flex flex-col items-center gap-3" data-testid="auth-loading">
          <div className="h-10 w-10 rounded-full border-4 border-bmw-blue border-t-transparent animate-spin" />
          <span className="text-sm text-bmw-soft font-display tracking-wide">Cargando…</span>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
