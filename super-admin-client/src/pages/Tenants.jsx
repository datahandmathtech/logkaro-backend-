import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Sidebar from '../components/Sidebar'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Search,
  Plus,
  ExternalLink,
  X,
  Edit2,
  Trash2,
  CheckCircle2,
  ShieldAlert,
  Building,
  Mail,
  Phone,
  Layout,
  Globe,
  Settings
} from 'lucide-react'

const Tenants = () => {
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTenant, setEditingTenant] = useState(null)
  const [formData, setFormData] = useState({
    crmType: 'LogKaro Fleet',
      crmType: 'LogKaro Fleet',
          companyName: '',
          ownerName: '',
    email: '',
    phone: '',
    whatsappNumber: '',
    adminEmail: '',
    adminPassword: 'password123',
    website: '',
    logo: '',
    signature: '',
    logoFile: null,
    signatureFile: null,
    plan: 'trial',
    monthlyFee: 5000,
    trialDays: 14,
    vehicleLimit: 10,
    status: 'active',
    permissions: {
      dashboard: true,
      liveFeed: true,
      logBook: true,
      driversService: true,
      fleetOperations: true,
      buySell: true,
      vehiclesManagement: true,
      staffManagement: true,
      manageAdmins: true,
      reports: true
    }
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const fetchTenants = async () => {
    try {
      const token = localStorage.getItem('sa_token')
      const { data } = await axios.get('/api/tenants', {
        headers: { Authorization: `Bearer ${token}` }
      })
      // Defensive check for array
      setTenants(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      setTenants([]) // Safe fallback
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTenants()
  }, [])

  const handleOpenModal = (tenant = null) => {
    if (tenant) {
      setEditingTenant(tenant)
      setFormData({
        crmType: tenant.crmType || 'LogKaro Fleet',
        companyName: tenant.companyName || '',
        ownerName: tenant.ownerName || '',
        email: tenant.email || '',
        phone: tenant.phone || '',
        whatsappNumber: tenant.whatsappNumber || '',
        adminEmail: tenant.adminEmail || '',
        adminPassword: '',
        website: tenant.website || '',
        logo: tenant.logo || '',
        signature: tenant.signature || '',
        plan: tenant.plan || 'trial',
        monthlyFee: tenant.monthlyFee || 5000,
        trialDays: tenant.trialDays || 14,
        vehicleLimit: tenant.vehicleLimit || 10,
        status: tenant.status || 'active',
        permissions: tenant.permissions || {
          dashboard: true,
          liveFeed: true,
          logBook: true,
          driversService: true,
          fleetOperations: true,
          buySell: true,
          vehiclesManagement: true,
          staffManagement: true,
          manageAdmins: true,
          reports: true
        }
      })
    } else {
      setEditingTenant(null)
      setFormData({
        crmType: 'LogKaro Fleet',
          companyName: '',
          ownerName: '',
        email: '',
        phone: '',
        whatsappNumber: '',
        adminEmail: '',
        adminPassword: 'password123',
        website: '',
        logo: '',
        signature: '',
        logoFile: null,
        signatureFile: null,
        plan: 'trial',
        monthlyFee: 5000,
        trialDays: 14,
        vehicleLimit: 10,
        status: 'active',
        permissions: {
          dashboard: true,
          liveFeed: true,
          logBook: true,
          driversService: true,
          fleetOperations: true,
          buySell: true,
          vehiclesManagement: true,
          staffManagement: true,
          manageAdmins: true,
          reports: true
        }
      })
    }
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const token = localStorage.getItem('sa_token')

      // Use FormData if files are present
      const submissionData = new FormData()
      Object.keys(formData).forEach(key => {
        if (key === 'permissions') {
          submissionData.append(key, JSON.stringify(formData[key]))
        } else if (key === 'logoFile') {
          if (formData.logoFile) submissionData.append('logo', formData.logoFile)
        } else if (key === 'signatureFile') {
          if (formData.signatureFile) submissionData.append('signature', formData.signatureFile)
        } else if (key !== 'logo' && key !== 'signature') {
          submissionData.append(key, formData[key])
        }
      })

      // If we're editing and NO NEW file was picked, we still need to send the old URL 
      // so the backend knows not to clear it.
      if (editingTenant) {
        if (!formData.logoFile && formData.logo) submissionData.append('logo', formData.logo)
        if (!formData.signatureFile && formData.signature) submissionData.append('signature', formData.signature)

        await axios.put(`/api/tenants/${editingTenant._id}`, submissionData, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
      } else {
        await axios.post('/api/tenants', submissionData, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
      }
      setShowModal(false)
      fetchTenants()
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    console.log('[PROTOCOL_TERMINATION_INITIATED]', id);
    if (window.confirm('CRITICAL: Are you sure you want to terminate this deployment? All associated data will be permanently purged.')) {
      try {
        const token = localStorage.getItem('sa_token')
        const { data } = await axios.delete(`/api/tenants/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        console.log('[PROTOCOL_TERMINATION_SUCCESSFUL]', data);
        fetchTenants()
      } catch (err) {
        console.error('[PROTOCOL_TERMINATION_FAILED]', err)
        alert(err.response?.data?.message || 'Protocol termination failed.')
      }
    }
  }

  const handleLoginAs = async (id) => {
    try {
      const token = localStorage.getItem('sa_token')
      const { data } = await axios.post(`/api/tenants/${id}/login-as`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (data.redirectUrl) {
        window.open(data.redirectUrl, '_blank')
      }
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || 'Failed to connect to tenant dashboard')
    }
  }

  return (
    <div className="flex bg-slate-50 text-slate-900 min-h-screen">
      <Sidebar />
      <div className="flex-1 p-10 lg:p-16 overflow-y-auto max-h-screen custom-scrollbar relative">

        {/* Elite Header */}
        <div className="flex justify-between items-end mb-12">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[3px]">Infrastructure Management</span>
            </div>
            <h1 className="text-5xl font-black tracking-tighter text-slate-900">Client <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400">Registry</span></h1>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-3 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl transition-all shadow-2xl shadow-indigo-500/30 uppercase text-[12px] tracking-widest"
          >
            <Plus size={20} strokeWidth={3} /> Provision Client
          </button>
        </div>

        {/* Intelligence Search */}
        <div className="bg-white p-2 rounded-[30px] border border-slate-100 shadow-xl shadow-slate-200/40 mb-12 flex items-center gap-2 group focus-within:border-indigo-600/20 transition-all">
          <div className="pl-6 flex items-center gap-4 text-slate-300 group-focus-within:text-indigo-600 transition-colors">
            <Search size={22} />
          </div>
          <input
            type="text"
            placeholder="Query deployments by identity, owner, or unique ID..."
            className="flex-1 bg-transparent border-none outline-none py-4 text-[15px] font-bold placeholder:text-slate-300 text-slate-600"
          />
        </div>

        {/* Global Registry Table */}
        <div className="bg-white rounded-[40px] overflow-hidden border border-slate-100 shadow-2xl shadow-slate-200/50">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 font-black uppercase tracking-[2px] text-[10px] border-b border-slate-50">
                <th className="p-8 pb-6 pl-10">Client Identity</th>
                <th className="p-8 pb-6">Operational Status</th>
                <th className="p-8 pb-6">Asset Capacity</th>
                <th className="p-8 pb-6">Termination Date</th>
                <th className="p-8 pb-6 pr-10 text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-32 text-center text-slate-400 font-black uppercase tracking-[3px]">
                    <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mx-auto mb-6" />
                    Infrastructure sync in progress...
                  </td>
                </tr>
              ) : Array.isArray(tenants) && tenants.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-32 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Globe className="text-slate-200" size={40} />
                    </div>
                    <p className="text-[12px] text-slate-300 font-black uppercase tracking-[4px]">No entities prioritized for retrieval</p>
                  </td>
                </tr>
              ) : (
                Array.isArray(tenants) && tenants.map(tenant => (
                  <tr key={tenant._id} className="hover:bg-slate-50/30 transition-all group">
                    <td className="p-8 pl-10">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center font-black text-xl text-slate-300 border border-slate-100 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all shadow-sm">
                          {tenant.companyName?.substring(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-lg leading-none text-slate-900 mb-2">{tenant.companyName}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{tenant.ownerName || 'Unknown Origin'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-8">
                      <span className={`px-4 py-1.5 font-black rounded-lg text-[9px] tracking-[2px] uppercase border ${tenant.status === 'Active' || tenant.status === 'active'
                          ? 'bg-emerald-100 text-emerald-600 border-emerald-200'
                          : 'bg-amber-100 text-amber-600 border-amber-200'
                        }`}>
                        {tenant.status || 'Active'}
                      </span>
                    </td>
                    <td className="p-8">
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-end">
                          <span className="font-black text-sm text-slate-700">{tenant.vehicleCount || 0} / {tenant.vehicleLimit || 10}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Load Factor</span>
                        </div>
                        <div className="w-32 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, ((tenant.vehicleCount || 0) / (tenant.vehicleLimit || 10)) * 100)}%` }}
                            className={`h-full transition-all ${((tenant.vehicleCount || 0) >= (tenant.vehicleLimit || 10)) ? 'bg-red-500' : 'bg-indigo-600'}`}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-8">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        <p className="text-sm font-bold text-slate-500">
                          {tenant.trialEndsAt ? new Date(tenant.trialEndsAt).toLocaleDateString() : (tenant.expiresAt ? new Date(tenant.expiresAt).toLocaleDateString() : 'INDETERMINATE')}
                        </p>
                      </div>
                    </td>
                    <td className="p-8 pr-10 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => handleOpenModal(tenant)} className="w-10 h-10 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-600 hover:shadow-lg transition-all flex items-center justify-center"> <Edit2 size={18} /> </button>
                        <button onClick={() => handleDelete(tenant._id)} className="w-10 h-10 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-red-600 hover:border-red-600 hover:shadow-lg transition-all flex items-center justify-center"> <Trash2 size={18} /> </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Protocol Modal */}
        <AnimatePresence>
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px]" onClick={() => setShowModal(false)} />
              <motion.div initial={{ scale: 0.9, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 40 }} className="relative w-full max-w-3xl bg-white rounded-[50px] p-12 shadow-2xl border border-white/20 max-h-[95vh] overflow-y-auto custom-scrollbar" >
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 blur-[100px] pointer-events-none" />

                <button onClick={() => setShowModal(false)} className="absolute top-8 right-8 w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all" > <X size={24} /> </button>

                <div className="mb-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-1.5 bg-indigo-600 rounded-full" />
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[4px]">Deployment Protocol</span>
                  </div>
                  <h2 className="text-4xl font-black tracking-tighter text-slate-900">
                    {editingTenant ? 'Modify' : 'Provision'} <span className="text-indigo-600">Entity</span>
                  </h2>
                </div>

                {error && <div className="p-5 bg-red-50 border border-red-100 text-red-600 text-[12px] font-black uppercase tracking-widest rounded-2xl mb-8 flex items-center gap-4"> <ShieldAlert size={20} /> {error} </div>}

                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">Identity Designation</label>
                      <input type="text" placeholder="e.g. Abhay SuperX" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold text-slate-900 outline-none focus:border-indigo-600/30 transition-all" required value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">Primary Controller</label>
                      <input type="text" placeholder="Full Legal Name" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold text-slate-900 outline-none focus:border-indigo-600/30 transition-all" value={formData.ownerName} onChange={e => setFormData({ ...formData, ownerName: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">Access Credential (Email/UID)</label>
                      <input type="text" placeholder="user@mainframe" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold text-slate-900 outline-none focus:border-indigo-600/30 transition-all" required value={formData.adminEmail} onChange={e => setFormData({ ...formData, adminEmail: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">{editingTenant ? 'Override Bitmask' : 'Security Key'}</label>
                      <input type="text" placeholder={editingTenant ? 'Enter to override' : '••••••••'} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold text-slate-900 outline-none focus:border-indigo-600/30 transition-all" required={!editingTenant} value={formData.adminPassword} onChange={e => setFormData({ ...formData, adminPassword: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">Contact Number</label>
                      <input type="text" placeholder="e.g. 919876543210" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold text-slate-900 outline-none focus:border-indigo-600/30 transition-all" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                    </div>

                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">CRM Product Type</label>
                      <select className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-black text-indigo-700 outline-none focus:border-indigo-600/30 transition-all appearance-none cursor-pointer mb-6" value={formData.crmType || 'LogKaro Fleet'} onChange={e => setFormData({ ...formData, crmType: e.target.value })}>
                        <option value="LogKaro Fleet">LogKaro Fleet CRM</option>
                        <option value="School Management">School Management CRM</option>
                        <option value="Modified Fleet">Modified Fleet CRM</option>
                      </select>
                      
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">Identity Website</label>
                      <input type="text" placeholder="www.client-origin.com" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold text-slate-900 outline-none focus:border-indigo-600/30 transition-all" value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">Service Tier</label>
                      <select className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-black text-slate-700 outline-none focus:border-indigo-600/30 transition-all appearance-none cursor-pointer" value={formData.plan} onChange={e => setFormData({ ...formData, plan: e.target.value })}>
                        <option value="trial">Standard Trial</option>
                        <option value="pro">Enterprise Pro</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">Brand Asset (Logo File)</label>
                      <div className="flex flex-col gap-2">
                        <input type="file" accept="image/*" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold text-slate-900 outline-none focus:border-indigo-600/30 transition-all" onChange={e => setFormData({ ...formData, logoFile: e.target.files[0] })} />
                        {formData.logo && !formData.logoFile && <p className="text-[10px] text-indigo-600 font-bold ml-2">Current: {formData.logo.split('/').pop()}</p>}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">Official Signature (File)</label>
                      <div className="flex flex-col gap-2">
                        <input type="file" accept="image/*" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold text-slate-900 outline-none focus:border-indigo-600/30 transition-all" onChange={e => setFormData({ ...formData, signatureFile: e.target.files[0] })} />
                        {formData.signature && !formData.signatureFile && <p className="text-[10px] text-indigo-600 font-bold ml-2">Current: {formData.signature.split('/').pop()}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-8">
                    <div className="space-y-2 col-span-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">Asset Cap</label>
                      <input type="number" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-black text-slate-900 outline-none focus:border-indigo-600/30 transition-all" value={formData.vehicleLimit} onChange={e => setFormData({ ...formData, vehicleLimit: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2 col-span-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">Pricing Model (₹)</label>
                      <input type="number" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-black text-slate-900 outline-none focus:border-indigo-600/30 transition-all" value={formData.monthlyFee} onChange={e => setFormData({ ...formData, monthlyFee: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2 col-span-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">Operational Status</label>
                      <select className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-black text-slate-700 outline-none focus:border-indigo-600/30 transition-all appearance-none cursor-pointer" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                        <option value="active">ACTIVE</option>
                        <option value="suspended">SUSPENDED</option>
                        <option value="trial">TRIAL MODE</option>
                        <option value="expired">EXPIRED</option>
                      </select>
                    </div>
                  </div>

                  {/* Encryption Bitmask (Permissions) */}
                  <div className="bg-slate-50 p-8 rounded-[35px] border border-slate-100">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] block mb-6">Module Access Authorization</label>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
                      {Object.keys(formData.permissions).map((key) => (
                        <label key={key} className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-100 cursor-pointer hover:border-indigo-600 group transition-all">
                          <input
                            type="checkbox"
                            className="w-5 h-5 rounded-md text-indigo-600 border-slate-200 focus:ring-0"
                            checked={formData.permissions[key]}
                            onChange={(e) => setFormData({
                              ...formData,
                              permissions: { ...formData.permissions, [key]: e.target.checked }
                            })}
                          />
                          <span className="text-[11px] font-black text-slate-500 uppercase tracking-tighter group-hover:text-indigo-600 transition-colors">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 text-slate-500 font-black py-5 rounded-3xl uppercase text-[12px] tracking-widest hover:bg-slate-200 transition-all">Abort Operation</button>
                    <button disabled={submitting} className="flex-[2] bg-slate-900 text-white font-black py-5 rounded-3xl flex items-center justify-center gap-3 hover:bg-indigo-600 transition-all shadow-2xl shadow-indigo-500/20 uppercase text-[12px] tracking-widest" >
                      {submitting ? 'EXECUTING COMMAND...' : (editingTenant ? 'COMMIT UPDATES' : 'ACTIVATE DEPLOYMENT')}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default Tenants
