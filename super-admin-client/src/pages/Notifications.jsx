import React from 'react'
import Sidebar from '../components/Sidebar'
import { motion } from 'framer-motion'
import { Bell, Activity, Info } from 'lucide-react'

const Notifications = () => {
  return (
    <div className="flex bg-[#f8fafc] text-slate-900 min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 lg:p-12 overflow-y-auto max-h-screen custom-scrollbar">
        <div className="mb-12">
            <h1 className="text-3xl font-bold tracking-tight mb-1 text-slate-900">System <span className="text-indigo-600">Notifications</span></h1>
            <p className="text-slate-500 font-medium text-xs tracking-wide uppercase">Real-time platform activity & logs</p>
        </div>

        <div className="flex flex-col items-center justify-center p-20 py-32 bg-white border border-slate-200 rounded-3xl shadow-sm">
           <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-8 border border-indigo-100">
              <Bell size={32} className="text-indigo-400 opacity-60" />
           </div>
           <h3 className="text-xl font-bold text-slate-900 mb-2">No Active Alerts</h3>
           <p className="text-slate-500 font-medium text-sm text-center max-w-sm">Every system node is operating within optimal parameters. No incidents or pending actions found.</p>
           
           <div className="mt-12 flex gap-4">
              <div className="px-5 py-2 bg-slate-50 rounded-xl border border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <Activity size={14} className="text-emerald-500" />
                 API Status: Active
              </div>
              <div className="px-5 py-2 bg-slate-50 rounded-xl border border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <Info size={14} className="text-indigo-500" />
                 Sync Status: Healthy
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}

export default Notifications
