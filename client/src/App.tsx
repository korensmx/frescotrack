// Mapa de pantallas de la app.
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import Layout from './components/Layout';
import { Loading } from './components/ui';
import { Login, Register } from './pages/Auth';
import Radar from './pages/Radar';
import Scan from './pages/Scan';
import WhatsApp from './pages/WhatsApp';
import { Clients, ClientDetail } from './pages/Clients';
import EquipmentDetail from './pages/EquipmentDetail';
import Settings from './pages/Settings';
import Prices from './pages/Prices';
import Pro from './pages/Pro';
import Stickers from './pages/Stickers';
import PublicEquipment from './pages/PublicEquipment';

export default function App() {
  const { user, loading } = useAuth();

  return (
    <Routes>
      {/* Pública: lo que ve el cliente al escanear el sticker */}
      <Route path="/e/:code" element={<PublicEquipment />} />

      {loading ? (
        <Route path="*" element={<Loading />} />
      ) : !user ? (
        <>
          <Route path="/entrar" element={<Login />} />
          <Route path="/registro" element={<Register />} />
          <Route path="*" element={<Navigate to="/entrar" replace />} />
        </>
      ) : (
        <Route element={<Layout />}>
          <Route index element={<Radar />} />
          <Route path="escanear" element={<Scan />} />
          <Route path="whatsapp" element={<WhatsApp />} />
          <Route path="clientes" element={<Clients />} />
          <Route path="clientes/:id" element={<ClientDetail />} />
          <Route path="equipos/:id" element={<EquipmentDetail />} />
          <Route path="ajustes" element={<Settings />} />
          <Route path="ajustes/precios" element={<Prices />} />
          <Route path="pro" element={<Pro />} />
          <Route path="stickers" element={<Stickers />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      )}
    </Routes>
  );
}
