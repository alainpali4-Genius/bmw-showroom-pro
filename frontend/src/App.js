import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/layout/AppShell";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Stock from "@/pages/Stock";
import Plano from "@/pages/Plano";
import ComingSoon from "@/pages/ComingSoon";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="stock" element={<Stock />} />
              <Route path="plano" element={<Plano />} />
              <Route path="entregas" element={<ComingSoon title="Entregas" />} />
              <Route path="mobiliario" element={<ComingSoon title="Mobiliario" />} />
              <Route path="estadisticas" element={<ComingSoon title="Estadísticas" />} />
              <Route path="configuracion" element={<ComingSoon title="Configuración" />} />
            </Route>
          </Routes>
          <Toaster position="top-center" richColors />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
