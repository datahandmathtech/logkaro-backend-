const asyncHandler = require('express-async-handler');
const DRSDuty = require('../models/DRSDuty');
const Company = require('../models/Company');
const axios = require('axios');

// Helper to parse date like "1-10", "01/10/2026", "2026-10-01", etc.
const parseSheetDate = (dateStr, defaultMonth = 10, defaultYear = 2026) => {
    if (!dateStr) return null;
    const s = String(dateStr).trim();

    // Check "1-10" or "01-10" or "1/10"
    const matchShort = s.match(/^(\d{1,2})[-/](\d{1,2})$/);
    if (matchShort) {
        const day = parseInt(matchShort[1], 10);
        const month = parseInt(matchShort[2], 10);
        const d = new Date(Date.UTC(defaultYear, month - 1, day, 12, 0, 0));
        return isNaN(d.getTime()) ? null : d;
    }

    // Check full DD-MM-YYYY or DD/MM/YYYY
    const matchFull = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
    if (matchFull) {
        const day = parseInt(matchFull[1], 10);
        const month = parseInt(matchFull[2], 10);
        let year = parseInt(matchFull[3], 10);
        if (year < 100) year += 2000;
        const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
        return isNaN(d.getTime()) ? null : d;
    }

    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
};

// @desc    Receive webhook from Google Apps Script when Sheet is edited or synced
// @route   POST /api/drs/sync/sheet-webhook
// @access  Public (protected via companyId / secret)
const syncFromSheetWebhook = asyncHandler(async (req, res) => {
    const { companyId, tabName, action, rows, singleRow } = req.body;

    if (!companyId) {
        return res.status(400).json({ success: false, message: 'companyId is required' });
    }

    // Determine year/month from tabName if available (e.g. "Oct. 26" -> month 10, year 2026)
    let defaultMonth = 10;
    let defaultYear = 2026;
    if (tabName) {
        const mStr = tabName.toLowerCase();
        if (mStr.includes('jan')) defaultMonth = 1;
        else if (mStr.includes('feb')) defaultMonth = 2;
        else if (mStr.includes('mar')) defaultMonth = 3;
        else if (mStr.includes('apr')) defaultMonth = 4;
        else if (mStr.includes('may')) defaultMonth = 5;
        else if (mStr.includes('jun')) defaultMonth = 6;
        else if (mStr.includes('jul')) defaultMonth = 7;
        else if (mStr.includes('aug')) defaultMonth = 8;
        else if (mStr.includes('sep')) defaultMonth = 9;
        else if (mStr.includes('oct')) defaultMonth = 10;
        else if (mStr.includes('nov')) defaultMonth = 11;
        else if (mStr.includes('dec')) defaultMonth = 12;

        const yMatch = tabName.match(/\b(20\d{2}|\d{2})\b/);
        if (yMatch) {
            let y = parseInt(yMatch[1], 10);
            if (y < 100) y += 2000;
            defaultYear = y;
        }
    }

    // 1. Single row edit from onEdit trigger
    if (singleRow) {
        const parsedDate = parseSheetDate(singleRow.date, defaultMonth, defaultYear);
        if (!parsedDate || !singleRow.guest) {
            return res.status(400).json({ success: false, message: 'Date and Guest name required' });
        }

        // Search for existing duty on that date with same guest or mobile
        const startOfDay = new Date(parsedDate);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(parsedDate);
        endOfDay.setUTCHours(23, 59, 59, 999);

        let existingDuty = null;
        if (singleRow.dutyId) {
            existingDuty = await DRSDuty.findOne({ _id: singleRow.dutyId, company: companyId });
        }
        if (!existingDuty) {
            existingDuty = await DRSDuty.findOne({
                company: companyId,
                date: { $gte: startOfDay, $lte: endOfDay },
                clientName: { $regex: new RegExp(`^${singleRow.guest.trim()}$`, 'i') }
            });
        }

        const dutyData = {
            company: companyId,
            clientName: (singleRow.guest || '').trim(),
            mobileNumber: (singleRow.guestMob || '').toString().trim(),
            hotel: (singleRow.hotel || '').trim(),
            date: parsedDate,
            time: (singleRow.time || '09:00 AM').trim(),
            duty: (singleRow.duty || '').trim(),
            itinerary: (singleRow.duty || '').trim(),
            revenue: Number(singleRow.rate) || 0,
            cOut: (singleRow.cOut || '').trim(),
            carType: (singleRow.car || 'Sedan').trim(),
            customDriverName: (singleRow.driver || '').trim(),
            isDirectBooking: true
        };

        if (existingDuty) {
            await DRSDuty.findByIdAndUpdate(existingDuty._id, dutyData);
            return res.json({ success: true, action: 'updated', dutyId: existingDuty._id });
        } else {
            const newDuty = await DRSDuty.create(dutyData);
            return res.json({ success: true, action: 'created', dutyId: newDuty._id });
        }
    }

    // 2. Full batch sync from Google Sheet
    if (Array.isArray(rows) && rows.length > 0) {
        let syncedCount = 0;
        let currentDate = null;

        for (const r of rows) {
            if (r.date) {
                const pd = parseSheetDate(r.date, defaultMonth, defaultYear);
                if (pd) currentDate = pd;
            }

            if (!currentDate || !r.guest || !r.guest.trim()) continue;

            const startOfDay = new Date(currentDate);
            startOfDay.setUTCHours(0, 0, 0, 0);
            const endOfDay = new Date(currentDate);
            endOfDay.setUTCHours(23, 59, 59, 999);

            const dutyData = {
                company: companyId,
                clientName: r.guest.trim(),
                mobileNumber: (r.guestMob || '').toString().trim(),
                hotel: (r.hotel || '').trim(),
                date: currentDate,
                time: (r.time || '09:00 AM').trim(),
                duty: (r.duty || '').trim(),
                itinerary: (r.duty || '').trim(),
                revenue: Number(r.rate) || 0,
                cOut: (r.cOut || '').trim(),
                carType: (r.car || 'Sedan').trim(),
                customDriverName: (r.driver || '').trim(),
                isDirectBooking: true
            };

            const existing = await DRSDuty.findOne({
                company: companyId,
                date: { $gte: startOfDay, $lte: endOfDay },
                clientName: { $regex: new RegExp(`^${r.guest.trim()}$`, 'i') }
            });

            if (existing) {
                await DRSDuty.findByIdAndUpdate(existing._id, dutyData);
            } else {
                await DRSDuty.create(dutyData);
            }
            syncedCount++;
        }

        return res.json({ success: true, syncedCount });
    }

    return res.status(400).json({ success: false, message: 'No rows or singleRow provided' });
});

