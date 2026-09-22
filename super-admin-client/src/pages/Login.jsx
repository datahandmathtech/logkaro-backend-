import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { motion } from 'framer-motion'
import { ShieldCheck, Lock, Mail, ArrowRight, ShieldAlert } from 'lucide-react'

const Login = () => {
  const [email, setEmail] = useState('admin@texi.com')
  const [password, setPassword] = useState('@2526Bigday')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await axios.post('/api/auth/login', { email, password })
      localStorage.setItem('sa_token', data.token)
      localStorage.setItem('sa_user', JSON.stringify(data))
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed. Please check credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 font-['Inter'] relative overflow-hidden">
      
      {/* Intense Background Decor */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-900/20 rounded-full blur-[140px] animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-900/10 rounded-full blur-[140px]" />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[480px] bg-slate-900/40 p-12 md:p-16 rounded-[40px] relative z-10 border border-white/5 backdrop-blur-3xl shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] flex flex-col"
      >
        <div className="flex flex-col items-center mb-12">
           <div className="w-20 h-20 bg-indigo-600 rounded-[28px] flex items-center justify-center shadow-2xl shadow-indigo-600/40 mb-8 transform rotate-3 hover:rotate-0 transition-transform duration-500">
              <ShieldCheck size={40} className="text-white" />
           </div>
           <h1 className="text-4xl font-black text-white tracking-tighter mb-2 uppercase">ROOT<span className="text-indigo-500">CONTROL</span></h1>
           <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
              <p className="text-slate-500 font-black text-[10px] tracking-[4px] uppercase">Infrastructure Access</p>
           </div>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-black p-5 rounded-2xl mb-8 flex items-center gap-4 uppercase tracking-widest"
          >
            <ShieldAlert size={20} /> {error}
          </motion.div>
        )}

        <form onSubmit={handleLogin} className="w-full space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[2px] ml-1">Identity Token</label>
            <div className="relative group">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
              <input 
                type="email" 
                placeholder="root@mainframe.sys" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-2xl p-5 pl-14 text-white text-sm font-bold outline-none focus:border-indigo-600 focus:bg-white/[0.08] transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[2px] ml-1">Bitmask Key</label>
            <div className="relative group">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-2xl p-5 pl-14 text-white text-sm font-bold outline-none focus:border-indigo-600 focus:bg-white/[0.08] transition-all"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-8 bg-indigo-600 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-4 hover:bg-indigo-500 hover:shadow-2xl hover:shadow-indigo-600/30 transition-all active:scale-[0.98] uppercase tracking-[3px] text-[13px]"
          >
            <span>{loading ? 'AUTHENTICATING...' : 'INITIATE SESSION'}</span>
            {!loading && <ArrowRight size={20} />}
          </button>
        </form>

        <div className="mt-12 pt-8 border-t border-white/5 text-center">
           <p className="text-[9px] font-black text-slate-600 uppercase tracking-[2px] leading-none">Security Level: Global Encryption Tier 1</p>
        </div>
      </motion.div>
      
      {/* Footer System Info */}
      <div className="absolute bottom-10 left-10 hidden lg:block">
         <div className="flex items-center gap-3 opacity-30">
            <div className="p-2 bg-white/5 rounded-lg border border-white/10">
               <ShieldCheck size={16} className="text-white" />
            </div>
            <span className="text-[10px] font-black text-white uppercase tracking-widest">Quantum Secured Access</span>
         </div>
      </div>
    </div>
  )
}

export default Login
