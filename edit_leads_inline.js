const fs = require('fs');

let code = fs.readFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Leads.jsx', 'utf8');

// Replace "Status" with "Last Remark" in the thead
code = code.replace(/<th style=\{\{ padding: '16px 20px', fontWeight: '700', fontSize: '12px', color: 'rgba\(255,255,255,0\.7\)', letterSpacing: '0\.3px' \}\}>\s*Last Remark \?\+ \s*<\/th>/,
  "<th style={{ padding: '16px 20px', fontWeight: '700', fontSize: '12px', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.3px' }}>\nLast Remark + \n</th>"
);
// Wait, my regex target is wrong, let's just do a string replace of the column.
// Wait, the column in my `cat` command output already was "Last Remark + ". I changed it yesterday or earlier today!
// Oh, the user just wants the editable cell.

// Inject InlineRemarkEditor before function Leads()
const inlineComponent = `
const InlineRemarkEditor = ({ lead, fetchLeads, setViewingImage }) => {
    const [text, setText] = React.useState('');
    const [uploading, setUploading] = React.useState(false);
    const lastRemark = lead.remarksHistory?.[lead.remarksHistory.length - 1];

    const handleSave = async (attachmentUrl = null) => {
        if (!text.trim() && !attachmentUrl) return;
        try {
            await axios.post(\`/api/leads/\${lead._id}/remarks\`, { text: text || 'File Attached', attachmentUrl });
            setText('');
            fetchLeads();
        } catch (e) {
            alert('Failed to save remark');
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const { data } = await axios.post('/api/admin/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            await handleSave(data.url);
        } catch (e) {
            alert('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '240px' }} onClick={e => e.stopPropagation()}>
            {lastRemark ? (
                <div style={{ borderLeft: '2px solid rgba(59, 130, 246, 0.5)', paddingLeft: '8px', marginBottom: '4px' }}>
                    <div style={{ fontSize: '12px', color: 'white', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{lastRemark.text}</div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>{new Date(lastRemark.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                        {lastRemark.attachmentUrl && (
                             <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    let url = lastRemark.attachmentUrl;
                                    if (url.includes('taxi-fleet-crm/documents')) {
                                        const parts = url.split('taxi-fleet-crm/documents/');
                                        url = 'https://res.cloudinary.com/doaymwjki/image/upload/v1/taxi-fleet-crm/documents/' + parts[1];
                                    } else if (!url.startsWith('http')) {
                                        url = \`http://127.0.0.1:5005\${url}\`;
                                    }
                                    setViewingImage(url);
                                }}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)', color: '#fbbf24', fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '12px', cursor: 'pointer' }}
                             >
                                <Eye size={10} /> View
                             </button>
                        )}
                    </div>
                </div>
            ) : (
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', marginBottom: '4px' }}>No remarks yet</div>
            )}
            
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', background: 'rgba(0,0,0,0.3)', border: '1px dashed rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: '6px', transition: 'all 0.2s ease' }}>
                <input 
                    type="text" 
                    value={text} 
                    onChange={e => setText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                    placeholder="Type remark & press Enter..." 
                    style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', fontSize: '11px', outline: 'none' }}
                />
                
                {uploading ? (
                    <span style={{ fontSize: '10px', color: '#38bdf8', padding: '4px' }}>Wait...</span>
                ) : (
                    <>
                        <label style={{ cursor: 'pointer', display: 'flex', color: 'rgba(255,255,255,0.6)', padding: '2px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} title="Attach Photo/Camera">
                            <Camera size={14} />
                            <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                        </label>
                        
                        <label style={{ cursor: 'pointer', display: 'flex', color: 'rgba(255,255,255,0.6)', padding: '2px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} title="Attach Document">
                            <FileText size={14} />
                            <input type="file" accept=".pdf,.doc,.docx" onChange={handleFileUpload} style={{ display: 'none' }} />
                        </label>
                    </>
                )}
            </div>
        </div>
    );
};
`;

if (!code.includes('const InlineRemarkEditor')) {
    code = code.replace(/export default function Leads\(\) \{/, inlineComponent + '\nexport default function Leads() {');
}

// Now replace the <td> content for Last Remark
// I need to target the block starting with {/* 6. Status */} and ending with {/* 7. Actions */}
const oldStart = code.indexOf('{/* 6. Status */}');
const oldEnd = code.indexOf('{/* 7. Actions */}');

if (oldStart !== -1 && oldEnd !== -1) {
    const oldCode = code.substring(oldStart, oldEnd);
    const newCode = `{/* 6. Status */}
                                    <td style={{ padding: '16px 20px', maxWidth: '240px', verticalAlign: 'middle' }}>
                                        <InlineRemarkEditor lead={lead} fetchLeads={fetchLeads} setViewingImage={setViewingImage} />
                                    </td>\n\n                                    `;
    code = code.replace(oldCode, newCode);
    console.log('Replaced Leads table td with InlineRemarkEditor.');
}

fs.writeFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Leads.jsx', code);
