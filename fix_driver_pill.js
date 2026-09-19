const fs = require('fs');
let code = fs.readFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Bookings.jsx', 'utf8');

// 1. Change the header from "Status" to "Driver"
const headerRegex = /Status <ArrowUpDown size=\{12\} color="rgba\(255,255,255,0\.4\)" \/>/;
const headerReplacement = `Driver <ArrowUpDown size={12} color="rgba(255,255,255,0.4)" />`;
code = code.replace(headerRegex, headerReplacement);

// 2. Change the Status Pill to Driver Pill
const statusPillRegex = /<td style=\{\{ padding: '14px 16px' \}\}>\s*<div style=\{\{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' \}\}>\s*<span style=\{\{[\s\S]*?\}\}>\s*\{isRunning \? 'Running' : 'Confirmed'\}\s*<\/span>[\s\S]*?<\/td>/;

const statusPillReplacement = `<td style={{ padding: '14px 16px' }}>
                                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                                  {(() => {
                                                      let drvName = null;
                                                      if (bkg.itinerary && bkg.itinerary.length > 0) {
                                                          const firstAssigned = bkg.itinerary.find(d => d.driverId || d.driverName);
                                                          if (firstAssigned) {
                                                              if (firstAssigned.driverName) drvName = firstAssigned.driverName;
                                                              else if (firstAssigned.driverId) {
                                                                  const foundDrv = driversList.find(d => String(d._id) === String(firstAssigned.driverId));
                                                                  if (foundDrv) drvName = foundDrv.name;
                                                              }
                                                          }
                                                      }
                                                      
                                                      if (drvName) {
                                                          return (
                                                              <span style={{
                                                                  padding: '4px 12px',
                                                                  borderRadius: '20px',
                                                                  fontSize: '11px',
                                                                  fontWeight: '800',
                                                                  background: 'rgba(6, 95, 70, 0.45)',
                                                                  color: '#34d399',
                                                                  border: '1px solid rgba(52, 211, 153, 0.4)',
                                                                  display: 'inline-block'
                                                              }}>
                                                                  👤 {drvName}
                                                              </span>
                                                          );
                                                      } else {
                                                          return (
                                                              <span style={{
                                                                  padding: '4px 12px',
                                                                  borderRadius: '20px',
                                                                  fontSize: '11px',
                                                                  fontWeight: '800',
                                                                  background: 'rgba(255, 255, 255, 0.05)',
                                                                  color: 'rgba(255,255,255,0.5)',
                                                                  border: '1px dashed rgba(255, 255, 255, 0.2)',
                                                                  display: 'inline-block'
                                                              }}>
                                                                  Unassigned
                                                              </span>
                                                          );
                                                      }
                                                  })()}
                                                  {isDatePassedBooking(bkg) && (
                                                      <span style={{
                                                          padding: '2px 8px', borderRadius: '4px', fontSize: '10px', 
                                                          background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)'
                                                      }}>
                                                          ⚠️ Date Passed
                                                      </span>
                                                  )}
                                              </div>
                                          </td>`;

code = code.replace(statusPillRegex, statusPillReplacement);

fs.writeFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Bookings.jsx', code);
console.log('Fixed driver pill');
