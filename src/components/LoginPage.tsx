import React, { useState } from 'react';
import { User } from '../../types';
import { Lock, Mail, ArrowRight } from 'lucide-react';

// Import version from package.json
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.5.3';

interface LoginPageProps {
  onLogin: (email: string, password: string) => void;
  error?: string;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, error }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 relative overflow-hidden p-4">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gov-700 z-0"></div>
      <div className="absolute top-0 left-0 w-full h-full opacity-10 z-0" 
           style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #ffffff 0%, transparent 20%), radial-gradient(circle at 80% 30%, #ffffff 0%, transparent 20%)' }}>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-md z-10 relative border border-slate-200">
        <div className="text-center mb-6 sm:mb-8">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gov-600 rounded-xl mx-auto flex items-center justify-center mb-3 sm:mb-4 shadow-lg shadow-gov-200">
                <span className="text-white font-bold text-2xl sm:text-3xl">P</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Manajemen Kerja</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">KemenPPPA Republik Indonesia</p>
        </div>

        {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs sm:text-sm rounded-lg border border-red-100 flex items-center justify-center">
                {error}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div>
                <label className="block text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 sm:mb-2">Email Pegawai</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gov-400 focus:bg-white transition-all"
                        placeholder="nama@kemenpppa.go.id"
                    />
                </div>
            </div>

            <div>
                <label className="block text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 sm:mb-2">Password</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="password" 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gov-400 focus:bg-white transition-all"
                        placeholder="••••••••"
                    />
                </div>
            </div>

            <button 
                type="submit"
                className="w-full bg-gov-600 hover:bg-gov-700 text-white font-bold py-3 sm:py-3.5 rounded-xl shadow-lg shadow-gov-200 hover:shadow-xl transition-all flex items-center justify-center gap-2 group text-sm sm:text-base"
            >
                Masuk Dashboard
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
        </form>

        <div className="mt-6 sm:mt-8 text-center">
            <p className="text-[10px] sm:text-xs text-slate-400">
                &copy; {new Date().getFullYear()} Biro Data & Informasi KemenPPPA
            </p>
            <p className="text-[9px] sm:text-[10px] text-slate-300 mt-1">
                v{APP_VERSION}
            </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
