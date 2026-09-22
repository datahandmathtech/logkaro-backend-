import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Settings,
  LogOut,
  ShieldCheck,
  Zap,
  Globe,
  Bell
} from 'lucide-react'
import { motion } from 'framer-motion'

const SidebarItem = ({ to, icon: Icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) => `
      flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group relative mb-1
      ${isActive
        ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/40'
        : 'text-slate-200/60 hover:text-white hover:bg-white/10'}
    `}
  >
    <Icon size={20} className="transition-transform group-hover:scale-110" />
    <span className="text-[12px] font-black uppercase tracking-[2px]">{label}</span>
  </NavLink>
)

const Sidebar = () => {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('sa_user') || '{}')

  const handleLogout = () => {
    localStorage.removeItem('sa_token')
    localStorage.removeItem('sa_user')
    navigate('/login')
  }

  return (
    <div className="w-[300px] h-screen p-6 sticky top-0 flex flex-col bg-[#050b1a] border-r border-white/10 shadow-[20px_0_60px_-15px_rgba(0,0,0,0.5)] z-40 overflow-y-auto custom-scrollbar">
      {/* Brand Header */}
      <div className="flex items-center gap-4 mb-12 px-2">
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/40 transform -rotate-6">
          <ShieldCheck size={28} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tighter text-white leading-none">Main<span className="text-indigo-500 block text-[9px] tracking-[4px] mt-1 font-black">AUTHORITY</span></h1>
        </div>
      </div>

      {/* Main Nav */}
      <div className="flex-1 space-y-2">
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[3px] mb-6 px-2 opacity-40">Mainframe Core</p>
        <SidebarItem to="/" icon={LayoutDashboard} label="Overview" />
        <SidebarItem to="/tenants" icon={Users} label="Client Registry" />
        <SidebarItem to="/plans" icon={CreditCard} label="Billing Matrix" />

        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[3px] my-10 px-2 opacity-40">Global Protocol</p>
        <SidebarItem to="/settings" icon={Settings} label="Settings" />
        <SidebarItem to="/notifications" icon={Bell} label="Broadcasts" />
      </div>

      {/* Profile & Footer */}
      <div className="mt-auto pt-6 border-t border-white/5">
        <div className="p-5 bg-white/5 rounded-[25px] mb-6 border border-white/5 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-lg">
              {user.name?.charAt(0) || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-[14px] truncate text-white uppercase tracking-tight">{user.name || 'System Root'}</h3>
              <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Level 1 Admin</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full p-5 rounded-2xl bg-red-500/10 text-red-500 font-black text-[10px] uppercase tracking-[3px] transition-all hover:bg-red-500 hover:text-white flex items-center justify-center gap-3 border border-red-500/10 shadow-lg shadow-red-500/5"
        >
          <LogOut size={16} strokeWidth={3} /> Decouple
        </button>
      </div>
    </div>
  )
}

export default Sidebar
