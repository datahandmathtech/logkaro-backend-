const fs = require('fs');
const filePath = 'E:/New folder/Master-Server/TEXI/logkaro-frontend-/src/pages/BankBook.jsx';
if (fs.existsSync(filePath)) {
    let code = fs.readFileSync(filePath, 'utf8');

    // 1. ADD STATE VARIABLES
    const statesToAdd = `
    const [previewImageUrl, setPreviewImageUrl] = useState(null);

    // NEW FEATURES STATE
    const [showEditTxModal, setShowEditTxModal] = useState(false);
    const [editingTx, setEditingTx] = useState(null);
    const [editTxFormData, setEditTxFormData] = useState({ amount: '', date: '', description: '', category: '', paymentMode: '', reference: '' });
    const [submittingEditTx, setSubmittingEditTx] = useState(false);

    const [showRevertModal, setShowRevertModal] = useState(false);
    const [txToDelete, setTxToDelete] = useState(null);
`;
    if (!code.includes('showEditTxModal')) {
        code = code.replace(`    const [previewImageUrl, setPreviewImageUrl] = useState(null);`, statesToAdd);
    }

    // 2. MODIFY handleDeleteTx AND ADD handleEditTx
    const oldDeleteFuncRegex = /\s*\/\/ Delete Transaction[\s\S]*?const handleDeleteTx = async \(id\) => \{[\s\S]*?alert\(err\.response\?\.data\?\.message \|\| 'Failed to delete transaction'\);\s*\}\s*\};\s*/;
    const newDeleteFunc = `    // Edit Transaction Setup
    const openEditTxModal = (tx) => {
        setEditingTx(tx);
        setEditTxFormData({
            amount: tx.amount || '',
            date: tx.date ? tx.date.substring(0, 10) : '',
            description: tx.description || '',
            category: tx.category || '',
            paymentMode: tx.paymentMode || '',
            reference: tx.reference || ''
        });
        setShowEditTxModal(true);
    };

    const submitEditTx = async (e) => {
        e.preventDefault();
        setSubmittingEditTx(true);
        try {
            await axios.put(\`/api/banks/transactions/\${editingTx._id}\`, editTxFormData);
            setShowEditTxModal(false);
            setEditingTx(null);
            await fetchBankAccounts();
            await fetchTransactions();
        } catch (err) {
            console.error('Error editing tx:', err);
            alert('Failed to edit transaction');
        } finally {
            setSubmittingEditTx(false);
        }
    };

    // Delete Transaction Logic
    const handleDeleteClick = (tx) => {
        if (tx.bookingRef) {
            setTxToDelete(tx);
            setShowRevertModal(true);
        } else {
            if (window.confirm('Are you sure you want to delete this bank transaction? This will reverse its balance impact.')) {
                executeDeleteTx(tx._id, false);
            }
        }
    };

    const executeDeleteTx = async (id, revertBooking) => {
        try {
            await axios.delete(\`/api/banks/transactions/\${id}\${revertBooking ? '?revertBooking=true' : ''}\`);
            setShowRevertModal(false);
            setTxToDelete(null);
            await fetchBankAccounts();
            await fetchTransactions();
        } catch (err) {
            console.error('Error deleting transaction:', err);
            alert(err.response?.data?.message || 'Failed to delete transaction');
        }
    };
`;
    if (code.includes('const handleDeleteTx = async (id) => {')) {
        code = code.replace(oldDeleteFuncRegex, '\n' + newDeleteFunc);
    }

    // 3. FIX UI RENDER for Edit Button
    const oldUiButtons = `onClick={() => handleDeleteTx(tx._id)}`;
    const newUiButtons = `onClick={() => handleDeleteClick(tx)}`;
    if (code.includes('onClick={() => handleDeleteTx(tx._id)}')) {
        code = code.replace(oldUiButtons, newUiButtons);
        
        // Let's replace the whole td for buttons if possible, or just the onClick and add the edit button before it.
        const tdRegex = /<td style={{ padding: '16px 20px', textAlign: 'center' }}>\s*<button\s*type="button"\s*onClick=\{\(\) => handleDeleteClick\(tx\)\}/;
        const newTd = `<td style={{ padding: '16px 20px', textAlign: 'center', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => openEditTxModal(tx)}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: 'rgba(255,255,255,0.7)',
                                                        cursor: 'pointer',
                                                        padding: '4px',
                                                        borderRadius: '4px'
                                                    }}
                                                    title="Edit Entry"
                                                >
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteClick(tx)}`;
        code = code.replace(tdRegex, newTd);
    }

    // 4. ADD MODALS AT THE END
    const oldModalsEnd = `            {previewImageUrl && (`;
    const newModalsEnd = `            {/* Edit Transaction Modal */}
            {showEditTxModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: '#0B1121', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '500px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#fff', marginBottom: '24px' }}>Edit Transaction</h2>
                        <form onSubmit={submitEditTx} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>AMOUNT</label>
                                    <input type="number" required style={{ background: '#131C31', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px 16px', color: '#fff', fontSize: '14px', outline: 'none' }} value={editTxFormData.amount} onChange={e => setEditTxFormData({ ...editTxFormData, amount: e.target.value })} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>DATE</label>
                                    <input type="date" required style={{ background: '#131C31', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px 16px', color: '#fff', fontSize: '14px', outline: 'none' }} value={editTxFormData.date} onChange={e => setEditTxFormData({ ...editTxFormData, date: e.target.value })} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>DESCRIPTION</label>
                                <input type="text" style={{ background: '#131C31', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px 16px', color: '#fff', fontSize: '14px', outline: 'none' }} value={editTxFormData.description} onChange={e => setEditTxFormData({ ...editTxFormData, description: e.target.value })} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                                <button type="button" onClick={() => setShowEditTxModal(false)} style={{ padding: '12px 24px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '14px', fontWeight: '600', border: 'none', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" disabled={submittingEditTx} style={{ padding: '12px 24px', borderRadius: '12px', background: '#3b82f6', color: '#fff', fontSize: '14px', fontWeight: '600', border: 'none', cursor: submittingEditTx ? 'not-allowed' : 'pointer', opacity: submittingEditTx ? 0.7 : 1 }}>
                                    {submittingEditTx ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Revert Booking Modal */}
            {showRevertModal && txToDelete && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
                    <div style={{ background: '#0B1121', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '500px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '24px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#fff', marginBottom: '12px' }}>Delete Booking Payment</h2>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
                            This payment is linked to a Confirmed Booking (<strong>{txToDelete.bookingRef?.clientName}</strong>). When you delete this payment, what would you like to do with the Booking?
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <button onClick={() => executeDeleteTx(txToDelete._id, false)} style={{ width: '100%', padding: '16px', borderRadius: '16px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontWeight: '700', fontSize: '15px' }}>Keep Booking Confirmed</span>
                                <span style={{ fontSize: '13px', opacity: 0.8 }}>Just remove this payment, leave booking intact.</span>
                            </button>
                            <button onClick={() => executeDeleteTx(txToDelete._id, true)} style={{ width: '100%', padding: '16px', borderRadius: '16px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontWeight: '700', fontSize: '15px' }}>Revert to Open Lead</span>
                                <span style={{ fontSize: '13px', opacity: 0.8 }}>Delete this booking and move it back to Open Leads.</span>
                            </button>
                            <button onClick={() => { setShowRevertModal(false); setTxToDelete(null); }} style={{ width: '100%', padding: '16px', borderRadius: '16px', background: 'transparent', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', cursor: 'pointer', fontWeight: '600', marginTop: '8px' }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {previewImageUrl && (`;

    if (code.includes('{previewImageUrl && (')) {
        code = code.replace(oldModalsEnd, newModalsEnd);
    }

    fs.writeFileSync(filePath, code);
    console.log('logkaro-frontend BankBook.jsx patched successfully');
}
