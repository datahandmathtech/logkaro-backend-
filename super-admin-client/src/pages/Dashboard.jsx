import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { motion } from 'framer-motion'
import {
   Users,
   CreditCard,
   Zap,
   Activity,
   TrendingUp,
   History,
   ArrowUpRight,
   Globe,
   Settings,
   Plus,
   ShieldCheck,
   AlertCircle,
   Clock
} from 'lucide-react'

const StatCard = ({ icon: Icon, label, value, color, trend }) => (
   <div className="bg-white p-6 rounded-2xl border border-slate-200 relative group transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      <div className="flex items-center justify-between mb-4">
         <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-slate-100 shadow-sm" style={{ backgroundColor: `${color}10` }}>
            <Icon size={22} style={{ color }} />
         </div>
         {trend && (
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">+{trend}%</span>
         )}
      </div>
      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">{label}</p>
      <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{value}</h3>
   </div>
)

const Dashboard = () => {
   const navigate = useNavigate()
   const [tenants, setTenants] = useState([])
   const [stats, setStats] = useState({
      totalTenants: 0,
      activeTenants: 0,
      trialTenants: 0,
      monthlyRevenue: 0
   })
   const [loading, setLoading] = useState(true)

   useEffect(() => {
      const fetchData = async () => {
         try {
            const token = localStorage.getItem('sa_token')
            const headers = { Authorization: `Bearer ${token}` }

            const [tenantsRes, statsRes] = await Promise.all([
               axios.get('/api/tenants', { headers }),
               axios.get('/api/dashboard/stats', { headers })
            ])

            // Defensive check for data structure
            const tenantsData = Array.isArray(tenantsRes.data) ? tenantsRes.data : [];
            setTenants(tenantsData)
            setStats(statsRes.data || { totalTenants: 0, activeTenants: 0, trialTenants: 0, monthlyRevenue: 0 })
         } catch (err) {
            console.error('Fetch error:', err)
            setTenants([]) // Safe fallback
         } finally {
            setLoading(false)
         }
      }
      fetchData()
   }, [])

   // Calculate expiring soon (within 7 days)
   const expiringSoon = Array.isArray(tenants) ? tenants.filter(t => {
      const expiry = t.trialEndsAt || t.expiresAt
      if (!expiry) return false
      const daysLeft = Math.ceil((new Date(expiry) - new Date()) / (1000 * 60 * 60 * 24))
      return daysLeft > 0 && daysLeft <= 7
   }) : []

   return (
      <div className="flex bg-[#f8fafc] text-slate-900 min-h-screen">
         <Sidebar />
         <div className="flex-1 p-8 lg:p-12 overflow-y-auto max-h-screen custom-scrollbar">

            {/* Header */}
            <div className="flex justify-between items-center mb-10">
               <div>
                  <h1 className="text-3xl font-bold tracking-tight mb-1 text-slate-900">Control <span className="text-indigo-600">Center</span></h1>
                  <p className="text-slate-500 font-medium text-xs tracking-wide uppercase">Infrastructure Dashboard & Global Metrics</p>
               </div>
               <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                  <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-emerald-100 flex items-center gap-2">
                     <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                     Auth: Root Verified
                  </div>
                  <div className="text-[11px] font-bold text-slate-400 px-2">{new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</div>
               </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
               <StatCard icon={Users} label="Total Deployments" value={loading ? '...' : stats.totalTenants} color="#6366f1" trend="12" />
               <StatCard icon={Activity} label="Active Instances" value={loading ? '...' : stats.activeTenants} color="#10b981" />
               <StatCard icon={ShieldCheck} label="Trial Sandbox" value={loading ? '...' : stats.trialTenants} color="#0ea5e9" />
               <StatCard icon={TrendingUp} label="Platform ARR" value={loading ? '...' : `₹${(stats.monthlyRevenue * 12).toLocaleString()}`} color="#f59e0b" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               {/* Recent Deployments */}
               <div className="lg:col-span-2 space-y-8">
                  <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                     <div className="flex justify-between items-center mb-8">
                        <h2 className="text-xl font-bold flex items-center gap-3 text-slate-900">
                           <History className="text-indigo-600" size={20} />
                           Regional Expansions
                        </h2>
                        <button onClick={() => navigate('/tenants')} className="text-[11px] font-bold text-indigo-600 hover:text-indigo-500 uppercase tracking-widest transition-all">Registry</button>
                     </div>
                     <div className="space-y-4">
                        {loading ? (
                           <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-[11px]">Syncing with Mainframe...</div>
                        ) : tenants.length > 0 ? (
                           tenants.slice(0, 4).map(tenant => (
                              <div key={tenant._id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all group">
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white rounded-lg border border-slate-100 flex items-center justify-center font-bold text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                                       {tenant.companyName?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                       <h4 className="font-bold text-[14px] leading-tight text-slate-900">{tenant.companyName}</h4>
                                       <p className="text-[10px] text-slate-500 font-medium">{tenant.ownerName} • {new Date(tenant.createdAt).toLocaleDateString()}</p>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-6">
                                    <div className="text-right">
                                       <p className="font-bold text-[13px] leading-tight text-slate-700">{tenant.vehicleCount || 0} Assets</p>
                                       <p className={`text-[10px] font-bold uppercase tracking-tighter ${tenant.status === 'trial' ? 'text-blue-500' : 'text-emerald-500'}`}>{tenant.status || 'Active'}</p>
                                    </div>
                                    <button onClick={() => navigate('/tenants')} className="p-2 text-slate-300 hover:text-indigo-600 transition-all"><ArrowUpRight size={18} /></button>
                                 </div>
                              </div>
                           ))
                        ) : (
                           <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-[11px]">No active deployments found.</div>
                        )}
                     </div>
                  </div>

                  {/* Expiring Alerts */}
                  {expiringSoon.length > 0 && (
                     <div className="bg-amber-50 rounded-3xl p-8 border border-amber-200 shadow-sm">
                        <h2 className="text-lg font-bold flex items-center gap-3 text-amber-900 mb-6 uppercase tracking-tight">
                           <Clock className="text-amber-600" size={20} />
                           Critical Subscription Alerts
                        </h2>
                        <div className="space-y-3">
                           {expiringSoon.map(t => (
                              <div key={t._id} className="flex items-center justify-between p-4 bg-white/60 rounded-xl border border-amber-100">
                                 <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                                    <span className="font-bold text-sm text-amber-900">{t.companyName}</span>
                                 </div>
                                 <span className="text-[10px] font-bold text-amber-600 uppercase">Expires in {Math.ceil((new Date(t.trialEndsAt || t.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))} Days</span>
                              </div>
                           ))}
                        </div>
                     </div>
                  )}
               </div>

               {/* Quick Actions */}
               <div className="space-y-6">
                  <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 blur-[60px] rounded-full pointer-events-none" />
                     <h2 className="text-lg font-bold mb-6 flex items-center gap-3 text-slate-900">
                        <Zap className="text-indigo-600" size={18} />
                        Quick Commands
                     </h2>
                     <div className="grid grid-cols-1 gap-3 relative z-10">
                        <button onClick={() => navigate('/tenants')} className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-indigo-600 hover:text-white transition-all group font-bold text-[13px] text-slate-700">
                           Provision New Client
                           <Plus size={16} />
                        </button>
                        <button onClick={() => navigate('/plans')} className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-200 transition-all group font-bold text-[13px] text-slate-700">
                           Manage Billing Engine
                           <CreditCard size={16} />
                        </button>
                        <button onClick={() => navigate('/settings')} className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-200 transition-all group font-bold text-[13px] text-slate-700">
                           System Encryption
                           <Settings size={16} />
                        </button>
                     </div>
                  </div>

                  <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                     <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Service Integrity</h2>
                     <div className="space-y-6">
                        <div>
                           <div className="flex justify-between items-center mb-2">
                              <span className="text-xs font-bold text-slate-500">Node Availability</span>
                              <span className="text-xs font-bold text-emerald-600">99.9%</span>
                           </div>
                           <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 w-[99%]" />
                           </div>
                        </div>
                        <div>
                           <div className="flex justify-between items-center mb-2">
                              <span className="text-xs font-bold text-slate-500">API Response</span>
                              <span className="text-xs font-bold text-indigo-600">22ms</span>
                           </div>
                           <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500 w-[12%]" />
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="p-6 bg-slate-900 rounded-3xl shadow-xl relative overflow-hidden group">
                     <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-transparent opacity-50" />
                     <div className="relative z-10">
                        <h4 className="text-white font-bold text-sm mb-1">Global Database Backup</h4>
                        <p className="text-[10px] text-slate-400 mb-4">Last successful backup: 2h ago</p>
                        <button className="text-[10px] text-white font-black uppercase tracking-widest bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20 transition-all border border-white/10">Manual Trigger</button>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
   )
}

export default Dashboard
