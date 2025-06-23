import { Navigate, Route, Routes } from "react-router"; // Ensure 'react-router-dom'

import HomePage from "./pages/HomePage.jsx";
import SignUpPage from "./pages/SignUpPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import CallPage from "./pages/CallPage.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import OnboardingPage from "./pages/OnboardingPage.jsx";
import FriendsPage from "./pages/FriendsPage.jsx";

import { Toaster } from "react-hot-toast";
import PageLoader from "./components/PageLoader.jsx";
import useAuthUser from "./hooks/useAuthUser.js";
import Layout from "./components/Layout.jsx";
import { useThemeStore } from "./store/useThemeStore.js";

const App = () => {
  const { isLoading, authUser } = useAuthUser();
  const { theme } = useThemeStore();

  // CRUCIAL: Wait for authUser status to be resolved before rendering routes
  if (isLoading) {
    return <PageLoader />;
  }

  const isAuthenticated = Boolean(authUser);
  const isOnboarded = authUser?.isOnboarded;

  // Helper component for routes that require authentication AND onboarding
  const ProtectedOnboardedRoute = ({ children }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    if (!isOnboarded) {
      // If authenticated but not onboarded, force onboarding
      return <Navigate to="/onboarding" replace />;
    }
    return children; // User is authenticated and onboarded
  };

  // Helper component for routes like /login and /signup
  // If authenticated, redirect away from these pages
  const AuthRedirectRoute = ({ children }) => {
    if (isAuthenticated) {
      // If already authenticated, redirect based on onboarding status
      return isOnboarded ? <Navigate to="/" replace /> : <Navigate to="/onboarding" replace />;
    }
    return children; // User is not authenticated, show login/signup
  };

  return (
    <div className="h-screen" data-theme={theme}>
      <Routes>
        {/* Routes requiring authentication and onboarding */}
        <Route
          path="/"
          element={
            <ProtectedOnboardedRoute>
              <Layout showSidebar={true}><HomePage /></Layout>
            </ProtectedOnboardedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedOnboardedRoute>
              <Layout showSidebar={true}><NotificationsPage /></Layout>
            </ProtectedOnboardedRoute>
          }
        />
        <Route
          path="/friends"
          element={
            <ProtectedOnboardedRoute>
              <Layout showSidebar={true}><FriendsPage /></Layout>
            </ProtectedOnboardedRoute>
          }
        />
        <Route
          path="/call/:id"
          element={
            <ProtectedOnboardedRoute>
              <CallPage /> {/* Assuming CallPage manages its own layout or doesn't need standard Layout */}
            </ProtectedOnboardedRoute>
          }
        />
        <Route
          path="/chat/:id"
          element={
            <ProtectedOnboardedRoute>
              <Layout showSidebar={false}><ChatPage /></Layout>
            </ProtectedOnboardedRoute>
          }
        />

        {/* Authentication routes (Login, Signup) */}
        <Route
          path="/signup"
          element={
            <AuthRedirectRoute>
              <SignUpPage />
            </AuthRedirectRoute>
          }
        />
        <Route
          path="/login"
          element={
            <AuthRedirectRoute>
              <LoginPage />
            </AuthRedirectRoute>
          }
        />

        {/* Onboarding Page */}
        {/* Accessible if authenticated. The page itself determines if it's "Complete" or "Update" based on authUser.isOnboarded */}
        <Route
          path="/onboarding"
          element={
            isAuthenticated ? (
              <Layout showSidebar={true}> {/* Or false if sidebar not needed on onboarding */}
                <OnboardingPage />
              </Layout>
            ) : (
              <Navigate to="/login" replace /> // If not authenticated, redirect to login
            )
          }
        />
        
        {/* Fallback for any other route - consider a 404 page */}
        <Route path="*" element={<Navigate to={isAuthenticated && isOnboarded ? "/" : "/login"} replace />} />

      </Routes>
      <Toaster />
    </div>
  );
};
export default App;