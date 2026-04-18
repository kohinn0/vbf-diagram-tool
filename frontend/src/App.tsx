import { createBrowserRouter, RouterProvider, Outlet, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Layout } from './components/ui/Layout';
import Landing from './pages/Landing';
import DiagramTab from './pages/DiagramTab';
import ReportTab from './pages/ReportTab';
import DefectsTab from './pages/DefectsTab';
import MeasurementsTab from './pages/MeasurementsTab';
import AdminTab from './pages/AdminTab';
import OpsTab from './pages/OpsTab';
import DashboardTab from './pages/DashboardTab';
import ProfileTab from './pages/ProfileTab';
import ReportsListTab from './pages/ReportsListTab';
import SubscriptionTab from './pages/SubscriptionTab';
import StatusPage from './pages/StatusPage';
import DataPrivacyTab from './pages/DataPrivacyTab';
import { CookieConsentBanner } from './components/ui/CookieConsentBanner';

// Ez az App.tsx felel a kliens oldali útválasztásért
const router = createBrowserRouter([
  {
    path: "/",
    element: <Landing />
  },
  {
    path: "/status",
    element: <StatusPage />
  },
  {
    path: "/app",
    element: (
      <Layout>
        {/* Az <Outlet /> rendereli a megfelelő aloldalt az útvonal alapján */}
        <Outlet />
      </Layout>
    ),
    children: [
      { path: "", element: <Navigate to="/app/diagram" replace /> },
      { path: "dashboard", element: <DashboardTab /> },
      { path: "reports", element: <ReportsListTab /> },
      { path: "subscription", element: <SubscriptionTab /> },
      { path: "diagram", element: <DiagramTab /> },
      { path: "report", element: <ReportTab /> },
      { path: "defects", element: <DefectsTab /> },
      { path: "measurements", element: <MeasurementsTab /> },
      { path: "admin", element: <AdminTab /> },
      { path: "ops", element: <OpsTab /> },
      { path: "profile", element: <ProfileTab /> },
      { path: "data", element: <DataPrivacyTab /> },
    ]
  }
]);

function App() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Toaster position="top-center" richColors={false} closeButton theme="dark" />
      <CookieConsentBanner />
      <div className="min-h-0 flex-1 flex flex-col overflow-hidden">
        <RouterProvider router={router} />
      </div>
    </div>
  );
}

export default App;
