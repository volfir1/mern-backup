// src/auth/EmailVerification.jsx
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../utils/authContext';
import { Loader2 } from 'lucide-react';

const EmailVerification = () => {
  const [searchParams] = useSearchParams();
  const { verifyEmail, error, setError } = useAuth();
  const [verificationStatus, setVerificationStatus] = useState('verifying');
  const navigate = useNavigate();

  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get('token');
      if (!token) {
        setVerificationStatus('invalid');
        setError('No verification token provided');
        return;
      }

      try {
        await verifyEmail(token);
        setVerificationStatus('success');
        // Redirect to login after 3 seconds
        setTimeout(() => navigate('/login'), 3000);
      } catch (err) {
        setVerificationStatus('error');
      }
    };

    verifyToken();
  }, [searchParams, verifyEmail, setError, navigate]);

  const renderStatus = () => {
    switch (verificationStatus) {
      case 'verifying':
        return (
          <div className="flex flex-col items-center">
            <Loader2 className="animate-spin h-8 w-8 text-indigo-600 mb-4" />
            <p>Verifying your email...</p>
          </div>
        );
      case 'success':
        return (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Email Verified Successfully!</h2>
            <p className="text-gray-600 mb-4">Redirecting you to login...</p>
          </div>
        );
      case 'error':
        return (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Verification Failed</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <Link to="/login" className="text-indigo-600 hover:text-indigo-500">
              Return to Login
            </Link>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow">
        {renderStatus()}
      </div>
    </div>
  );
};

export default EmailVerification;