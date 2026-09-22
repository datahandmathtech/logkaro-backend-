import React from 'react'
import Sidebar from '../components/Sidebar'
import { motion } from 'framer-motion'
import { CreditCard, Check, ArrowRight, ShieldCheck, Zap, Star } from 'lucide-react'

const PlanCard = ({ name, price, features, delay, color, icon: Icon }) => (
  <motion.div 
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-white p-10 rounded-3xl border border-slate-200 relative group transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
  >
    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 border border-slate-100 shadow-sm" style={{ backgroundColor: `${color}10` }}>
       <Icon size={22} style={{ color }} />
    </div>
    <h3 className="text-xl font-bold mb-1 text-slate-900">{name}</h3>
    <p className="text-3xl font-bold mb-8 text-slate-900">₹{price}<span className="text-xs text-slate-400 font-medium pl-2 tracking-normal uppercase">/ Month</span></p>
    
    <div className="space-y-4 mb-10">
      {features.map((f, i) => (
        <div key={i} className="flex items-center gap-3 text-[13px] font-medium text-slate-500">
           <div className="w-5 h-5 rounded-full bg-slate-50 flex items-center justify-center">
              <Check size={12} style={{ color }} strokeWidth={3} />
           </div>
           {f}
        </div>
      ))}
    </div>

    <button className="w-full py-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold text-[12px] uppercase tracking-wider hover:bg-indigo-600 hover:border-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2 group shadow-sm">
       Customize Plan <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
    </button>
  </motion.div>
)

const Plans = () => {
  return (
    <div className="flex bg-[#f8fafc] text-slate-900 min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 lg:p-12 overflow-y-auto max-h-screen custom-scrollbar">
        <div className="mb-12">
            <h1 className="text-3xl font-bold tracking-tight mb-1 text-slate-900">Service <span className="text-indigo-600">Plans</span></h1>
            <p className="text-slate-500 font-medium text-xs tracking-wide uppercase">Billing presets & platform commerce</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           <PlanCard 
              name="Starter Core" 
              price="2,999" 
              color="#4f46e5"
              delay={0.1}
              icon={ShieldCheck}
              features={['Up to 10 Vehicles', 'Basic Fleet Hub', 'Standard Alerts', 'Single User Access']} 
           />
           <PlanCard 
              name="Business Pro" 
              price="5,999" 
              color="#10b981"
              delay={0.2}
              icon={Zap}
              features={['Unlimited Assets', 'Advanced Logistics', 'Custom API Access', 'Priority Support']} 
           />
           <PlanCard 
              name="Enterprise Hub" 
              price="9,999" 
              color="#f59e0b"
              delay={0.3}
              icon={Star}
              features={['White-label Branding', 'Global Fleet Hardware', 'Advanced Security', 'Dedicated Manager']} 
           />
        </div>
        
        <div className="mt-12 bg-white p-8 rounded-3xl border border-slate-200 flex items-center justify-between shadow-sm">
           <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Custom Deployment?</h3>
              <p className="text-sm text-slate-500 font-medium">Contact technical desk for enterprise custom build configurations.</p>
           </div>
           <button className="px-8 py-3 bg-white border border-slate-200 hover:border-indigo-600 hover:text-indigo-600 text-slate-700 font-bold rounded-xl transition-all shadow-sm">Support Desk</button>
        </div>
      </div>
    </div>
  )
}

export default Plans
