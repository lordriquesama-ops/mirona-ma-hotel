
import React, { useState } from 'react';
import { UserIcon, LockIcon, EyeIcon, EyeOffIcon, LogoIcon } from './Icons';
import { User } from '../types';
import { authenticateUser, logAction } from '../services/db';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
      setError(`Too many failed attempts. Please try again in ${remaining} seconds.`);
      return;
    }

    setLoading(true);

    try {
      const cleanUsername = username.trim();
      await new Promise(r => setTimeout(r, 800));
      const user = await authenticateUser(cleanUsername, password);

      if (user) {
        await logAction(user, 'LOGIN', 'User logged in successfully');
        setAttempts(0);
        setLockoutUntil(null);
        onLogin(user);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (newAttempts >= 5) {
            const lockoutTime = Date.now() + 30000;
            setLockoutUntil(lockoutTime);
            setError('Too many failed attempts. Account locked for 30 seconds.');
        } else {
            setError(`Invalid credentials. ${5 - newAttempts} attempts remaining.`);
        }
      }
    } catch (err) {
      setError('System error. Please contact support.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center font-sans bg-[#d9e8fb] selection:bg-blue-100">
      <div className="w-full max-w-[360px] p-6 animate-fade-in">
          <div className="flex flex-col items-center">
              {/* Circular User Icon Header */}
              <div className="w-32 h-32 rounded-full border-4 border-[#1e73be] flex items-center justify-center mb-12 bg-transparent">
                  <div className="w-24 h-24 rounded-full bg-[#1e73be] flex items-center justify-center overflow-hidden">
                      <UserIcon className="w-20 h-20 text-white translate-y-2" />
                  </div>
              </div>

              <form onSubmit={handleSubmit} className="w-full space-y-4">
                  {/* Username Field */}
                  <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <UserIcon className="h-6 w-6 text-[#1e73be]" />
                      </div>
                      <div className="absolute inset-y-0 left-12 w-px h-8 my-auto bg-[#1e73be]/30"></div>
                      <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="block w-full pl-16 pr-4 py-3 bg-white border-2 border-[#1e73be] rounded-xl text-[#1e73be] text-lg focus:ring-0 outline-none transition-all placeholder-[#1e73be]/60 font-medium"
                          placeholder="Username"
                          required
                      />
                  </div>

                  {/* Password Field */}
                  <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <LockIcon className="h-6 w-6 text-[#1e73be]" />
                      </div>
                      <div className="absolute inset-y-0 left-12 w-px h-8 my-auto bg-[#1e73be]/30"></div>
                      <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="block w-full pl-16 pr-12 py-3 bg-white border-2 border-[#1e73be] rounded-xl text-[#1e73be] text-lg focus:ring-0 outline-none transition-all placeholder-[#1e73be]/60 font-medium"
                          placeholder="Password"
                          required
                      />
                      <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#1e73be] hover:text-[#165a94] cursor-pointer transition-colors"
                      >
                          {showPassword ? <EyeOffIcon className="h-6 w-6" /> : <EyeIcon className="h-6 w-6" />}
                      </button>
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className="flex items-center justify-between px-1">
                      <label className="flex items-center gap-2 cursor-pointer group">
                          <div className="relative flex items-center">
                              <input 
                                  type="checkbox" 
                                  checked={rememberMe}
                                  onChange={(e) => setRememberMe(e.target.checked)}
                                  className="peer h-5 w-5 cursor-pointer appearance-none rounded border-2 border-[#1e73be] checked:bg-[#1e73be] transition-all" 
                              />
                              <svg className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          </div>
                          <span className="text-sm font-medium text-[#1e73be]">Remember me</span>
                      </label>
                      <button type="button" className="text-sm font-medium text-[#1e73be] hover:underline transition-all">Forgot password?</button>
                  </div>

                  {error && (
                      <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-bold p-3 rounded-lg flex items-center gap-2 animate-shake justify-center">
                          {error}
                      </div>
                  )}

                  {/* Login Button */}
                  <button
                      type="submit"
                      disabled={loading}
                      className={`w-full flex justify-center py-4 px-4 rounded-xl text-2xl font-bold text-white bg-[#1e73be] hover:bg-[#165a94] transition-all transform active:scale-[0.98] mt-8 shadow-md ${loading ? 'opacity-80 cursor-wait' : ''}`}
                  >
                      {loading ? '...' : 'LOGIN'}
                  </button>
              </form>
          </div>
      </div>
    </div>
  );
};

export default Login;
