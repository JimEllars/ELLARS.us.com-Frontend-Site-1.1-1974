import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { useAppStore } from '@/store/useAppStore';
import { loginUser } from '@/lib/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const setUserToken = useAppStore(state => state.setUserToken);
  const showToast = useAppStore(state => state.showToast);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await loginUser(email, password);
      if (result.success) {
        setUserToken(result.data.access_token);
        showToast('Login successful. Establishing secure connection.');
        navigate('/dashboard', { replace: true });
      } else {
        setError(result.message);
        showToast(result.message);
      }
    } catch (err) {
      const errMsg = 'A connection error occurred. Please try again.';
      setError(errMsg);
      showToast(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Auth Gateway | James Ellars</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-void flex items-center justify-center p-6 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-electric/5 rounded-full blur-[100px]"></div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md deco-frame p-8 relative z-10 bg-void/80 backdrop-blur-md"
        >
          <div className="text-center mb-10">
            <h1 className="font-editorial font-black text-4xl tracking-tighter text-white uppercase mb-2">
              Access <span className="text-yellow-electric">Gateway</span>
            </h1>
            <div className="h-px w-16 bg-yellow-electric/50 mx-auto mb-4"></div>
            <p className="font-mono text-xs text-gray-400 uppercase tracking-widest">
              Authorized Personnel Only
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block font-editorial font-bold text-xs uppercase tracking-widest text-yellow-electric mb-2" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-void border border-white/20 text-white p-3 font-mono text-sm focus:border-yellow-electric focus:ring-1 focus:ring-yellow-electric outline-none transition-colors"
                placeholder="Enter authorized email"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block font-editorial font-bold text-xs uppercase tracking-widest text-yellow-electric mb-2" htmlFor="password">
                Security Key
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-void border border-white/20 text-white p-3 font-mono text-sm focus:border-yellow-electric focus:ring-1 focus:ring-yellow-electric outline-none transition-colors"
                placeholder="Enter your password"
                disabled={isLoading}
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-red-500 font-mono text-xs uppercase tracking-widest border border-red-500/30 bg-red-500/10 p-3"
              >
                [ERROR] {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-yellow-electric text-black font-editorial font-bold text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(250,204,21,0.3)] hover:bg-yellow-400 transition-colors hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Initialize Session</span>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </>
  );
};

export default Login;
