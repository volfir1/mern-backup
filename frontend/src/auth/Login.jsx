// src/auth/Login.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../utils/authContext';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Loader2 } from 'lucide-react';

const validationSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .required('Password is required')
});

const Login = () => {
  const [loading, setLoading] = useState(false);
  const { error, setError, login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleGoogleLogin = async (response) => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Google response:', response);

      if (!response?.credential) {
        throw new Error('No credential received from Google');
      }

      const user = await googleLogin(response.credential);
      
      if (user) {
        console.log('Google login successful, user:', user);
        const redirectPath = user.role === 'admin' 
          ? '/admin/dashboard' 
          : '/user/dashboard';
        navigate(redirectPath, { replace: true });
      }
    } catch (err) {
      console.error('Google auth error:', err);
      if (err.message?.includes('not found') || err.message?.includes('register')) {
        setError('Account not found. Please register first.');
        setTimeout(() => {
          navigate('/register');
        }, 2000);
      } else {
        setError(err.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadGoogleScript = () => {
      if (window.google) {
        console.log('Initializing Google Sign-In');
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleGoogleLogin,
          auto_select: false,
        });

        window.google.accounts.id.renderButton(
          document.getElementById('googleSignInButton'),
          { 
            theme: 'outline', 
            size: 'large', 
            width: '100%',
            text: 'signin_with',
            shape: 'pill'
          }
        );
      } else {
        console.error('Google Sign-In SDK not loaded');
      }
    };

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = loadGoogleScript;
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      if (window.google) {
        window.google.accounts.id.cancel();
      }
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
              create a new account
            </Link>
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Google Sign-In Button */}
        <div className="mt-6">
          <div id="googleSignInButton" className="flex justify-center"></div>
          <div className="mt-3 text-center">
            <span className="text-gray-500">or</span>
          </div>
        </div>

        <Formik
          initialValues={{ email: '', password: '' }}
          validationSchema={validationSchema}
          onSubmit={async (values, { setSubmitting }) => {
            try {
              setError('');
              console.log('Attempting email login...');
              const user = await login({
                email: values.email,
                password: values.password
              });

              if (user) {
                console.log('Email login successful, user:', user);
                const defaultPath = user.role === 'admin' 
                  ? '/admin/dashboard' 
                  : '/user/dashboard';
                const from = location.state?.from?.pathname || defaultPath;
                navigate(from, { replace: true });
              }
            } catch (err) {
              console.error('Login error:', err);
              setError(err.message || 'Login failed. Please try again.');
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {({ isSubmitting }) => (
            <Form className="mt-8 space-y-6">
              <div className="rounded-md shadow-sm -space-y-px">
                <div>
                  <label htmlFor="email" className="sr-only">
                    Email address
                  </label>
                  <Field
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Email address"
                    disabled={isSubmitting}
                  />
                  <ErrorMessage 
                    name="email" 
                    component="div" 
                    className="text-red-500 text-sm mt-1" 
                  />
                </div>
                <div>
                  <label htmlFor="password" className="sr-only">
                    Password
                  </label>
                  <Field
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Password"
                    disabled={isSubmitting}
                  />
                  <ErrorMessage 
                    name="password" 
                    component="div" 
                    className="text-red-500 text-sm mt-1" 
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <Link 
                    to="/forgot-password" 
                    className="font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    Forgot your password?
                  </Link>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                      Signing in...
                    </span>
                  ) : (
                    'Sign in with Email'
                  )}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default Login;