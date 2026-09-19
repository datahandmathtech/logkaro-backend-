const fs = require('fs');
let code = fs.readFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/utils/bookingConfirmationPdf.js', 'utf8');

// The block to replace starts around "5. Terms & Conditions"
const termsRegex = /\/\/ 5\. Terms & Conditions[\s\S]*?let termY = currentY \+ 5;\s*defaultTerms\.forEach\(\(term, i\) => \{[\s\S]*?termY \+= split\.length \* 3\.5;\s*\}\);/m;

const newSection = `// 5. Remarks & Advance Info
    if (currentY > pageHeight - 60) {
        doc.addPage();
        currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...primaryColor);
    doc.text('ADVANCE PAYMENT DETAILS', 14, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...darkColor);
    let advanceY = currentY + 7;
    const aDate = booking.advanceDate ? new Date(booking.advanceDate).toLocaleDateString('en-IN') : 'N/A';
    doc.text(\`Amount Received: Rs. \${(booking.advancePaid || 0).toLocaleString('en-IN')}\`, 14, advanceY);
    doc.text(\`Payment Date: \${aDate}\`, 70, advanceY);
    doc.text(\`Payment Mode: \${booking.paymentMode || 'Cash / Transfer'}\`, 130, advanceY);

    currentY = advanceY + 12;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...primaryColor);
    doc.text('GUEST CONVERSATION / REMARKS', 14, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...textMuted);
    
    let remarkY = currentY + 7;
    const allRemarks = [];
    if (booking.lead?.specialRemarks) allRemarks.push('Special Note: ' + booking.lead.specialRemarks);
    if (booking.lead?.remarksHistory && Array.isArray(booking.lead.remarksHistory)) {
        booking.lead.remarksHistory.forEach(r => {
            const rd = r.date ? new Date(r.date).toLocaleDateString('en-IN') : '';
            allRemarks.push(\`[\${rd}] \${r.text}\`);
        });
    }
    
    if (allRemarks.length === 0) {
        doc.text('No special remarks recorded.', 14, remarkY);
        remarkY += 5;
    } else {
        allRemarks.forEach(rm => {
            const split = doc.splitTextToSize(rm, pageWidth - 28);
            doc.text(split, 14, remarkY);
            remarkY += split.length * 3.5;
        });
    }`;

code = code.replace(termsRegex, newSection);
fs.writeFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/utils/bookingConfirmationPdf.js', code);
console.log('Updated PDF content');
