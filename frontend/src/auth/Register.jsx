// src/auth/Register.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/authContext';
import { Loader2 } from 'lucide-react';
import api from '../api/authApi';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';

const validationSchema = Yup.object().shape({
 name: Yup.string()
   .required('Full name is required'),
 email: Yup.string()
   .email('Invalid email address')
   .required('Email is required'),
 password: Yup.string()
   .min(6, 'Password must be at least 6 characters')
   .required('Password is required'),
 confirmPassword: Yup.string()
   .oneOf([Yup.ref('password'), null], 'Passwords must match')
   .required('Confirm password is required')
});

const Register = () => {
 const [loading, setLoading] = useState(false);
 const [registrationComplete, setRegistrationComplete] = useState(false);
 const { error, setError } = useAuth();
 const navigate = useNavigate();

 const handleGoogleLogin = async (response) => {
  try {
      setLoading(true);
      setError('');
      
      console.log('Google response:', response);

      if (!response?.credential) {
          throw new Error('No credential received from Google');
      }

      // Modified to include isRegistration flag
      const result = await api.googleLogin({
          credential: response.credential,
          isRegistration: true // This indicates a login attempt
      });

      console.log('Google auth result:', result);

      if (result.success) {
          // If existing user, proceed with login
          const redirectPath = result.user.role === 'admin' 
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
           text: 'signup_with',
           shape: 'pill'
         }
       );
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

 if (registrationComplete) {
   return (
     <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
       <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow">
         <div className="text-center">
           <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
             <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
             </svg>
           </div>
           <h2 className="text-xl font-semibold text-gray-900 mb-2">Registration Successful!</h2>
           <p className="text-gray-600 mb-4">
             Please check your email to verify your account. The verification link will expire in 24 hours.
           </p>
           <p className="text-sm text-gray-500 mb-4">
             If you don't see the email, please check your spam folder.
           </p>
           <Link
             to="/login"
             className="text-indigo-600 hover:text-indigo-500"
           >
             Go to Login
           </Link>
         </div>
       </div>
     </div>
   );
 }

 return (
   <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
     <div className="max-w-md w-full space-y-8">
       <div>
         <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
           Create your account
         </h2>
         <p className="mt-2 text-center text-sm text-gray-600">
           Or{' '}
           <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
             sign in to your account
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

       <Formik
         initialValues={{
           name: '',
           email: '',
           password: '',
           confirmPassword: ''
         }}
         validationSchema={validationSchema}
         onSubmit={async (values, { setSubmitting }) => {
           try {
             setError('');
             const result = await api.register({
               name: values.name,
               email: values.email,
               password: values.password,
             });

             if (result.success) {
               setRegistrationComplete(true);
             }
           } catch (err) {
             console.error('Registration error:', err);
             setError(err.message || 'Registration failed. Please try again.');
           } finally {
             setSubmitting(false);
           }
         }}
       >
         {({ isSubmitting }) => (
           <Form className="mt-8 space-y-6">
             <div className="rounded-md shadow-sm -space-y-px">
               <div>
                 <label htmlFor="name" className="sr-only">
                   Full Name
                 </label>
                 <Field
                   id="name"
                   name="name"
                   type="text"
                   className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                   placeholder="Full Name"
                   disabled={isSubmitting}
                 />
                 <ErrorMessage name="name" component="div" className="text-red-500 text-sm mt-1" />
               </div>
               <div>
                 <label htmlFor="email" className="sr-only">
                   Email address
                 </label>
                 <Field
                   id="email"
                   name="email"
                   type="email"
                   className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                   placeholder="Email address"
                   disabled={isSubmitting}
                 />
                 <ErrorMessage name="email" component="div" className="text-red-500 text-sm mt-1" />
               </div>
               <div>
                 <label htmlFor="password" className="sr-only">
                   Password
                 </label>
                 <Field
                   id="password"
                   name="password"
                   type="password"
                   className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                   placeholder="Password"
                   disabled={isSubmitting}
                 />
                 <ErrorMessage name="password" component="div" className="text-red-500 text-sm mt-1" />
               </div>
               <div>
                 <label htmlFor="confirmPassword" className="sr-only">
                   Confirm Password
                 </label>
                 <Field
                   id="confirmPassword"
                   name="confirmPassword"
                   type="password"
                   className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                   placeholder="Confirm Password"
                   disabled={isSubmitting}
                 />
                 <ErrorMessage name="confirmPassword" component="div" className="text-red-500 text-sm mt-1" />
               </div>
             </div>

             <div>
               <button
                 type="submit"
                 disabled={isSubmitting}
                 className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
               >
                 {isSubmitting ? (
                   <Loader2 className="animate-spin h-5 w-5" />
                 ) : (
                   'Create Account'
                 )}
               </button>
             </div>
           </Form>
         )}
       </Formik>

       <div className="mt-6">
         <div className="relative">
           <div className="absolute inset-0 flex items-center">
             <div className="w-full border-t border-gray-300" />
           </div>
           <div className="relative flex justify-center text-sm">
             <span className="px-2 bg-gray-50 text-gray-500">Or continue with</span>
           </div>
         </div>

         <div className="mt-6">
           <div id="googleSignInButton" className="flex justify-center"></div>
         </div>
       </div>
     </div>
   </div>
 );
};

export default Register;