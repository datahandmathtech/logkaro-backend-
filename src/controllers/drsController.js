const DRSDuty = require('../models/DRSDuty');
const Booking = require('../models/Booking');
const asyncHandler = require('express-async-handler');

// @desc    Get DRS duties for a company by date, view, or date range
// @route   GET /api/drs/:companyId
// @access  Private/AdminOrExecutive
const getDRSDuties = asyncHandler(async (req, res) => {
    const { date, from, to, view, search } = req.query;
    let query = { company: req.params.companyId };

    if (view === 'upcoming') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query.date = { $gte: today };
    } else if (view === 'all') {
        // No date restriction
    } else if (from && to) {
        query.date = {
            $gte: new Date(from),
            $lte: new Date(new Date(to).setHours(23, 59, 59, 999))
        };
    } else if (date && date !== 'all') {
        const dateStr = typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0];
        
        // Match ANY time on this calendar date by scanning from UTC midnight to UTC 23:59
        // This avoids missing records if they were saved in local time vs UTC
        const [y, m, d] = dateStr.split('-').map(Number);
        
        // Broaden the search window to cover both UTC and IST bounds for the given date string
        // Start: Previous day 18:30 UTC (which is Midnight IST)
        // End: Current day 23:59 UTC (which is next day 05:29 IST)
        const startOfDay = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
        
        // We will fetch from (Date - 1 day) 18:30:00 to (Date) 23:59:59 UTC to ensure we catch anything falling on this date locally
        const fetchStart = new Date(startOfDay.getTime() - (6 * 60 * 60 * 1000)); // 18:00 UTC previous day
        const fetchEnd = new Date(startOfDay.getTime() + (24 * 60 * 60 * 1000)); // 24:00 UTC current day

        query.date = {
            $gte: fetchStart,
            $lte: fetchEnd
        };
    }

    if (search) {
        query.$or = [
            { clientName: { $regex: search, $options: 'i' } },
            { mobileNumber: { $regex: search, $options: 'i' } },
            { hotel: { $regex: search, $options: 'i' } },
            { duty: { $regex: search, $options: 'i' } },
            { bookingId: { $regex: search, $options: 'i' } },
            { carType: { $regex: search, $options: 'i' } },
            { customCarNumber: { $regex: search, $options: 'i' } },
            { customDriverName: { $regex: search, $options: 'i' } },
            { itinerary: { $regex: search, $options: 'i' } }
        ];
    }

    const duties = await DRSDuty.find(query)
        .populate('driver', 'name mobile')
        .populate('vehicle', 'carNumber model type brand')
        .populate('leadId', 'clientName leadId status totalAmount')
        .populate('bookingRef', 'bookingId clientName totalAmount advancePaid balanceDue bookingStatus')
        .sort({ date: 1, time: 1 });
        
    res.json(duties);
});

// @desc    Create a DRS duty (Direct or Linked from Booking/Lead/Client)
// @route   POST /api/drs
// @access  Private/AdminOrExecutive
const createDRSDuty = asyncHandler(async (req, res) => {
    const {
        company, clientName, mobileNumber, hotel, date, time,
        carType, customCarNumber, driver, customDriverName, vehicle, itinerary,
        revenue, cOut, status, km,
        leadId, bookingId, bookingRef, pickupPoint, duty: dutyText, guestRemarks
    } = req.body;

    const duty = await DRSDuty.create({
        company,
        clientName,
        mobileNumber: mobileNumber || '',
        hotel: hotel || '',
        date: date || new Date(),
        time: time || '09:00 AM',
        carType: carType || 'Sedan',
        customCarNumber: customCarNumber || '',
        driver: driver || null,
        customDriverName: customDriverName || '',
        vehicle: vehicle || null,
        itinerary: itinerary || dutyText || 'City Duty',
        duty: dutyText || itinerary || 'City Duty',
        pickupPoint: pickupPoint || '',
        revenue: Number(revenue) || 0,
        km: km || '',
        cOut: cOut || '',
        status: status || (driver || customDriverName ? 'Assigned' : 'Pending'),
        leadId: leadId || null,
        bookingId: bookingId || null,
        bookingRef: bookingRef || null,
        guestRemarks: guestRemarks || '',
        isDirectBooking: !bookingId && !leadId
    });

    const populated = await DRSDuty.findById(duty._id)
        .populate('driver', 'name mobile')
        .populate('vehicle', 'carNumber model type brand')
        .populate('leadId', 'clientName leadId status')
        .populate('bookingRef', 'bookingId clientName totalAmount advancePaid balanceDue');

    res.status(201).json(populated);
});

