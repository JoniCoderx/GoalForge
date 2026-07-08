import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './store/auth';
import { PageLoader } from './components/ui/PageLoader';
import { DashboardLayout } from './components/dashboard/DashboardLayout';

const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Overview = lazy(() => import('./pages/dashboard/Overview'));
const Create = lazy(() => import('./pages/dashboard/Create'));
const Videos = lazy(() => import('./pages/dashboard/Videos'));
const VideoDetail = lazy(() => import('./pages/dashboard/VideoDetail'));
const Queue = lazy(() => import('./pages/dashboard/Queue'));
const Drafts = lazy(() => import('./pages/dashboard/Drafts'));
const Templates = lazy(() => import('./pages/dashboard/Templates'));
const Prompts = lazy(() => import('./pages/dashboard/Prompts'));
const Brand = lazy(() => import('./pages/dashboard/Brand'));
const Exports = lazy(() => import('./pages/dashboard/Exports'));
const Analytics = lazy(() => import('./pages/dashboard/Analytics'));
const Settings = lazy(() => import('./pages/dashboard/Settings'));
const Admin = lazy(() => import('./pages/dashboard/Admin'));
const Console = lazy(() => import('./pages/Console'));
const NotFound = lazy(() => import('./pages/NotFound'));

function Protected({ children, adminOnly }: { children: JSX.Element; adminOnly?: boolean }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (adminOnly && user.role !== 'ADMIN') return <Navigate to="/app" replace />;
  return children;
}

function PublicOnly({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to="/app" replace />;
  return children;
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />

        {/* Private owner console — password-gated, not linked in navigation. */}
        <Route path="/users" element={<Console />} />

        <Route
          path="/app"
          element={
            <Protected>
              <DashboardLayout />
            </Protected>
          }
        >
          <Route index element={<Overview />} />
          <Route path="create" element={<Create />} />
          <Route path="videos" element={<Videos />} />
          <Route path="videos/:id" element={<VideoDetail />} />
          <Route path="queue" element={<Queue />} />
          <Route path="drafts" element={<Drafts />} />
          <Route path="templates" element={<Templates />} />
          <Route path="prompts" element={<Prompts />} />
          <Route path="brand" element={<Brand />} />
          <Route path="exports" element={<Exports />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<Settings />} />
          <Route path="admin" element={<Protected adminOnly><Admin /></Protected>} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