// @desc    Export DRS duties formatted for Google Sheet (2D array & date groups)
// @route   GET /api/drs/sync/sheet-data/:companyId
// @access  Public / Protected
const getSheetData = asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { month = 10, year = 2026 } = req.query;

    const startDate = new Date(Date.UTC(Number(year), Number(month) - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(Number(year), Number(month), 0, 23, 59, 59));

    const duties = await DRSDuty.find({
        company: companyId,
        date: { $gte: startDate, $lte: endDate }
    }).populate('driver', 'name mobile').populate('vehicle', 'carNumber model').sort({ date: 1, time: 1 });

    // Group duties by date (e.g. "1-10", "2-10")
    const dateGroups = {};
    duties.forEach(duty => {
        const d = new Date(duty.date);
        const day = d.getDate();
        const m = d.getMonth() + 1;
        const key = `${day}-${m}`;

        if (!dateGroups[key]) {
            dateGroups[key] = {
                dateKey: key,
                fullDate: d.toISOString().split('T')[0],
                totalFare: 0,
                duties: []
            };
        }

        const fare = Number(duty.revenue) || 0;
        dateGroups[key].totalFare += fare;
        dateGroups[key].duties.push({
            id: duty._id,
            hotel: duty.hotel || '',
            guest: duty.clientName || '',
            guestMob: duty.mobileNumber || '',
            time: duty.time || '09:00 AM',
            duty: duty.duty || duty.itinerary || '',
            rate: fare,
            cOut: duty.cOut || '',
            car: duty.vehicle?.carNumber || duty.customCarNumber || duty.carType || '',
            driver: duty.driver?.name || duty.customDriverName || '',
            status: duty.status || 'Scheduled'
        });
    });

    res.json({
        success: true,
        month,
        year,
        dateGroups: Object.values(dateGroups),
        totalDuties: duties.length
    });
});

module.exports = {
    syncFromSheetWebhook,
    getSheetData
};
