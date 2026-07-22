import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiError } from "@/lib/api";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      <div className="relative hidden lg:block overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1778942855297-1c1aa4d01b19"
          alt="BMW Showroom"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute bottom-0 p-12 text-white">
          <div className="flex items-center gap-2 mb-4">
            <span className="h-3 w-3 rounded-full bg-bmw-light" />
            <span className="h-3 w-3 rounded-full bg-bmw-blue" />
            <span className="h-3 w-3 rounded-full bg-bmw-red" />
          </div>
          <h2 className="font-display text-4xl font-light leading-tight">
            BMW Momentum<br />Showroom
          </h2>
          <p className="mt-3 text-white/70 max-w-sm">
            Gestión profesional de exposición y stock para tu concesionario oficial BMW.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-8 sm:p-12">
        <form onSubmit={submit} className="w-full max-w-sm animate-fade-up" data-testid="login-form">
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <span className="h-2.5 w-2.5 rounded-full bg-bmw-light" />
            <span className="h-2.5 w-2.5 rounded-full bg-bmw-blue" />
            <span className="h-2.5 w-2.5 rounded-full bg-bmw-red" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-bmw-blue">Acceso</p>
          <h1 className="font-display text-3xl sm:text-4xl font-light mt-2 mb-8">Inicia sesión</h1>

          <div className="space-y-5">
            <div>
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-bmw-soft">Email</Label>
              <Input
                id="email" type="email" value={email} required
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@concesionario.com"
                className="mt-2 h-12 rounded-xl"
                data-testid="login-email-input"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-bmw-soft">Contraseña</Label>
              <Input
                id="password" type="password" value={password} required
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-2 h-12 rounded-xl"
                data-testid="login-password-input"
              />
            </div>
          </div>

          {error && (
            <p className="mt-4 text-sm text-bmw-red" data-testid="login-error">{error}</p>
          )}

          <Button
            type="submit" disabled={loading}
            className="mt-8 w-full h-12 rounded-xl bg-bmw-blue hover:bg-bmw-dark text-white font-medium transition-colors duration-200"
            data-testid="login-submit-button"
          >
            {loading ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
