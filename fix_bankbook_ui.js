const fs = require('fs');
const filePath = 'E:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/BankBook.jsx';
let code = fs.readFileSync(filePath, 'utf8');

const oldTd = `<td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteTx(tx._id)}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: 'rgba(255,255,255,0.3)',
                                                    cursor: 'pointer',
                                                    padding: '4px',
                                                    borderRadius: '4px'
                                                }}
                                                title="Delete Entry"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </td>`;

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
                                                onClick={() => handleDeleteClick(tx)}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: 'rgba(255,255,255,0.3)',
                                                    cursor: 'pointer',
                                                    padding: '4px',
                                                    borderRadius: '4px'
                                                }}
                                                title="Delete Entry"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </td>`;

// Let's use a regex that matches the button since indentation can vary
const regex = /<td style=\{\{ padding: '16px 20px', textAlign: 'center' \}\}>[\s\n]*<button[\s\n]*type="button"[\s\n]*onClick=\{\(\) => handleDeleteTx\(tx\._id\)\}[\s\S]*?<\/button>[\s\n]*<\/td>/;

if (code.match(regex)) {
    code = code.replace(regex, newTd);
    console.log("Replaced TD!");
} else {
    console.log("Could not find TD!");
}

fs.writeFileSync(filePath, code);
