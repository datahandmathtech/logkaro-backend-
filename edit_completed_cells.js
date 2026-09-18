const fs = require('fs');

let code = fs.readFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/CompletedBookings.jsx', 'utf8');

const oldCellsRegex = /\{\/\* Package Price \*\/\}\s*<td style=\{\{ padding: '14px 18px'[\s\S]*?Invoice PDF<\/span>\s*<\/button>\s*<\/td>/;

const newCells = `
{/* Package Price & Accounts */}
<td style={{ padding: '14px 18px', fontSize: '13px', fontWeight: '700', color: '#ffffff' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span>{Number(bkg.packagePrice || bkg.totalAmount || 0).toLocaleString('en-IN')}</span>
        
        {(() => {
            const bal = (bkg.packagePrice || bkg.totalAmount || 0) - (bkg.advancePaid || 0);
            return (
                <button
                    type="button"
                    onClick={() => setLedgerModalBooking(bkg)}
                    title="View Accounts Ledger"
                    style={{
                        padding: '4px 12px',
                        background: bal > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                        border: \`1px solid \${bal > 0 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(34, 197, 94, 0.4)'}\`,
                        borderRadius: '20px',
                        color: bal > 0 ? '#ef4444' : '#4ade80',
                        fontSize: '11px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                    }}
                >
                    Accounts
                </button>
            );
        })()}
    </div>
</td>

{/* Actions */}
<td style={{ padding: '14px 18px', textAlign: 'right' }}>
    {bkg.invoiceGenerated ? (
        <button
            type="button"
            onClick={() => setInvoiceModalBooking(bkg)}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#0284c7',
                border: 'none',
                borderRadius: '20px',
                padding: '6px 14px',
                color: '#ffffff',
                fontSize: '11.5px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#0369a1'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#0284c7'}
        >
            <Edit size={14} />
            <span>Edit Invoice</span>
        </button>
    ) : (
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: '600' }}>Blank</span>
    )}
</td>
`;

if (oldCellsRegex.test(code)) {
    code = code.replace(oldCellsRegex, newCells.trim());
    console.log('Successfully replaced Package Price and Actions cells');
} else {
    console.log('Failed to match cells in CompletedBookings.jsx');
}

fs.writeFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/CompletedBookings.jsx', code);
