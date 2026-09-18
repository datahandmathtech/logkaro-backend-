const fs = require('fs');

let code = fs.readFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/components/Sidebar.jsx', 'utf8');

// Rename Bookings & Leads -> Lead Generation
code = code.replace(/title="Bookings & Leads"/g, 'title="Lead Generation"');

// Rename Sales Leads -> Open
code = code.replace(/label: 'Sales Leads'/g, "label: 'Open'");

// Rename Confirmed Bookings -> Confirmed
code = code.replace(/label: 'Confirmed Bookings'/g, "label: 'Confirmed'");

// Rename Completed Bookings -> Completed
code = code.replace(/label: 'Completed Bookings'/g, "label: 'Completed'");

// Rename Cancelled Bookings -> Lost
code = code.replace(/label: 'Cancelled Bookings'/g, "label: 'Lost'");

// Fix Live DRS position:
// First we completely remove the Live DRS nav item from wherever it is:
code = code.replace(/\{\(hasAccess\('drs'\) \|\| hasAccess\('bookings'\) \|\| isAdmin\) && \([\s\S]*?<NavItem item=\{\{ path: '\/admin\/drs'[\s\S]*?\}\)[\s]*\}\)/, '');

// Now we insert it strictly before Live Feed
const liveFeedStr = `{(hasAccess('liveFeed') || hasAccess('vehiclesManagement')) && (
                    <NavItem item={{ path: '/admin/live-feed'`;

const replacement = `{(hasAccess('drs') || hasAccess('bookings') || isAdmin) && (
                    <NavItem item={{ path: '/admin/drs', icon: Sparkles, label: 'Live DRS', labelKey: 'live_drs' }} onClick={onClose} />
                )}

                {(hasAccess('liveFeed') || hasAccess('vehiclesManagement')) && (
                    <NavItem item={{ path: '/admin/live-feed'`;

code = code.replace(liveFeedStr, replacement);

fs.writeFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/components/Sidebar.jsx', code);
console.log('Sidebar fixed safely');
