const fs = require('fs');
const path = require('path');

const targetPath = path.resolve(__dirname, '../../yatree-frontend-/src/pages/OutsideCars.jsx');
let content = fs.readFileSync(targetPath, 'utf8');

// First restore any partial git changes to OutsideCars.jsx if needed, or check
// We want to insert the view switcher right before:
// <div className="glass-card" style={{ padding: 'clamp(12px, 2vw, 16px)'
const search1 = `<div className="glass-card" style={{ padding: 'clamp(12px, 2vw, 16px)', marginBottom: 'clamp(24px, 4vw, 32px)'`;

const switcherPart = `            {/* ─ ─ ─  MAIN VIEW SWITCHER (DUTIES VS VENDOR LEDGER) ─ ─ ─  */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
                <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.03)', padding: '5px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <button 
                        onClick={() => setMainView('duties')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 22px', borderRadius: '12px', border: 'none',
                            background: mainView === 'duties' ? 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)' : 'transparent',
                            color: mainView === 'duties' ? '#0f172a' : 'rgba(255,255,255,0.6)',
                            fontWeight: '900', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s',
                            boxShadow: mainView === 'duties' ? '0 4px 15px rgba(251, 191, 36, 0.3)' : 'none'
                        }}
                    >
                        <Car size={16} /> Daily Duties List ({filtered.length})
                    </button>
                    <button 
                        onClick={() => setMainView('vendorLedger')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 22px', borderRadius: '12px', border: 'none',
                            background: mainView === 'vendorLedger' ? 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)' : 'transparent',
                            color: mainView === 'vendorLedger' ? '#0f172a' : 'rgba(255,255,255,0.6)',
                            fontWeight: '900', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s',
                            boxShadow: mainView === 'vendorLedger' ? '0 4px 15px rgba(251, 191, 36, 0.3)' : 'none'
                        }}
                    >
                        <Store size={16} /> Vendor Ledger & Khata ({vendorAggregates.length})
                    </button>
                </div>

                {mainView === 'duties' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={handleOpenLogDuty} style={{ height: '42px', padding: '0 20px', background: theme.primary, color: 'black', border: 'none', borderRadius: '12px', fontWeight: '900', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Plus size={16} strokeWidth={3} /> <span className="hide-mobile">Add Duty</span>
                        </button>
                        <button onClick={handleExportPDF} style={{ height: '42px', width: '42px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <FileText size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* ─ ─ ─  VIEW 1: DAILY DUTIES LIST ─ ─ ─  */}
            {mainView === 'duties' && (
                <>
` + search1;

content = content.replace(search1, switcherPart);

const search2 = `<AnimatePresence>\r\n                {showModal && (`;
const search2Alt = `<AnimatePresence>\n                {showModal && (`;

