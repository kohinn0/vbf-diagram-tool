import { createBrowserRouter, RouterProvider, Outlet, Navigate } from 'react-router-dom';
import { Layout } from './components/ui/Layout';
import Landing from './pages/Landing';
import DiagramTab from './pages/DiagramTab';
import ReportTab from './pages/ReportTab';
import DefectsTab from './pages/DefectsTab';
import MeasurementsTab from './pages/MeasurementsTab';

// Ez az App.tsx felel a kliens oldali útválasztásért
const router = createBrowserRouter([
  {
    path: "/",
    element: <Landing />
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
      { path: "diagram", element: <DiagramTab /> },
      { path: "report", element: <ReportTab /> },
      { path: "defects", element: <DefectsTab /> },
      { path: "measurements", element: <MeasurementsTab /> },
    ]
  }
]);

function App() {
  return (
    <RouterProvider router={router} />
  );
}

export default App;
