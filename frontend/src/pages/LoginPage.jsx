import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const LoginPage = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate(); // ✅ for redirection

  const handleAuth = async () => {
    setLoading(true);
    setMessage('');

    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          setMessage('Passwords do not match');
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage('Check your email for verification link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        setMessage('Login successful!');
        setTimeout(() => navigate('/home'), 500); // ✅ redirect after short delay
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setMessage('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden flex items-center justify-center font-lobster ">
      {/* Cool Dark Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/img/logBg2.jpg')`
        }}
      />

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Main Container */}
      <div className="w-full h-full flex items-center justify-center p-4">
        {/* Auth Circle */}
        <div className="relative">
          {/* Glow */}
          <div
            className="absolute inset-0 rounded-full animate-pulse"
            style={{
              background:
                'radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.2) 50%, transparent 70%)',
              filter: 'blur(20px)',
              transform: 'scale(1.2)',
            }}
          />

          {/* Main Circle */}
          <div className="font-lobster relative w-[min(100vw,450px)] h-[min(100vw,450px)] rounded-full overflow-hidden shadow-2xl perspective-1000">

            {/* Flip */}
            <div
              className="w-full h-full relative"
              style={{
                transformStyle: 'preserve-3d',
                transform: isSignUp ? 'rotateY(180deg)' : 'rotateY(0deg)',
                transition: 'transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
              }}
            >
              {/* Login Side */}
              <div
                className="absolute inset-0 p-8 flex flex-col justify-center items-center text-white rounded-full"
                style={{
                  backfaceVisibility: 'hidden',
                  background: 'rgba(0, 0, 0, 0.4)'
                }}
              >
                <h2 className="text-3xl font-bold mb-8 text-center">
                  Welcome Back
                </h2>

                <div className="w-full max-w-xs space-y-4">
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
                  />

                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
                  />

                  <button
                    onClick={handleAuth}
                    disabled={loading}
                    className="w-full py-3 rounded-lg bg-white/20 text-white font-semibold hover:bg-white/30 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 border border-white/30"
                  >
                    {loading ? 'Signing In...' : 'Sign In'}
                  </button>
                </div>

                <button
                  onClick={toggleMode}
                  className="mt-6 text-white/80 hover:text-white transition-colors underline"
                >
                  Create New Account
                </button>
              </div>

              {/* Sign Up Side */}
              <div
                className="absolute inset-0 p-8 flex flex-col justify-center items-center text-white rounded-full"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  background: 'rgba(0, 0, 0, 0.4)'
                }}
              >
                <div className="w-full h-full flex flex-col justify-center items-center">
                  <h2 className="text-3xl font-bold mb-6 text-center">
                    Create Account
                  </h2>

                  <div className="w-full max-w-xs space-y-4">
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
                    />

                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
                    />

                    <input
                      type="password"
                      placeholder="Confirm Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
                    />

                    <button
                      onClick={handleAuth}
                      disabled={loading}
                      className="w-full py-3 rounded-lg bg-white/20 text-white font-semibold hover:bg-white/30 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 border border-white/30"
                    >
                      {loading ? 'Creating Account...' : 'Sign Up'}
                    </button>
                  </div>

                  <button
                    onClick={toggleMode}
                    className="mt-4 text-white/80 hover:text-white transition-colors underline"
                  >
                    Already have an account?
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-lg border border-white/30">
          {message}
        </div>
      )}

      <style jsx>{`
        @keyframes rotateGlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes fall {
          0% { transform: translateY(-100vh); }
          100% { transform: translateY(100vh); }
        }
        
        .perspective-1000 {
          perspective: 1000px;
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
