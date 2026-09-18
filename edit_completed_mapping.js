const fs = require('fs');

let code = fs.readFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/CompletedBookings.jsx', 'utf8');

const oldMap = `const formatted = data.map(b => ({
                    _id: b._id,
                    bookingId: b.bookingCode || b.clientCode || b.bookingId || 'BKG',
                    bookingCode: b.bookingCode || b.clientCode || b.bookingId || 'BKG',
                    guestName: b.clientName || b.guestName || 'Valued Guest',
                    clientName: b.clientName || b.guestName || 'Valued Guest',
                    mobileNumber: b.mobileNumber || '',
                    packagePrice: Number(b.totalAmount) || 0,
                    totalAmount: Number(b.totalAmount) || 0,
                    vehicleType: b.vehicleType || 'Innova Crysta',
                    month: b.month || 'Sep',
                    travelStartDate: b.travelStartDate,
                    travelEndDate: b.travelEndDate,
                    createdAt: b.createdAt
                }));`;

const newMap = `const formatted = data.map(b => ({
                    ...b,
                    _id: b._id,
                    bookingId: b.bookingCode || b.clientCode || b.bookingId || 'BKG',
                    bookingCode: b.bookingCode || b.clientCode || b.bookingId || 'BKG',
                    guestName: b.clientName || b.guestName || 'Valued Guest',
                    clientName: b.clientName || b.guestName || 'Valued Guest',
                    mobileNumber: b.mobileNumber || '',
                    packagePrice: Number(b.totalAmount) || 0,
                    totalAmount: Number(b.totalAmount) || 0,
                    vehicleType: b.vehicleType || 'Innova Crysta',
                    month: b.month || 'Sep',
                    travelStartDate: b.travelStartDate,
                    travelEndDate: b.travelEndDate,
                    createdAt: b.createdAt
                }));`;

if (code.includes(oldMap)) {
    code = code.replace(oldMap, newMap);
    console.log('Modified mapping in CompletedBookings.jsx');
} else {
    // maybe slight whitespace differences
    code = code.replace(/const formatted = data\.map[\s\S]*?\}\)\);/, newMap);
}

fs.writeFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/CompletedBookings.jsx', code);
