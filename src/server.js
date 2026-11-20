const express = require('express');
console.log('Backend starting - Updated Oct 3 with Fuel Date Edit and Leads Breakdown');
const dotenv = require('dotenv');
// Version: 1.0.5 - Enhanced Logging
const path = require('path');
// Try loading from default CWD first, then fallback to explicit path
const result = dotenv.config({ override: true });
if (result.error) {
    console.log('Default .env load failed, trying explicit path...');
    dotenv.config({ path: path.join(__dirname, '../.env'), override: true });
}

console.log('--- SERVER STARTUP ---');
console.log('Time:', new Date().toISOString());
console.log('JWT_SECRET present:', !!process.env.JWT_SECRET);
console.log('MONGODB_URI present:', !!process.env.MONGODB_URI);
console.log('PORT:', process.env.PORT);


const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5005;

const { seed } = require('../scripts/seedAdmin');

// Connect to Database
connectDB().then(async () => {
    // Initial Seed
    await seed();

    // Initialize Cron Jobs
    const initCronJobs = require('./utils/cronJobs');
    initCronJobs();

    try {
        const Lead = require('./models/Lead');
        const Booking = require('./models/Booking');
        await Lead.updateMany({ source: { $regex: /^Live DRS \(/i } }, { $set: { source: 'Live DRS' } });
        await Booking.updateMany({ source: { $regex: /^Live DRS \(/i } }, { $set: { source: 'Live DRS' } });
        await Lead.updateMany({ source: 'JustDial' }, { $set: { source: 'Justdial' } });
        await Booking.updateMany({ source: 'JustDial' }, { $set: { source: 'Justdial' } });
    } catch (migErr) {
        console.error('Source cleanup error:', migErr);
    }

    try {
        const { cleanupOrphanedEventRecords } = require('./controllers/eventController');
        await cleanupOrphanedEventRecords();
    } catch (cleanErr) {
        console.error('Initial orphan cleanup error:', cleanErr);
    }

    try {
        const Lead = require('./models/Lead');
        const mistakenLeads = await Lead.find({
            notes: /Booking Cancelled: Customer Request \/ Tour Cancelled/i,
            clientCode: { $ne: '10/35' },
            leadId: { $ne: '10/35' },
            bookingId: { $in: [null, ''] }
        });
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        let restoredCount = 0;
        for (const ml of mistakenLeads) {
            const sDate = ml.travelStartDate ? new Date(ml.travelStartDate) : null;
            const eDate = ml.travelEndDate ? new Date(ml.travelEndDate) : (sDate ? new Date(sDate) : null);
            if (eDate) eDate.setHours(0, 0, 0, 0);
            const cleanedNotes = (ml.notes || '').replace(/Booking Cancelled: Customer Request \/ Tour Cancelled/gi, '').trim();
            if (!eDate || eDate >= now) {
                const daysDiff = sDate ? Math.ceil((new Date(sDate) - now) / (1000 * 60 * 60 * 24)) : 999;
                let restoredPriority = 'Warm';
                if (daysDiff <= 3) restoredPriority = 'Hot';
                else if (daysDiff <= 10) restoredPriority = 'Warm';
                else restoredPriority = 'Cold';
                if (ml.bookingReference === 'Travel Agent') restoredPriority = 'Travel Agent';
                else if (ml.numberOfCars > 1) restoredPriority = 'Mixed Vehicle';

                await Lead.updateOne({ _id: ml._id }, { $set: { status: 'New', priority: restoredPriority, notes: cleanedNotes } });
                restoredCount++;
            } else {
                await Lead.updateOne({ _id: ml._id }, { $set: { notes: cleanedNotes } });
            }
        }
        if (restoredCount > 0) {
            console.log(`[Auto-Recover] Restored ${restoredCount} active leads that were mistakenly marked as Lost.`);
        }
    } catch (recoverErr) {
        console.error('Error recovering mistaken leads in server startup:', recoverErr);
    }

    console.log('Database connected, seeding completed, and Cron Jobs initialized.');
}).catch(err => console.error('DB Initial Error:', err.message));

// Start listening immediately
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Live URL: https://fleet-crm.com`);
});

server.on('error', (err) => {
    console.error('SERVER ERROR:', err.message);
});

module.exports = server;