// @desc    Update a DRS duty (including assigning driver/vehicle)
// @route   PUT /api/drs/:id
// @access  Private/AdminOrExecutive
const updateDRSDuty = asyncHandler(async (req, res) => {
    const duty = await DRSDuty.findById(req.params.id);

    if (!duty) {
        res.status(404);
        throw new Error('Duty not found');
    }

    const updatedDuty = await DRSDuty.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    )
    .populate('driver', 'name mobile')
    .populate('vehicle', 'carNumber model type brand')
    .populate('leadId', 'clientName leadId status')
    .populate('bookingRef', 'bookingId clientName totalAmount advancePaid balanceDue');

    // Sync back to Booking itinerary ("both ways")
    if (updatedDuty.bookingRef || updatedDuty.bookingId) {
        try {
            const bkg = await Booking.findOne({
                $or: [
                    { _id: updatedDuty.bookingRef },
                    { bookingId: updatedDuty.bookingId }
                ]
            });
            if (bkg && Array.isArray(bkg.itinerary)) {
                let modified = false;
                const dutyDate = updatedDuty.date ? new Date(updatedDuty.date).toISOString().split('T')[0] : '';
                bkg.itinerary = bkg.itinerary.map(item => {
                    const itemDate = item.date ? new Date(item.date).toISOString().split('T')[0] : '';
                    if (item.dayNo === updatedDuty.dayNo || (dutyDate && itemDate === dutyDate)) {
                        modified = true;
                        return {
                            ...item,
                            driverId: updatedDuty.driver?._id || updatedDuty.driver || null,
                            driverName: updatedDuty.driver?.name || updatedDuty.customDriverName || '',
                            driverPhone: updatedDuty.driver?.mobile || updatedDuty.driverMobile || '',
                            vehicleId: updatedDuty.vehicle?._id || updatedDuty.vehicle || null,
                            vehicleNumber: updatedDuty.vehicle?.carNumber || updatedDuty.customCarNumber || ''
                        };
                    }
                    return item;
                });
                if (modified) {
                    await bkg.save();
                }
            }
        } catch (syncErr) {
            console.error('Error syncing DRS update back to Booking itinerary:', syncErr);
        }
    }

    res.json(updatedDuty);
});

// @desc    Delete a DRS duty
// @route   DELETE /api/drs/:id
// @access  Private/AdminOrExecutive
const deleteDRSDuty = asyncHandler(async (req, res) => {
    const duty = await DRSDuty.findById(req.params.id);

    if (!duty) {
        res.status(404);
        throw new Error('Duty not found');
    }

    await duty.deleteOne();
    res.json({ message: 'Duty removed' });
});

// @desc    Get DRS duties by vehicle number and date (for Fuel guest auto-fetch)
// @route   GET /api/drs/:companyId/by-vehicle
// @access  Private/AdminOrExecutive
const getDRSDutiesByVehicle = asyncHandler(async (req, res) => {
    const { vehicleNumber, date } = req.query;

    if (!vehicleNumber || !date) {
        res.status(400);
        throw new Error('vehicleNumber and date are required');
    }

    // Build date range for the specific day (IST-aware)
    const dateStr = typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0];
    const [y, m, d] = dateStr.split('-').map(Number);
    const startOfDay = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
    const istStart = new Date(startOfDay.getTime() - (5.5 * 60 * 60 * 1000));
    const istEnd = new Date(startOfDay.getTime() + (23.99 * 60 * 60 * 1000));

    // Clean vehicle number for regex matching (remove spaces, dashes)
    const cleanNumber = vehicleNumber.replace(/[\s\-]/g, '').toUpperCase();

    // First, try to find a Vehicle document matching this car number
    const Vehicle = require('../models/Vehicle');
    const matchingVehicle = await Vehicle.findOne({
        company: req.params.companyId,
        carNumber: { $regex: cleanNumber, $options: 'i' }
    });

    // Build query: match by customCarNumber string OR vehicle ObjectId
    let vehicleQuery;
    if (matchingVehicle) {
        vehicleQuery = {
            $or: [
                { customCarNumber: { $regex: cleanNumber, $options: 'i' } },
                { vehicle: matchingVehicle._id }
            ]
        };
    } else {
        vehicleQuery = { customCarNumber: { $regex: cleanNumber, $options: 'i' } };
    }

    const duties = await DRSDuty.find({
        company: req.params.companyId,
        date: { $gte: istStart, $lte: istEnd },
        ...vehicleQuery,
        status: { $nin: ['Cancelled', 'No-show'] }
    })
        .populate('driver', 'name mobile')
        .populate('vehicle', 'carNumber model type brand')
        .populate('leadId', 'clientName leadId status totalAmount')
        .populate('bookingRef', 'bookingId clientName totalAmount advancePaid balanceDue bookingStatus')
        .sort({ time: 1 });

    res.json(duties);
});

module.exports = {
    getDRSDuties,
    createDRSDuty,
    updateDRSDuty,
    deleteDRSDuty,
    getDRSDutiesByVehicle
};
