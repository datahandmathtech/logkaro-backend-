import React from 'react'
import Sidebar from '../components/Sidebar'
import { motion } from 'framer-motion'
import { Settings as SettingsIcon, Save, Zap, Shield, Key, Bell, Globe, Mail } from 'lucide-react'

const ConfigGroup = ({ title, desc, children }) => (
  <div className="bg-white p-8 rounded-3xl border border-slate-200 relative overflow-hidden mb-8 shadow-sm">
    <div className="mb-8 flex justify-between items-start">
       <div>
         <h3 className="text-xl font-bold text-slate-900 mb-1 uppercase tracking-tight">{title}</h3>
         <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{desc}</p>
       </div>
       <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
         <SettingsIcon size={18} />
       </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {children}
    </div>
  </div>
)

const InputField = ({ label, icon: Icon, defaultValue, type = "text" }) => (
  <div className="space-y-3">
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <div className="relative group">
       <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors">
          <Icon size={16} />
       </div>
       <input 
          type={type} 
          defaultValue={defaultValue}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 pl-12 text-sm font-medium text-slate-800 focus:border-indigo-600/30 transition-all outline-none shadow-sm"
       />
    </div>
  </div>
)

const Settings = () => {
  return (
    <div className="flex bg-[#f8fafc] text-slate-900 min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 lg:p-12 overflow-y-auto max-h-screen custom-scrollbar">
        <div className="flex justify-between items-center mb-12">
           <div>
              <h1 className="text-3xl font-bold tracking-tight mb-1 text-slate-900">System <span className="text-indigo-600">Settings</span></h1>
              <p className="text-slate-500 font-medium text-xs tracking-wide uppercase">Global Configuration & Infrastructure</p>
           </div>
           <button className="flex items-center gap-3 px-8 bg-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-500/10 hover:bg-indigo-700 transition-all uppercase tracking-wider text-xs active:scale-[0.98]">
              <Save size={18} /> Save Settings
           </button>
        </div>

        <ConfigGroup title="General Platform" desc="Identity, communication & region control">
           <InputField label="Admin Interface Name" icon={Globe} defaultValue="Super Control Console" />
           <InputField label="Recovery Email" icon={Mail} defaultValue="ops@master-fleet.app" />
        </ConfigGroup>

        <ConfigGroup title="Security Framework" desc="Keys, generation & hardware encryption protocol">
           <InputField label="Master Access Key" icon={Key} defaultValue="********" type="password" />
           <InputField label="Infrastructure Lock" icon={Shield} defaultValue="Industrial AES-256-GCM" />
        </ConfigGroup>
      </div>
    </div>
  )
}

export default Settings
