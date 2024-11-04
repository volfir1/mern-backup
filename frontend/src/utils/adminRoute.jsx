// adminRoute.jsx
import React, { useEffect } from 'react'; // Make sure to import useEffect
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './authContext';
import { Loader2 } from 'lucide-react';

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="flex flex-col items-center space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      <p className="text-sm text-gray-500">Loading...</p>
    </div>
  </div>
);

export const RoleBasedRedirect = () => {
  const { isAuthenticated, user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Add debug logging
    console.log('RoleBasedRedirect State:', {
      isAuthenticated,
      user,
      loading,
      token: localStorage.getItem('token')
    });

    if (!loading) {
      if (isAuthenticated && user) {
        const targetPath = user.role === 'admin' ? '/admin/dashboard' : '/user/dashboard';
        console.log('Redirecting to:', targetPath);
        navigate(targetPath, { replace: true });
      } else {
        console.log('Redirecting to login');
        navigate('/login', { replace: true });
      }
    }
  }, [isAuthenticated, user, loading, navigate]);

  return <LoadingFallback />;
};

const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Add debug logging
  useEffect(() => {
    console.log('AdminRoute State:', {
      user,
      isAuthenticated,
      loading,
      token: localStorage.getItem('token'),
      currentPath: location.pathname
    });
  }, [user, isAuthenticated, loading, location]);

  if (loading) {
    return <LoadingFallback />;
  }

  if (!isAuthenticated) {
    console.log('Not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.role !== 'admin') {
    console.log('Not admin, redirecting to unauthorized');
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export const UserRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Add debug logging
  useEffect(() => {
    console.log('UserRoute State:', {
      user,
      isAuthenticated,
      loading,
      token: localStorage.getItem('token'),
      currentPath: location.pathname
    });
  }, [user, isAuthenticated, loading, location]);

  if (loading) {
    return <LoadingFallback />;
  }

  if (!isAuthenticated) {
    console.log('Not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.role === 'admin') {
    console.log('Admin user in user route, redirecting to unauthorized');
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export const PublicRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();

  // Add debug logging
  useEffect(() => {
    console.log('PublicRoute State:', {
      user,
      isAuthenticated,
      loading,
      token: localStorage.getItem('token')
    });
  }, [user, isAuthenticated, loading]);

  if (loading) {
    return <LoadingFallback />;
  }

  if (isAuthenticated) {
    const targetPath = user?.role === 'admin' ? '/admin/dashboard' : '/user/dashboard';
    console.log('Authenticated user in public route, redirecting to:', targetPath);
    return <Navigate to={targetPath} replace />;
  }

  return children;
};

// Add a token verification component
export const TokenVerifier = () => {
  const { user, isAuthenticated } = useAuth();
  
  useEffect(() => {
    const verifyToken = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('Current Token State:', {
          token: token ? 'exists' : 'missing',
          tokenLength: token?.length,
          isAuthenticated,
          user,
          headers: token ? {
            'Authorization': `Bearer ${token}`
          } : 'no token'
        });
      } catch (error) {
        console.error('Token verification failed:', error);
      }
    };

    verifyToken();
  }, [user, isAuthenticated]);

  return null;
};

export default AdminRoute;