const vendorViewPart = `                </>
            )}

            {/* ─ ─ ─  VIEW 2: VENDOR LEDGER & KHATA (HORIZONTAL ROWS) ─ ─ ─  */}
            {mainView === 'vendorLedger' && (
                <div>
                    {/* Vendor Search Bar & Summary Stats */}
                    <div className="glass-card" style={{ padding: 'clamp(12px, 2vw, 16px)', marginBottom: 'clamp(20px, 3vw, 24px)', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '24px' }}>
                        <div className="flex-resp" style={{ gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
                                <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#fbbf24', opacity: 0.6, zIndex: 1 }} />
                                <input 
                                    type="text" 
                                    placeholder="Search vendor name or car plate number..." 
                                    className="premium-compact-input" 
                                    value={vendorSearchTerm} 
                                    onChange={e => setVendorSearchTerm(e.target.value)} 
                                    style={{ paddingLeft: '48px', height: '50px', width: '100%', fontSize: '13px' }} 
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '8px 16px', display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: '800' }}>Outside Vendors</span>
                                    <span style={{ fontSize: '16px', fontWeight: '1000', color: 'white' }}>{filteredVendorAggregates.length}</span>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '8px 16px', display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: '800' }}>Total Payout</span>
                                    <span style={{ fontSize: '16px', fontWeight: '1000', color: '#10b981' }}>
                                        ₹{filteredVendorAggregates.reduce((sum, v) => sum + v.totalAmount, 0).toLocaleString('en-IN')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sleek Horizontal Table Rows View */}
                    <div className="hide-mobile" style={{ background: 'rgba(15, 23, 42, 0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    <th style={{ padding: '18px 24px', textAlign: 'left', fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Vendor / Provider</th>
                                    <th style={{ padding: '18px 24px', textAlign: 'left', fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Cars / Plates Provided</th>
                                    <th style={{ padding: '18px 24px', textAlign: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Duties</th>
                                    <th style={{ padding: '18px 24px', textAlign: 'left', fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Latest Activity</th>
                                    <th style={{ padding: '18px 24px', textAlign: 'right', fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Amount</th>
                                    <th style={{ padding: '18px 24px', textAlign: 'right', fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredVendorAggregates.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" style={{ padding: '80px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px', fontWeight: '800' }}>
                                            No vendor khata found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredVendorAggregates.map((vnd, idx) => (
                                        <motion.tr 
                                            key={vnd.vendorName || idx}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.02 }}
                                            className="table-row-hover"
                                            onClick={() => { setSelectedVendorForLedger(vnd); setVendorLedgerMonth('All'); }}
                                            style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer' }}
                                        >
                                            <td style={{ padding: '18px 24px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.12) 0%, rgba(217, 119, 6, 0.2) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(251, 191, 36, 0.25)', flexShrink: 0 }}>
                                                        <Store size={20} color="#fbbf24" />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '15px', fontWeight: '900', color: 'white' }}>{vnd.vendorName}</div>
                                                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '700' }}>
                                                            {vnd.monthlyBreakdown?.length || 1} active month(s)
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td style={{ padding: '18px 24px' }}>
                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxWidth: '320px' }}>
                                                    {vnd.vehicles.slice(0, 4).map(p => (
                                                        <span key={p} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800' }}>
                                                            {p}
                                                        </span>
                                                    ))}
                                                    {vnd.vehicles.length > 4 && (
                                                        <span style={{ background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '900' }}>
                                                            +{vnd.vehicles.length - 4} more
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td style={{ padding: '18px 24px', textAlign: 'center' }}>
                                                <span style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '900' }}>
                                                    {vnd.totalDuties} duties
                                                </span>
                                            </td>

                                            <td style={{ padding: '18px 24px' }}>
                                                <div style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>
                                                    {vnd.latestDate ? formatDateIST(vnd.latestDate) : '—'}
                                                </div>
                                            </td>

                                            <td style={{ padding: '18px 24px', textAlign: 'right' }}>
                                                <div style={{ fontSize: '16px', fontWeight: '1000', color: '#10b981' }}>
                                                    ₹{vnd.totalAmount.toLocaleString('en-IN')}
                                                </div>
                                            </td>

                                            <td style={{ padding: '18px 24px', textAlign: 'right' }}>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedVendorForLedger(vnd);
                                                        setVendorLedgerMonth('All');
                                                    }}
                                                    style={{
                                                        padding: '8px 18px', borderRadius: '12px', border: '1px solid rgba(251, 191, 36, 0.3)',
                                                        background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(217, 119, 6, 0.25) 100%)',
                                                        color: '#fbbf24', fontWeight: '900', fontSize: '12px', cursor: 'pointer',
                                                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                        boxShadow: '0 4px 12px rgba(251, 191, 36, 0.15)'
                                                    }}
                                                >
                                                    <Eye size={14} /> Open Ledger
                                                </button>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View for Outside Vendors */}
                    <div className="show-mobile" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {filteredVendorAggregates.map((vnd, idx) => (
                            <motion.div
                                key={vnd.vendorName || idx}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                onClick={() => { setSelectedVendorForLedger(vnd); setVendorLedgerMonth('All'); }}
                                style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '18px', cursor: 'pointer' }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(251, 191, 36, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(251, 191, 36, 0.25)' }}>
                                            <Store size={20} color="#fbbf24" />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '16px', fontWeight: '950', color: 'white' }}>{vnd.vendorName}</div>
                                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '700' }}>{vnd.totalDuties} duties • {vnd.vehicles.length} vehicle(s)</div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '16px', fontWeight: '1000', color: '#10b981' }}>₹{vnd.totalAmount.toLocaleString('en-IN')}</div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                                        Latest: {vnd.latestDate ? formatDateIST(vnd.latestDate) : '—'}
                                    </span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setSelectedVendorForLedger(vnd); setVendorLedgerMonth('All'); }}
                                        style={{ padding: '6px 14px', borderRadius: '8px', background: '#fbbf24', color: '#0f172a', border: 'none', fontWeight: '900', fontSize: '11px', cursor: 'pointer' }}
                                    >
                                        Open Khata
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* ─ ─ ─  VENDOR LEDGER & KHATA MONTH-WISE MODAL ─ ─ ─  */}
            <AnimatePresence>
                {selectedVendorForLedger && (
                    <div className="modal-overlay" style={{ zIndex: 2100 }}>
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }} 
                            exit={{ scale: 0.95, opacity: 0 }} 
                            className="modal-content-wrapper" 
                            style={{ maxWidth: '980px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}
                        >
                            {/* Modal Header */}
                            <div style={{ padding: '24px 30px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.7)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(217, 119, 6, 0.25) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                                        <Store size={24} color="#fbbf24" />
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <h2 style={{ color: 'white', fontSize: '20px', fontWeight: '950', margin: 0 }}>{selectedVendorForLedger.vendorName}</h2>
                                            <span style={{ fontSize: '10px', background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.2)', padding: '2px 8px', borderRadius: '6px', fontWeight: '800' }}>Outside Vendor</span>
                                        </div>
                                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: '700', margin: '4px 0 0 0' }}>
                                            Plates: {selectedVendorForLedger.vehicles.join(', ') || 'N/A'} • Total Duties: {selectedVendorForLedger.totalDuties}
                                        </p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: '800' }}>Total Payout</div>
                                        <div style={{ fontSize: '20px', fontWeight: '1000', color: '#10b981' }}>₹{selectedVendorForLedger.totalAmount.toLocaleString('en-IN')}</div>
                                    </div>
                                    <button onClick={() => setSelectedVendorForLedger(null)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
                                </div>
                            </div>

                            {/* Month-Wise Filter Pills */}
                            <div style={{ padding: '16px 30px', background: 'rgba(0,0,0,0.25)', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: '10px', overflowX: 'auto' }}>
                                <button
                                    onClick={() => setVendorLedgerMonth('All')}
                                    style={{
                                        padding: '8px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                                        background: vendorLedgerMonth === 'All' ? '#fbbf24' : 'rgba(255,255,255,0.05)',
                                        color: vendorLedgerMonth === 'All' ? '#0f172a' : 'white',
                                        fontWeight: '900', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px'
                                    }}
                                >
                                    <span>All Months</span>
                                    <span style={{ opacity: 0.8, fontSize: '10px' }}>(₹{selectedVendorForLedger.totalAmount.toLocaleString()})</span>
                                </button>
                                {selectedVendorForLedger.monthlyBreakdown?.map(mb => (
                                    <button
                                        key={mb.month}
                                        onClick={() => setVendorLedgerMonth(mb.month)}
                                        style={{
                                            padding: '8px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                                            background: vendorLedgerMonth === mb.month ? '#fbbf24' : 'rgba(255,255,255,0.05)',
                                            color: vendorLedgerMonth === mb.month ? '#0f172a' : 'white',
                                            fontWeight: '900', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px'
                                        }}
                                    >
                                        <span>{formatMonthYear(mb.month)}</span>
                                        <span style={{ opacity: 0.8, fontSize: '10px' }}>({mb.count} duties • ₹{mb.amount.toLocaleString()})</span>
                                    </button>
                                ))}
                            </div>

                            {/* Active View Summary */}
                            <div style={{ padding: '12px 30px', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>
                                    Showing <strong style={{ color: 'white' }}>{filteredVendorDuties.length} duties</strong> for {vendorLedgerMonth === 'All' ? 'All Time' : formatMonthYear(vendorLedgerMonth)}
                                </div>
                                <div style={{ fontSize: '13px', fontWeight: '900', color: 'white' }}>
                                    Filtered Payout Total: <span style={{ color: '#10b981' }}>₹{activeMonthTotal.toLocaleString('en-IN')}</span>
                                </div>
                            </div>

                            {/* Duties Table for this Vendor */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 30px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                            <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Duty Date</th>
                                            <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Vehicle & Model</th>
                                            <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Property / Guest</th>
                                            <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Duty Type</th>
                                            <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Payout (₹)</th>
                                            <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredVendorDuties.length === 0 ? (
                                            <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>No duties for this month.</td></tr>
                                        ) : (
                                            filteredVendorDuties.map((d, dIdx) => (
                                                <tr key={d._id || dIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                    <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: '800', color: 'white' }}>
                                                        {formatDateIST(d.effectiveDate)}
                                                    </td>
                                                    <td style={{ padding: '12px 14px' }}>
                                                        <div style={{ fontSize: '13px', fontWeight: '900', color: 'white' }}>{d.carNumber?.split('#')[0]}</div>
                                                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{d.model || 'Standard'}</div>
                                                    </td>
                                                    <td style={{ padding: '12px 14px' }}>
                                                        <div style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>{d.guestName || d.property || 'Direct'}</div>
                                                    </td>
                                                    <td style={{ padding: '12px 14px' }}>
                                                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>{d.dutyType || 'Standard'}</div>
                                                        {d.dropLocation && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>→ {d.dropLocation}</div>}
                                                    </td>
                                                    <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: '15px', fontWeight: '1000', color: '#10b981' }}>
                                                        ₹{d.effectiveAmount.toLocaleString('en-IN')}
                                                    </td>
                                                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                                            <button 
                                                                onClick={() => { setSelectedVendorForLedger(null); handleEdit(d); }} 
                                                                style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            >
                                                                <Edit size={13} />
                                                            </button>
                                                            <button 
                                                                onClick={() => { handleDelete(d._id); setSelectedVendorForLedger(null); }} 
                                                                style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', color: '#f43f5e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

`;

if (content.includes(search2)) {
    content = content.replace(search2, vendorViewPart + search2);
} else if (content.includes(search2Alt)) {
    content = content.replace(search2Alt, vendorViewPart + search2Alt);
} else {
    console.error("Neither search2 nor search2Alt found!");
    process.exit(1);
}

fs.writeFileSync(targetPath, content, 'utf8');
console.log("Successfully updated OutsideCars.jsx!");
