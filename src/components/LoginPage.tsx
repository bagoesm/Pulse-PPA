import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldCheck, Activity, Sparkles, CheckCircle2, TrendingUp, Calendar, Inbox, FileText, CheckSquare, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import ParticlesBackground from './ParticlesBackground';

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

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { type: "spring" as const, stiffness: 100, damping: 15 }
        }
    };

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans">
            {/* Left Pane - Branding & Graphic (Hidden on mobile) */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-gov-800 via-gov-900 to-slate-900 flex-col p-12 xl:p-16">
                {/* Interactive Particles Background */}
                <ParticlesBackground
                    particleCount={60}
                    color="165, 243, 252"
                    className="opacity-50"
                />

                {/* Abstract Background Shapes - Animated */}
                <motion.div
                    animate={{
                        scale: [1, 1.1, 1],
                        rotate: [0, 90, 0],
                        opacity: [0.3, 0.5, 0.3]
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[-10%] left-[-10%] w-[50rem] h-[50rem] bg-gov-600 rounded-full mix-blend-multiply filter blur-[120px]"
                />
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        x: [0, 100, 0],
                        y: [0, -50, 0],
                        opacity: [0.4, 0.6, 0.4]
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-[-20%] right-[-10%] w-[40rem] h-[40rem] bg-cyan-700 rounded-full mix-blend-multiply filter blur-[100px]"
                />
                <motion.div
                    animate={{
                        x: [0, -50, 0],
                        y: [0, 100, 0],
                        opacity: [0.2, 0.4, 0.2]
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[30%] left-[40%] w-[30rem] h-[30rem] bg-blue-500 rounded-full mix-blend-overlay filter blur-[120px]"
                />

                {/* Subtle Grid Overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.25] mix-blend-overlay"></div>

                {/* Top Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="relative z-10 flex items-center gap-4"
                >
                    <div className="w-12 h-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
                        <span className="text-white font-bold text-2xl relative z-10">P</span>
                    </div>
                    <div>
                        <h2 className="text-white font-semibold text-xl tracking-tight leading-none mb-1">Pulse PPA</h2>
                        <p className="text-gov-300 text-[10px] font-bold uppercase tracking-[0.2em] leading-none flex items-center gap-1.5">
                            Dashboard Sistem
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                        </p>
                    </div>
                </motion.div>

                {/* Center Content */}
                <div className="relative z-10 max-w-lg mt-auto mb-20 xl:mb-32">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-cyan-300 text-[10px] font-bold uppercase tracking-wider mb-6 backdrop-blur-sm">
                            <Sparkles size={12} />
                            <span>Sistem Informasi Terpadu</span>
                        </div>
                        <h1 className="text-4xl xl:text-5xl font-bold text-white leading-[1.15] mb-6 tracking-tight">
                            Manajemen Kerja <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-200">Lebih Efektif & Terukur.</span>
                        </h1>
                        <p className="text-lg xl:text-xl text-gov-100/80 font-light leading-relaxed mb-10">
                            Platform terpadu untuk monitoring, kolaborasi, dan pencapaian target kerja KemenPPPA Republik Indonesia.
                        </p>
                    </motion.div>

                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8"
                    >
                        <motion.div variants={itemVariants} className="flex items-center gap-4 text-gov-100 group">
                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0 shadow-inner group-hover:bg-white/10 group-hover:scale-105 transition-all duration-300 backdrop-blur-sm relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/0 via-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <ShieldCheck size={22} className="text-cyan-300 relative z-10" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">Aman & Terpusat</h4>
                                <p className="text-xs text-gov-300/80">Keamanan data terjamin</p>
                            </div>
                        </motion.div>

                        <div className="hidden sm:block w-px h-10 bg-white/10"></div>

                        <motion.div variants={itemVariants} className="flex items-center gap-4 text-gov-100 group">
                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0 shadow-inner group-hover:bg-white/10 group-hover:scale-105 transition-all duration-300 backdrop-blur-sm relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/0 via-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <Activity size={22} className="text-blue-300 relative z-10" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">Monitoring Real-time</h4>
                                <p className="text-xs text-gov-300/80">Pantau progres kinerja</p>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>

                {/* Floating Mockup Cards (Decorative) */}
                <div className="absolute top-[10%] xl:top-[5%] right-[0%] xl:right-[5%] z-0 hidden lg:flex flex-col gap-8 pointer-events-none opacity-80 xl:opacity-100 w-full max-w-[500px] h-[700px] perspective-1000 transform scale-[0.8] xl:scale-[0.9] origin-right">

                    {/* Card 1: Agenda Kegiatan (Meetings) */}
                    <motion.div
                        initial={{ opacity: 0, x: -50, y: 20 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                        className="absolute top-0 left-[-10%]"
                    >
                        <motion.div
                            animate={{ y: [0, -12, 0] }}
                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                            className="bg-white/10 backdrop-blur-xl border border-white/20 p-5 rounded-3xl w-72 shadow-2xl rotate-[-4deg] transform-gpu transition-transform duration-500"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
                                    <Calendar size={20} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-white text-sm font-bold">Rapat Koordinasi</p>
                                    <p className="text-gov-300 text-[10px] mt-0.5 flex items-center gap-1"><Clock size={10} /> 09:00 - 11:00 WIB</p>
                                </div>
                            </div>
                            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                <p className="text-white/80 text-xs line-clamp-2">Pembahasan evaluasi kinerja triwulan I dan persiapan rakor nasional.</p>
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                                <div className="flex -space-x-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-600 border-2 border-slate-800"></div>
                                    <div className="w-6 h-6 rounded-full bg-slate-500 border-2 border-slate-800"></div>
                                    <div className="w-6 h-6 rounded-full bg-slate-400 border-2 border-slate-800 flex items-center justify-center text-[8px] font-bold text-white">+5</div>
                                </div>
                                <span className="px-2 py-1 rounded-md bg-orange-500/20 text-orange-300 text-[9px] font-bold uppercase tracking-wider">Online</span>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Card 2: Disposisi Masuk (Inbox/Delegation) */}
                    <motion.div
                        initial={{ opacity: 0, x: 50, y: 30 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        transition={{ duration: 1, delay: 0.7, ease: "easeOut" }}
                        className="absolute top-[15%] right-[-10%]"
                    >
                        <motion.div
                            animate={{ y: [0, 10, 0] }}
                            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                            className="bg-white/10 backdrop-blur-xl border border-white/20 p-5 rounded-3xl w-80 shadow-2xl rotate-[3deg]"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                                        <Inbox size={20} />
                                    </div>
                                    <div>
                                        <p className="text-white text-sm font-bold">Disposisi Masuk</p>
                                        <p className="text-gov-300 text-[10px] mt-0.5">Dari: Pimpinan</p>
                                    </div>
                                </div>
                                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
                            </div>
                            <div className="space-y-2">
                                <div className="h-2 w-full bg-white/10 rounded-full"></div>
                                <div className="h-2 w-4/5 bg-white/10 rounded-full"></div>
                                <div className="h-2 w-2/3 bg-white/10 rounded-full"></div>
                            </div>
                            <div className="mt-4 flex justify-end">
                                <span className="px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-[10px] font-bold shadow-lg shadow-indigo-500/30">Tindak Lanjut</span>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Card 3: Task Progress (Main Center) */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1, delay: 0.9, ease: "easeOut" }}
                        className="absolute top-[35%] left-[5%]"
                    >
                        <motion.div
                            animate={{ y: [0, -8, 0] }}
                            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                            className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-3xl w-[22rem] z-20 shadow-[-10px_20px_30px_rgba(0,0,0,0.2)] rotate-[-1deg]"
                        >
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                                        <CheckSquare size={24} />
                                    </div>
                                    <div>
                                        <p className="text-white text-base font-bold">Progress Target</p>
                                        <p className="text-gov-300 text-xs mt-0.5">Tugas Prioritas Tinggi</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-white font-bold text-2xl">24</span>
                                    <span className="text-gov-400 text-sm font-normal">/30</span>
                                </div>
                            </div>

                            <div className="w-full bg-white/10 rounded-full h-2 mb-3 overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: '80%' }}
                                    transition={{ duration: 2, delay: 1.5, ease: 'easeOut' }}
                                    className="bg-gradient-to-r from-blue-400 to-cyan-400 h-full rounded-full"
                                ></motion.div>
                            </div>

                            <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
                                <div className="flex -space-x-3">
                                    <div className="w-8 h-8 rounded-full bg-gov-600 border-2 border-gov-800 flex items-center justify-center text-[10px] text-white font-bold">AI</div>
                                    <div className="w-8 h-8 rounded-full bg-cyan-600 border-2 border-gov-800 flex items-center justify-center text-[10px] text-white font-bold">BP</div>
                                    <div className="w-8 h-8 rounded-full bg-indigo-600 border-2 border-gov-800 flex items-center justify-center text-[10px] text-white font-bold">CJ</div>
                                </div>
                                <p className="text-cyan-300 text-xs font-bold bg-cyan-500/10 px-3 py-1 rounded-full">80% Selesai</p>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Card 4: Dokumen & Laporan (Files) */}
                    <motion.div
                        initial={{ opacity: 0, x: -40, y: 30 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        transition={{ duration: 1, delay: 1.1, ease: "easeOut" }}
                        className="absolute bottom-[20%] left-[-15%]"
                    >
                        <motion.div
                            animate={{ y: [0, 12, 0] }}
                            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
                            className="bg-white/10 backdrop-blur-xl border border-white/20 p-5 rounded-3xl w-64 shadow-2xl rotate-[2deg]"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <p className="text-white text-sm font-bold leading-tight">Laporan Keuangan</p>
                                    <p className="text-gov-300 text-[10px] mt-0.5">PDF • 2.4 MB</p>
                                </div>
                            </div>
                            <div className="bg-white/5 rounded-xl h-12 border border-white/10 flex items-center justify-center gap-2 text-white/40">
                                <FileText size={24} />
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Card 5: Kinerja / Performance (Stats) */}
                    <motion.div
                        initial={{ opacity: 0, x: 40, y: 40 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        transition={{ duration: 1, delay: 1.3, ease: "easeOut" }}
                        className="absolute bottom-[10%] right-[0%]"
                    >
                        <motion.div
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                            className="bg-white/10 backdrop-blur-xl border border-white/20 p-5 rounded-3xl w-60 shadow-2xl rotate-[-3deg]"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                    <TrendingUp size={20} />
                                </div>
                                <div>
                                    <p className="text-white text-sm font-bold leading-tight">Grafik Kinerja</p>
                                    <p className="text-gov-300 text-[10px] mt-0.5">Bulan Ini</p>
                                </div>
                            </div>
                            <div className="flex items-end gap-2 h-16 mt-2 border-b border-white/10 pb-1">
                                <motion.div initial={{ height: '30%' }} animate={{ height: '50%' }} transition={{ duration: 1, delay: 2 }} className="w-1/4 bg-white/20 rounded-t-md"></motion.div>
                                <motion.div initial={{ height: '50%' }} animate={{ height: '70%' }} transition={{ duration: 1, delay: 2.1 }} className="w-1/4 bg-white/20 rounded-t-md"></motion.div>
                                <motion.div initial={{ height: '70%' }} animate={{ height: '90%' }} transition={{ duration: 1, delay: 2.2 }} className="w-1/4 bg-white/30 rounded-t-md"></motion.div>
                                <motion.div initial={{ height: '20%' }} animate={{ height: '100%' }} transition={{ duration: 1, delay: 2.3 }} className="w-1/4 bg-gradient-to-t from-emerald-500 to-emerald-300 rounded-t-md shadow-[0_0_15px_rgba(52,211,153,0.4)]"></motion.div>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>

                {/* Footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 1 }}
                    className="relative z-10 text-gov-400 font-medium text-xs xl:text-sm flex items-center justify-between mt-auto"
                >
                    <p>&copy; {new Date().getFullYear()} Biro Data & Informasi KemenPPPA</p>
                    <p className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] tracking-wider uppercase text-gov-300 hover:bg-white/10 transition-colors cursor-default">v{APP_VERSION}</p>
                </motion.div>
            </div>

            {/* Right Pane - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-24 relative bg-white lg:bg-transparent min-h-screen">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="w-full max-w-[420px]"
                >
                    {/* Mobile Header (Shows only on mobile) */}
                    <motion.div variants={itemVariants} className="lg:hidden text-center mb-10 mt-10">
                        <div className="w-16 h-16 bg-gradient-to-br from-gov-600 to-gov-800 rounded-2xl mx-auto flex items-center justify-center mb-5 shadow-xl shadow-gov-200/50 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <span className="text-white font-bold text-3xl relative z-10">P</span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Pulse PPA</h2>
                        <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-widest flex items-center justify-center gap-1.5">
                            KemenPPPA RI
                            <span className="w-1.5 h-1.5 rounded-full bg-gov-500 animate-pulse"></span>
                        </p>
                    </motion.div>

                    {/* Greeting */}
                    <motion.div variants={itemVariants} className="mb-10 text-center lg:text-left">
                        <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-2">Selamat Datang 👋</h3>
                        <p className="text-sm sm:text-base text-slate-500 font-medium">Silakan masuk ke akun Anda untuk melanjutkan.</p>
                    </motion.div>

                    {/* Error Message */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 flex items-start gap-3 shadow-sm"
                        >
                            <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                            <p className="leading-relaxed font-medium">{error}</p>
                        </motion.div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                        <motion.div variants={itemVariants} className="space-y-2">
                            <label className="block text-sm font-bold text-slate-700">Email Pegawai</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-gov-600 transition-colors">
                                    <Mail size={18} strokeWidth={2.5} />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm sm:text-base font-medium placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-4 focus:ring-gov-500/10 focus:border-gov-500 focus:bg-white hover:border-slate-300 transition-all shadow-sm"
                                    placeholder="nama@kemenpppa.go.id"
                                />
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="block text-sm font-bold text-slate-700">Password</label>
                                <a href="#" className="hidden text-xs font-bold text-gov-600 hover:text-gov-800 transition-colors">Lupa Password?</a>
                            </div>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-gov-600 transition-colors">
                                    <Lock size={18} strokeWidth={2.5} />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm sm:text-base font-medium placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-4 focus:ring-gov-500/10 focus:border-gov-500 focus:bg-white hover:border-slate-300 transition-all shadow-sm"
                                    placeholder="••••••••"
                                />
                            </div>
                        </motion.div>

                        <motion.button
                            variants={itemVariants as any}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            className="w-full bg-gradient-to-r from-gov-600 to-gov-700 hover:from-gov-700 hover:to-gov-800 text-white font-bold py-3.5 sm:py-4 mt-2 rounded-xl shadow-lg shadow-gov-600/25 hover:shadow-xl hover:shadow-gov-600/40 transition-all flex items-center justify-center gap-2 group text-sm sm:text-base relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                            <span className="relative z-10 flex items-center gap-2">
                                Masuk ke Dashboard
                                <ArrowRight size={18} strokeWidth={2.5} className="group-hover:translate-x-1.5 transition-transform" />
                            </span>
                        </motion.button>
                    </form>

                    {/* Mobile Footer */}
                    <motion.div variants={itemVariants} className="mt-12 mb-6 text-center lg:hidden">
                        <p className="text-xs text-slate-400 font-semibold mb-3">
                            &copy; {new Date().getFullYear()} Biro Data & Informasi KemenPPPA
                        </p>
                        <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-[10px] font-bold tracking-wider uppercase hover:bg-slate-200 transition-colors">v{APP_VERSION}</span>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
};

export default LoginPage;
