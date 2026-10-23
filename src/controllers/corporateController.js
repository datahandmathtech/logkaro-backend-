const CorporateContract = require('../models/CorporateContract');
const CorporateDailyRegister = require('../models/CorporateDailyRegister');
const CorporateDutySlip = require('../models/CorporateDutySlip');
const CorporateMonthlyStatement = require('../models/CorporateMonthlyStatement');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const { getNextSequence } = require('../models/Sequence');

// ==========================================
// 1. CORPORATE CONTRACT SETUP
// ==========================================

// @desc    Get all corporate contracts for company
// @route   GET /api/corporate/contracts/:companyId
exports.getContracts = async (req, res) => {
    try {
        const companyId = req.params.companyId || req.params.id || req.user?.company;
        const { status } = req.query;

        const query = { company: companyId };
        if (status && status !== 'all') {
            query.status = status;
        }

        const contracts = await CorporateContract.find(query)
            .sort({ createdAt: -1 })
            .populate('createdBy', 'name email');

        res.json({
            success: true,
            count: contracts.length,
            data: contracts
        });
    } catch (err) {
        console.error('Error fetching corporate contracts:', err);
        res.status(500).json({ success: false, message: 'Server error fetching corporate contracts' });
    }
};

// @desc    Get single corporate contract by ID
// @route   GET /api/corporate/contracts/single/:id
exports.getContractById = async (req, res) => {
    try {
        const contract = await CorporateContract.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('defaultVehicles.vehicleId', 'carNumber model make')
            .populate('defaultVehicles.driverId', 'name mobile');

        if (!contract) {
            return res.status(404).json({ success: false, message: 'Corporate contract not found' });
        }

        res.json({
            success: true,
            data: contract
        });
    } catch (err) {
        console.error('Error fetching corporate contract by id:', err);
        res.status(500).json({ success: false, message: 'Server error fetching contract' });
    }
};

// @desc    Create new corporate contract with rate card & default fleet
// @route   POST /api/corporate/contracts/:companyId
exports.createContract = async (req, res) => {
    try {
        const companyId = req.params.companyId || req.params.id || req.body.companyId || req.user?.company;
        const {
            clientName,
            clientCode,
            contactPerson,
            billingAddress,
            gstin,
            contractStartDate,
            contractEndDate,
            billingCycle,
            contractedVehiclesCount,
            regularRateConfig,
            defaultVehicles = [],
            rateCard = [],
            termsAndConditions,
            remarks,
            status = 'Active'
        } = req.body;

        if (!clientName || !contractStartDate || !contractEndDate) {
            return res.status(400).json({
                success: false,
                message: 'Client Name, Contract Start Date, and Contract End Date are required'
            });
        }

        // Generate clientCode if not supplied
        let cCode = clientCode;
        if (!cCode) {
            const shortName = clientName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
            cCode = `CORP-${shortName}-${Date.now().toString().slice(-4)}`;
        }

        // If defaultVehicles is empty, generate blank slots 1 to contractedVehiclesCount
        let vehiclesList = defaultVehicles;
        if (!vehiclesList || vehiclesList.length === 0) {
            vehiclesList = [];
            const count = Number(contractedVehiclesCount) || 0;
            for (let i = 1; i <= count; i++) {
                vehiclesList.push({
                    slotNumber: i,
                    vehicleNumber: '',
                    vehicleModel: '',
                    vehicleId: undefined,
                    driverName: '',
                    driverMobile: '',
                    driverId: undefined,
                    defaultRoute: `Route ${i}`,
                    defaultShift: 'General'
                });
            }
        }

        // Provide standard rate card items if none supplied
        let finalRateCard = rateCard;
        if (!finalRateCard || finalRateCard.length === 0) {
            finalRateCard = [
                {
                    dutyType: 'Airport Pickup/Drop',
                    vehicleCategory: 'Sedan (Dzire/Etios)',
                    baseRate: 1400,
                    includedKm: 40,
                    includedHours: 4,
                    extraKmRate: 14,
                    extraHourRate: 150,
                    driverAllowancePerDay: 0,
                    nightCharge: 250
                },
                {
                    dutyType: 'Railway Station Pickup/Drop',
                    vehicleCategory: 'Sedan (Dzire/Etios)',
                    baseRate: 900,
                    includedKm: 30,
                    includedHours: 3,
                    extraKmRate: 14,
                    extraHourRate: 150,
                    driverAllowancePerDay: 0,
                    nightCharge: 200
                },
                {
                    dutyType: '4 Hours / 40 KM Local Package',
                    vehicleCategory: 'Sedan (Dzire/Etios)',
                    baseRate: 1600,
                    includedKm: 40,
                    includedHours: 4,
                    extraKmRate: 14,
                    extraHourRate: 150,
                    driverAllowancePerDay: 0,
                    nightCharge: 250
                },
                {
                    dutyType: '8 Hours / 80 KM Local Package',
                    vehicleCategory: 'Sedan (Dzire/Etios)',
                    baseRate: 2600,
                    includedKm: 80,
                    includedHours: 8,
                    extraKmRate: 14,
                    extraHourRate: 150,
                    driverAllowancePerDay: 0,
                    nightCharge: 250
                },
                {
                    dutyType: '12 Hours / 120 KM Local Package',
                    vehicleCategory: 'Sedan (Dzire/Etios)',
                    baseRate: 3500,
                    includedKm: 120,
                    includedHours: 12,
                    extraKmRate: 14,
                    extraHourRate: 150,
                    driverAllowancePerDay: 0,
                    nightCharge: 250
                },
                {
                    dutyType: 'Outstation Roundtrip (Min 250 KM/day)',
                    vehicleCategory: 'Sedan (Dzire/Etios)',
                    baseRate: 3500,
                    includedKm: 250,
                    includedHours: 24,
                    extraKmRate: 14,
                    extraHourRate: 0,
                    driverAllowancePerDay: 400,
                    nightCharge: 250
                }
            ];
        }

        const contract = await CorporateContract.create({
            company: companyId,
            clientName,
            clientCode: cCode,
            contactPerson,
            billingAddress,
            gstin,
            contractStartDate,
            contractEndDate,
            billingCycle,
            contractedVehiclesCount: Number(contractedVehiclesCount) || 0,
            regularRateConfig: regularRateConfig || {
                rateType: 'PerVehiclePerDay',
                amount: 0,
                includedHoursPerDay: 0,
                includedKmPerDay: 0,
                extraKmRate: 0,
                extraHourRate: 0,
                billingDaysPerMonth: 26
            },
            defaultVehicles: vehiclesList,
            rateCard: finalRateCard,
            termsAndConditions,
            remarks,
            status,
            createdBy: req.user?._id
        });

        res.status(201).json({
            success: true,
            message: 'Corporate contract created successfully',
            data: contract
        });
    } catch (err) {
        console.error('Error creating corporate contract:', err);
        res.status(500).json({ success: false, message: err.message || 'Server error creating contract' });
    }
};

// @desc    Update corporate contract
// @route   PUT /api/corporate/contracts/:id
exports.updateContract = async (req, res) => {
    try {
        const contract = await CorporateContract.findById(req.params.id);
        if (!contract) {
            return res.status(404).json({ success: false, message: 'Corporate contract not found' });
        }

        const updateFields = [
            'clientName', 'clientCode', 'contactPerson', 'billingAddress', 'gstin',
            'contractStartDate', 'contractEndDate', 'billingCycle', 'status',
            'contractedVehiclesCount', 'regularRateConfig', 'defaultVehicles',
            'rateCard', 'termsAndConditions', 'remarks'
        ];

        updateFields.forEach(field => {
            if (req.body[field] !== undefined) {
                contract[field] = req.body[field];
            }
        });

        await contract.save();

        res.json({
            success: true,
            message: 'Corporate contract updated successfully',
            data: contract
        });
    } catch (err) {
        console.error('Error updating corporate contract:', err);
        res.status(500).json({ success: false, message: err.message || 'Server error updating contract' });
    }
};

// @desc    Delete corporate contract
// @route   DELETE /api/corporate/contracts/:id
exports.deleteContract = async (req, res) => {
    try {
        const contract = await CorporateContract.findById(req.params.id);
        if (!contract) {
            return res.status(404).json({ success: false, message: 'Corporate contract not found' });
        }

        // Clean up all linked daily registers, duty slips, and statements
        await Promise.all([
            CorporateDailyRegister.deleteMany({ contract: req.params.id }),
            CorporateDutySlip.deleteMany({ contract: req.params.id }),
            CorporateMonthlyStatement.deleteMany({ contract: req.params.id }),
            CorporateContract.findByIdAndDelete(req.params.id)
        ]);

        res.json({
            success: true,
            message: 'Corporate contract and associated records deleted successfully'
        });
    } catch (err) {
        console.error('Error deleting corporate contract:', err);
        res.status(500).json({ success: false, message: err.message || 'Server error deleting contract' });
    }
};


// ==========================================
// 2. DAILY STAFF TRANSPORT REGISTER
// ==========================================

// @desc    Get daily transport register for a specific date
// @route   GET /api/corporate/register/:contractId
// @query   date=YYYY-MM-DD
exports.getDailyRegister = async (req, res) => {
    try {
        const { contractId } = req.params;
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ success: false, message: 'Date parameter (YYYY-MM-DD) is required' });
        }

        const contract = await CorporateContract.findById(contractId);
        if (!contract) {
            return res.status(404).json({ success: false, message: 'Corporate contract not found' });
        }

        let records = await CorporateDailyRegister.find({
            contract: contractId,
            date
        }).sort({ slotNumber: 1 });

        // If no records saved yet for this date, provide blank editable slots for contracted fleet
        const contracted = contract.contractedVehiclesCount || 0;
        if (records.length === 0 && contracted > 0) {
            const blankSlots = [];
            const dayRate = contract.regularRateConfig?.amount || 0;
            for (let i = 1; i <= contracted; i++) {
                blankSlots.push({
                    company: contract.company,
                    contract: contract._id,
                    date,
                    slotNumber: i,
                    vehicleNumber: '',
                    vehicleModel: '',
                    driverName: '',
                    driverMobile: '',
                    route: `Route ${i}`,
                    shift: 'General',
                    startKm: 0,
                    endKm: 0,
                    totalKm: 0,
                    status: 'Operated',
                    isBillable: true,
                    dayRateSnapshot: dayRate,
                    totalDayAmount: dayRate
                });
            }
            records = blankSlots;
        }
        let operated = 0;
        let absent = 0;
        let replacement = 0;
        let totalKm = 0;
        let totalDayAmount = 0;

        records.forEach(r => {
            if (r.status === 'Operated') operated += 1;
            else if (r.status === 'Absent') absent += 1;
            else if (r.status === 'Replacement') replacement += 1;

            totalKm += Number(r.totalKm || 0);
            totalDayAmount += Number(r.totalDayAmount || 0);
        });

        const missingEntries = Math.max(0, contracted - records.length);

        res.json({
            success: true,
            date,
            contract: {
                _id: contract._id,
                clientName: contract.clientName,
                contractedVehiclesCount: contracted,
                regularRateConfig: contract.regularRateConfig
            },
            summary: {
                contractedVehicles: contracted,
                recordedEntries: records.length,
                operatedCount: operated,
                absentCount: absent,
                replacementCount: replacement,
                missingEntries,
                totalKm,
                totalDayAmount
            },
            data: records
        });
    } catch (err) {
        console.error('Error fetching daily transport register:', err);
        res.status(500).json({ success: false, message: 'Server error fetching daily transport register' });
    }
};

// @desc    Pre-fill usual contracted fleet (e.g. 20 vehicles) for the selected date
// @route   POST /api/corporate/register/prefill/:contractId
// @body    date=YYYY-MM-DD
exports.prefillDailyRegister = async (req, res) => {
    try {
        const { contractId } = req.params;
        const { date } = req.body;

        if (!date) {
            return res.status(400).json({ success: false, message: 'Date parameter (YYYY-MM-DD) is required' });
        }

        const contract = await CorporateContract.findById(contractId);
        if (!contract) {
            return res.status(404).json({ success: false, message: 'Corporate contract not found' });
        }

        const targetCount = contract.contractedVehiclesCount || 0;
        const baseDayRate = contract.regularRateConfig?.amount ?? 0;

        // Fetch company real fleet vehicles & drivers
        const [realVehicles, realDrivers] = await Promise.all([
            Vehicle.find({
                company: contract.company,
                isOutsideCar: { $ne: true }, // COMPANY FLEET ONLY
                status: { $ne: 'deleted' }
            })
            .populate('currentDriver', '_id name mobile phone')
            .sort({ status: 1, carNumber: 1 })
            .limit(targetCount)
            .lean(),

            User.find({
                company: contract.company,
                role: 'Driver',
                status: 'active'
            })
            .sort({ isFreelancer: 1, name: 1 })
            .limit(targetCount)
            .lean()
        ]);

        for (let i = 1; i <= targetCount; i++) {
            const v = realVehicles[i - 1];
            const drv = v?.currentDriver || realDrivers[i - 1];

            const cleanVehNo = v ? v.carNumber.split('#')[0].trim() : '';
            const vehModel = v?.model || '';
            const vehId = v?._id || undefined;
            const drvName = drv?.name ? drv.name.trim() : '';
            const drvMobile = drv?.mobile || drv?.phone || '';
            const drvId = drv?._id || undefined;

            await CorporateDailyRegister.findOneAndUpdate(
                { contract: contractId, date, slotNumber: i },
                {
                    $set: {
                        company: contract.company,
                        contract: contract._id,
                        date,
                        dateObj: new Date(date),
                        slotNumber: i,
                        vehicleNumber: cleanVehNo,
                        vehicleModel: vehModel,
                        vehicleId: vehId,
                        driverName: drvName,
                        driverMobile: drvMobile,
                        driverId: drvId,
                        shift: 'General',
                        route: `Route ${i}`,
                        status: 'Operated',
                        isBillable: true,
                        dayRateSnapshot: baseDayRate,
                        totalDayAmount: baseDayRate
                    },
                    $setOnInsert: {
                        startKm: 0,
                        endKm: 0,
                        totalKm: 0,
                        markedBy: req.user?._id
                    }
                },
                { upsert: true, new: true }
            );
        }

        // Return updated list
        const updatedRecords = await CorporateDailyRegister.find({
            contract: contractId,
            date
        }).sort({ slotNumber: 1 });

        res.json({
            success: true,
            message: `Pre-filled ${targetCount} fleet vehicles for ${date}`,
            data: updatedRecords
        });
    } catch (err) {
        console.error('Error prefilling daily transport register:', err);
        res.status(500).json({ success: false, message: err.message || 'Server error prefilling register' });
    }
};

// @desc    Clear / reset daily register for date back to blank
// @route   POST /api/corporate/register/clear/:contractId
exports.clearDailyRegister = async (req, res) => {
    try {
        const { contractId } = req.params;
        const { date } = req.body;

        const contract = await CorporateContract.findById(contractId);
        if (!contract) {
            return res.status(404).json({ success: false, message: 'Corporate contract not found' });
        }

        const targetCount = contract.contractedVehiclesCount || 0;
        const baseDayRate = contract.regularRateConfig?.amount ?? 0;

        for (let i = 1; i <= targetCount; i++) {
            await CorporateDailyRegister.findOneAndUpdate(
                { contract: contractId, date, slotNumber: i },
                {
                    $set: {
                        vehicleNumber: '',
                        vehicleModel: '',
                        vehicleId: null,
                        driverName: '',
                        driverMobile: '',
                        driverId: null,
                        startKm: 0,
                        endKm: 0,
                        totalKm: 0,
                        status: 'Operated',
                        isBillable: true,
                        dayRateSnapshot: baseDayRate,
                        totalDayAmount: baseDayRate
                    }
                },
                { upsert: true }
            );
        }

        const updated = await CorporateDailyRegister.find({ contract: contractId, date }).sort({ slotNumber: 1 });
        res.json({
            success: true,
            message: `Reset all ${targetCount} slots to blank for ${date}`,
            data: updated
        });
    } catch (err) {
        console.error('Error clearing daily register:', err);
        res.status(500).json({ success: false, message: 'Server error resetting register' });
    }
};


// @desc    Update single slot in daily transport register
// @route   PUT /api/corporate/register/entry/:id
exports.updateDailyRegisterEntry = async (req, res) => {
    try {
        const entry = await CorporateDailyRegister.findById(req.params.id);
        if (!entry) {
            return res.status(404).json({ success: false, message: 'Register entry not found' });
        }

        const {
            vehicleNumber,
            vehicleModel,
            driverName,
            driverMobile,
            shift,
            route,
            startKm,
            endKm,
            startTime,
            endTime,
            status,
            replacementVehicleNumber,
            replacementVehicleModel,
            replacementDriverName,
            replacementDriverMobile,
            replacementReason,
            remarks
        } = req.body;

        if (vehicleNumber !== undefined) entry.vehicleNumber = vehicleNumber;
        if (vehicleModel !== undefined) entry.vehicleModel = vehicleModel;
        if (driverName !== undefined) entry.driverName = driverName;
        if (driverMobile !== undefined) entry.driverMobile = driverMobile;
        if (shift !== undefined) entry.shift = shift;
        if (route !== undefined) entry.route = route;
        if (remarks !== undefined) entry.remarks = remarks;

        if (startKm !== undefined) entry.startKm = Number(startKm) || 0;
        if (endKm !== undefined) entry.endKm = Number(endKm) || 0;
        entry.totalKm = Math.max(0, (entry.endKm || 0) - (entry.startKm || 0));

        if (startTime !== undefined) entry.startTime = startTime;
        if (endTime !== undefined) entry.endTime = endTime;

        if (status !== undefined) {
            entry.status = status;
            if (status === 'Absent') {
                entry.isBillable = false;
                entry.totalDayAmount = 0;
            } else {
                entry.isBillable = true;
                entry.totalDayAmount = entry.dayRateSnapshot || 0;
            }
        }

        if (entry.status === 'Replacement') {
            entry.replacementVehicleNumber = replacementVehicleNumber || '';
            entry.replacementVehicleModel = replacementVehicleModel || '';
            entry.replacementDriverName = replacementDriverName || '';
            entry.replacementDriverMobile = replacementDriverMobile || '';
            entry.replacementReason = replacementReason || '';
        } else {
            entry.replacementVehicleNumber = '';
            entry.replacementVehicleModel = '';
            entry.replacementDriverName = '';
            entry.replacementDriverMobile = '';
            entry.replacementReason = '';
        }

        entry.markedBy = req.user?._id;
        await entry.save();

        res.json({
            success: true,
            message: 'Register entry updated',
            data: entry
        });
    } catch (err) {
        console.error('Error updating daily register entry:', err);
        res.status(500).json({ success: false, message: 'Server error updating register entry' });
    }
};

// @desc    Bulk save/update daily transport register for an entire day
// @route   POST /api/corporate/register/bulk-save/:contractId
exports.bulkSaveDailyRegister = async (req, res) => {
    try {
        const { contractId } = req.params;
        const { date, entries } = req.body;

        if (!date || !Array.isArray(entries)) {
            return res.status(400).json({ success: false, message: 'Date and entries array are required' });
        }

        const contract = await CorporateContract.findById(contractId);
        if (!contract) {
            return res.status(404).json({ success: false, message: 'Corporate contract not found' });
        }

        const baseDayRate = contract.regularRateConfig?.amount ?? 0;

        for (const item of entries) {
            const startKm = Number(item.startKm) || 0;
            const endKm = Number(item.endKm) || 0;
            const totalKm = Math.max(0, endKm - startKm);
            const status = item.status || 'Operated';
            const isBillable = status !== 'Absent';
            const dayAmount = isBillable ? (Number(item.dayRateSnapshot) || baseDayRate) : 0;

            await CorporateDailyRegister.findOneAndUpdate(
                {
                    contract: contractId,
                    date,
                    slotNumber: item.slotNumber
                },
                {
                    $set: {
                        company: contract.company,
                        dateObj: new Date(date),
                        vehicleNumber: item.vehicleNumber || `Vehicle ${item.slotNumber}`,
                        vehicleModel: item.vehicleModel || 'Sedan',
                        driverName: item.driverName || `Driver ${item.slotNumber}`,
                        driverMobile: item.driverMobile || '',
                        shift: item.shift || 'General',
                        route: item.route || '',
                        startKm,
                        endKm,
                        totalKm,
                        startTime: item.startTime || '',
                        endTime: item.endTime || '',
                        status,
                        replacementVehicleNumber: status === 'Replacement' ? (item.replacementVehicleNumber || '') : '',
                        replacementVehicleModel: status === 'Replacement' ? (item.replacementVehicleModel || '') : '',
                        replacementDriverName: status === 'Replacement' ? (item.replacementDriverName || '') : '',
                        replacementDriverMobile: status === 'Replacement' ? (item.replacementDriverMobile || '') : '',
                        replacementReason: status === 'Replacement' ? (item.replacementReason || '') : '',
                        isBillable,
                        dayRateSnapshot: Number(item.dayRateSnapshot) || baseDayRate,
                        totalDayAmount: dayAmount,
                        remarks: item.remarks || '',
                        markedBy: req.user?._id
                    }
                },
                { upsert: true, new: true }
            );
        }

        const updated = await CorporateDailyRegister.find({ contract: contractId, date }).sort({ slotNumber: 1 });

        res.json({
            success: true,
            message: `Saved ${entries.length} entries for ${date}`,
            data: updated
        });
    } catch (err) {
        console.error('Error bulk saving daily register:', err);
        res.status(500).json({ success: false, message: err.message || 'Server error bulk saving register' });
    }
};

// @desc    Get month-wise summary of regular transport
// @route   GET /api/corporate/register/month-summary/:contractId
// @query   year=2026&month=10
exports.getMonthRegisterSummary = async (req, res) => {
    try {
        const { contractId } = req.params;
        const year = Number(req.query.year) || new Date().getFullYear();
        const month = Number(req.query.month) || (new Date().getMonth() + 1);

        const contract = await CorporateContract.findById(contractId);
        if (!contract) {
            return res.status(404).json({ success: false, message: 'Corporate contract not found' });
        }

        const daysInMonth = new Date(year, month, 0).getDate();
        const monthStr = String(month).padStart(2, '0');
        const startDateStr = `${year}-${monthStr}-01`;
        const endDateStr = `${year}-${monthStr}-${String(daysInMonth).padStart(2, '0')}`;

        const records = await CorporateDailyRegister.find({
            contract: contractId,
            date: { $gte: startDateStr, $lte: endDateStr }
        }).sort({ date: 1, slotNumber: 1 });

        const contractedPerDay = contract.contractedVehiclesCount || 20;
        const totalContractedVehicleDays = contractedPerDay * daysInMonth;

        // Group by date
        const dayMap = {};
        for (let d = 1; d <= daysInMonth; d++) {
            const dStr = `${year}-${monthStr}-${String(d).padStart(2, '0')}`;
            dayMap[dStr] = {
                date: dStr,
                dayNumber: d,
                contracted: contractedPerDay,
                recorded: 0,
                operated: 0,
                absent: 0,
                replacement: 0,
                missing: contractedPerDay,
                totalKm: 0,
                amount: 0
            };
        }

        let totalOperatedDays = 0;
        let totalAbsentDays = 0;
        let totalReplacementDays = 0;
        let grandTotalKm = 0;
        let grandTotalAmount = 0;

        records.forEach(r => {
            if (dayMap[r.date]) {
                const day = dayMap[r.date];
                day.recorded += 1;
                day.missing = Math.max(0, contractedPerDay - day.recorded);

                if (r.status === 'Operated') {
                    day.operated += 1;
                    totalOperatedDays += 1;
                } else if (r.status === 'Absent') {
                    day.absent += 1;
                    totalAbsentDays += 1;
                } else if (r.status === 'Replacement') {
                    day.replacement += 1;
                    totalReplacementDays += 1;
                    totalOperatedDays += 1; // Replacement is operated vehicle
                }

                day.totalKm += Number(r.totalKm || 0);
                day.amount += Number(r.totalDayAmount || 0);

                grandTotalKm += Number(r.totalKm || 0);
                grandTotalAmount += Number(r.totalDayAmount || 0);
            }
        });

        res.json({
            success: true,
            year,
            month,
            daysInMonth,
            contract: {
                _id: contract._id,
                clientName: contract.clientName,
                contractedVehiclesCount: contractedPerDay,
                regularRateConfig: contract.regularRateConfig
            },
            summary: {
                totalCalendarDays: daysInMonth,
                totalContractedVehicleDays,
                actuallyOperatedVehicleDays: totalOperatedDays,
                absentVehicleDays: totalAbsentDays,
                replacementVehicleDays: totalReplacementDays,
                missingEntriesCount: Math.max(0, totalContractedVehicleDays - records.length),
                grandTotalKm,
                grandTotalRegularAmount: grandTotalAmount
            },
            dayWiseBreakdown: Object.values(dayMap)
        });
    } catch (err) {
        console.error('Error fetching month register summary:', err);
        res.status(500).json({ success: false, message: 'Server error fetching month register summary' });
    }
};


// ==========================================
// 3. ON-CALL BOOKINGS & DUTY SLIPS
// ==========================================

// Helper: Calculate automatic charges based on rate card
const calculateDutySlipCharges = (dutySlip, contract) => {
    const rateCard = contract.rateCard || [];
    const matchedRate = rateCard.find(r => r.dutyType.toLowerCase().trim() === dutySlip.dutyType.toLowerCase().trim()) || {};

    const baseRate = Number(dutySlip.charges?.baseRate !== undefined ? dutySlip.charges.baseRate : (matchedRate.baseRate || 0));
    const includedKm = Number(matchedRate.includedKm || 0);
    const includedHours = Number(matchedRate.includedHours || 0);
    const extraKmRate = Number(matchedRate.extraKmRate || 0);
    const extraHourRate = Number(matchedRate.extraHourRate || 0);

    const totalKm = Number(dutySlip.execution?.totalKm || 0);
    const totalHours = Number(dutySlip.execution?.totalHours || 0);

    const extraKm = Math.max(0, totalKm - includedKm);
    const extraKmAmount = extraKm * extraKmRate;

    const extraHours = Math.max(0, totalHours - includedHours);
    const extraHoursAmount = extraHours * extraHourRate;

    const tollAmount = Number(dutySlip.charges?.tollAmount || 0);
    const parkingAmount = Number(dutySlip.charges?.parkingAmount || 0);
    const nightCharge = Number(dutySlip.charges?.nightCharge || 0);
    const driverAllowance = Number(dutySlip.charges?.driverAllowance || 0);
    const otherCharges = Number(dutySlip.charges?.otherCharges || 0);
    const discountAmount = Number(dutySlip.charges?.discountAmount || 0);

    const subtotal = baseRate + extraKmAmount + extraHoursAmount + tollAmount + parkingAmount + nightCharge + driverAllowance + otherCharges;
    const taxableAmount = Math.max(0, subtotal - discountAmount);

    return {
        baseRate,
        includedKm,
        includedHours,
        extraKm,
        extraKmRate,
        extraKmAmount,
        extraHours,
        extraHourRate,
        extraHoursAmount,
        driverAllowance,
        nightCharge,
        tollAmount,
        parkingAmount,
        otherCharges,
        discountAmount,
        discountReason: dutySlip.charges?.discountReason || '',
        subtotal,
        taxableAmount
    };
};

// @desc    Get all on-call duty slips
// @route   GET /api/corporate/duty-slips/:contractId
exports.getDutySlips = async (req, res) => {
    try {
        const contractId = req.params.contractId || req.params.id;
        const { status, month, year, search } = req.query;

        const query = { contract: contractId };

        if (status && status !== 'all') {
            query.status = status;
        }

        if (req.query.date) {
            query.dutyDate = req.query.date;
        } else if (req.query.startDate && req.query.endDate) {
            query.dutyDate = {
                $gte: req.query.startDate,
                $lte: req.query.endDate
            };
        } else if (year && month) {
            const mStr = String(month).padStart(2, '0');
            const daysInMonth = new Date(Number(year), Number(month), 0).getDate();
            query.dutyDate = {
                $gte: `${year}-${mStr}-01`,
                $lte: `${year}-${mStr}-${String(daysInMonth).padStart(2, '0')}`
            };
        }

        if (search) {
            query.$or = [
                { dutySlipNumber: { $regex: search, $options: 'i' } },
                { requestReference: { $regex: search, $options: 'i' } },
                { 'guestDetails.name': { $regex: search, $options: 'i' } },
                { vehicleNumber: { $regex: search, $options: 'i' } },
                { driverName: { $regex: search, $options: 'i' } }
            ];
        }

        const dutySlips = await CorporateDutySlip.find(query)
            .sort({ dutyDate: -1, createdAt: -1 })
            .populate('createdBy', 'name email');

        res.json({
            success: true,
            count: dutySlips.length,
            data: dutySlips
        });
    } catch (err) {
        console.error('Error fetching on-call duty slips:', err);
        res.status(500).json({ success: false, message: 'Server error fetching duty slips' });
    }
};

// @desc    Get single duty slip by ID
// @route   GET /api/corporate/duty-slips/single/:id
exports.getDutySlipById = async (req, res) => {
    try {
        const slip = await CorporateDutySlip.findById(req.params.id)
            .populate('contract')
            .populate('vehicleId')
            .populate('driverId');

        if (!slip) {
            return res.status(404).json({ success: false, message: 'Duty slip not found' });
        }

        res.json({
            success: true,
            data: slip
        });
    } catch (err) {
        console.error('Error fetching duty slip by id:', err);
        res.status(500).json({ success: false, message: 'Server error fetching duty slip' });
    }
};

// @desc    Create new on-call request & duty slip
// @route   POST /api/corporate/duty-slips/:contractId
exports.createDutySlip = async (req, res) => {
    try {
        const contractId = req.params.contractId || req.params.id || req.body.contractId;
        const contract = await CorporateContract.findById(contractId);
        if (!contract) {
            return res.status(404).json({ success: false, message: 'Corporate contract not found' });
        }

        const {
            requestReference,
            dutyDate,
            dutyTime = '09:00',
            dutyType,
            vehicleCategory = 'Sedan',
            vehicleNumber,
            vehicleModel = '',
            vehicleId,
            driverName,
            driverMobile = '',
            driverId,
            guestDetails = {},
            pickupLocation,
            dropLocation,
            reportingAddress = '',
            remarks = ''
        } = req.body;

        if (!dutyDate || !dutyType || !pickupLocation || !dropLocation || !vehicleNumber || !driverName) {
            return res.status(400).json({
                success: false,
                message: 'Date, Duty Type, Pickup, Drop, Vehicle Number, and Driver Name are required'
            });
        }

        // Generate clean sequential duty slip number: DS-2026-0001
        const dutySlipNumber = await getNextSequence('DS', 4);

        // Calculate initial base rate from contract rate card
        const rateCard = contract.rateCard || [];
        const matchedRate = rateCard.find(r => r.dutyType.toLowerCase().trim() === dutyType.toLowerCase().trim()) || {};
        const baseRate = matchedRate.baseRate || 0;

        const dutyDateTime = new Date(`${dutyDate}T${dutyTime}:00`);

        const newSlip = await CorporateDutySlip.create({
            company: contract.company,
            contract: contract._id,
            dutySlipNumber,
            requestReference,
            dutyDate,
            dutyDateTime,
            dutyType,
            vehicleCategory,
            vehicleNumber,
            vehicleModel,
            vehicleId,
            driverName,
            driverMobile,
            driverId,
            guestDetails,
            pickupLocation,
            dropLocation,
            reportingAddress,
            status: 'Requested',
            execution: {
                openingKm: 0,
                closingKm: 0,
                totalKm: 0,
                totalHours: 0
            },
            charges: {
                baseRate,
                includedKm: matchedRate.includedKm || 0,
                includedHours: matchedRate.includedHours || 0,
                extraKm: 0,
                extraKmRate: matchedRate.extraKmRate || 0,
                extraKmAmount: 0,
                extraHours: 0,
                extraHourRate: matchedRate.extraHourRate || 0,
                extraHoursAmount: 0,
                driverAllowance: 0,
                nightCharge: 0,
                tollAmount: 0,
                parkingAmount: 0,
                otherCharges: 0,
                discountAmount: 0,
                subtotal: baseRate,
                taxableAmount: baseRate
            },
            approval: {
                approvalStatus: 'Pending'
            },
            remarks,
            createdBy: req.user?._id
        });

        res.status(201).json({
            success: true,
            message: `Duty Slip ${dutySlipNumber} created successfully`,
            data: newSlip
        });
    } catch (err) {
        console.error('Error creating on-call duty slip:', err);
        res.status(500).json({ success: false, message: err.message || 'Server error creating duty slip' });
    }
};

// @desc    Update duty slip (record execution KM/times, calculate charges, change status)
// @route   PUT /api/corporate/duty-slips/:id
exports.updateDutySlip = async (req, res) => {
    try {
        const slip = await CorporateDutySlip.findById(req.params.id);
        if (!slip) {
            return res.status(404).json({ success: false, message: 'Duty slip not found' });
        }

        const contract = await CorporateContract.findById(slip.contract);
        if (!contract) {
            return res.status(404).json({ success: false, message: 'Associated corporate contract not found' });
        }

        const {
            requestReference,
            dutyDate,
            dutyType,
            vehicleCategory,
            vehicleNumber,
            vehicleModel,
            driverName,
            driverMobile,
            guestDetails,
            pickupLocation,
            dropLocation,
            reportingAddress,
            execution,
            charges,
            status,
            remarks
        } = req.body;

        if (requestReference !== undefined) slip.requestReference = requestReference;
        if (dutyDate !== undefined) slip.dutyDate = dutyDate;
        if (dutyType !== undefined) slip.dutyType = dutyType;
        if (vehicleCategory !== undefined) slip.vehicleCategory = vehicleCategory;
        if (vehicleNumber !== undefined) slip.vehicleNumber = vehicleNumber;
        if (vehicleModel !== undefined) slip.vehicleModel = vehicleModel;
        if (driverName !== undefined) slip.driverName = driverName;
        if (driverMobile !== undefined) slip.driverMobile = driverMobile;
        if (guestDetails !== undefined) slip.guestDetails = { ...slip.guestDetails, ...guestDetails };
        if (pickupLocation !== undefined) slip.pickupLocation = pickupLocation;
        if (dropLocation !== undefined) slip.dropLocation = dropLocation;
        if (reportingAddress !== undefined) slip.reportingAddress = reportingAddress;
        if (remarks !== undefined) slip.remarks = remarks;

        // Update execution details if provided
        if (execution) {
            const openingKm = Number(execution.openingKm) || 0;
            const closingKm = Number(execution.closingKm) || 0;
            const totalKm = execution.totalKm !== undefined ? Number(execution.totalKm) : Math.max(0, closingKm - openingKm);

            let totalHours = Number(execution.totalHours) || 0;
            if (execution.startDateTime && execution.endDateTime) {
                const diffMs = new Date(execution.endDateTime) - new Date(execution.startDateTime);
                if (diffMs > 0) {
                    totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
                }
            }

            slip.execution = {
                ...slip.execution,
                ...execution,
                openingKm,
                closingKm,
                totalKm,
                totalHours
            };
        }

        // Merge incoming charges
        if (charges) {
            slip.charges = {
                ...slip.charges,
                ...charges
            };
        }

        // Auto-recalculate charges using contract rate card
        slip.charges = calculateDutySlipCharges(slip, contract);

        // Update status if passed
        if (status) {
            slip.status = status;
        }

        await slip.save();

        res.json({
            success: true,
            message: 'Duty slip updated successfully',
            data: slip
        });
    } catch (err) {
        console.error('Error updating duty slip:', err);
        res.status(500).json({ success: false, message: err.message || 'Server error updating duty slip' });
    }
};

// @desc    Corporate sign-off / approval of duty slip
// @route   POST /api/corporate/duty-slips/:id/approval
exports.approveDutySlip = async (req, res) => {
    try {
        const { approvedBy, designation, approvalStatus = 'Approved', approvalRemarks = '', signedSlipUrl = '' } = req.body;

        const slip = await CorporateDutySlip.findById(req.params.id);
        if (!slip) {
            return res.status(404).json({ success: false, message: 'Duty slip not found' });
        }

        if (!approvedBy && approvalStatus === 'Approved') {
            return res.status(400).json({ success: false, message: 'Signee / Approver Name is required for approval' });
        }

        slip.approval = {
            approvedBy: approvedBy || slip.approval?.approvedBy || '',
            approvalDate: new Date(),
            designation: designation || slip.approval?.designation || '',
            approvalStatus,
            approvalRemarks,
            signedSlipUrl: signedSlipUrl || slip.approval?.signedSlipUrl || ''
        };

        if (approvalStatus === 'Approved') {
            slip.status = 'Approved';
        } else if (approvalStatus === 'Rejected') {
            slip.status = 'Rejected';
        }

        await slip.save();

        res.json({
            success: true,
            message: `Duty slip status set to ${approvalStatus}`,
            data: slip
        });
    } catch (err) {
        console.error('Error approving duty slip:', err);
        res.status(500).json({ success: false, message: 'Server error processing approval' });
    }
};

// @desc    Delete duty slip
// @route   DELETE /api/corporate/duty-slips/:id
exports.deleteDutySlip = async (req, res) => {
    try {
        const slip = await CorporateDutySlip.findById(req.params.id);
        if (!slip) {
            return res.status(404).json({ success: false, message: 'Duty slip not found' });
        }

        if (slip.status === 'Approved') {
            return res.status(400).json({ success: false, message: 'Approved duty slips cannot be deleted. Change approval status first.' });
        }

        await CorporateDutySlip.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Duty slip deleted successfully'
        });
    } catch (err) {
        console.error('Error deleting duty slip:', err);
        res.status(500).json({ success: false, message: 'Server error deleting duty slip' });
    }
};


// ==========================================
// 4. MONTHLY BILL FINALISATION & STATEMENT
// ==========================================

// @desc    Get real-time reconciliation and statement preview for Client + Month
// @route   GET /api/corporate/statement/preview/:contractId
// @query   year=2026&month=10
exports.getMonthlyStatementPreview = async (req, res) => {
    try {
        const { contractId } = req.params;
        const year = Number(req.query.year) || new Date().getFullYear();
        const month = Number(req.query.month) || (new Date().getMonth() + 1);

        const contract = await CorporateContract.findById(contractId);
        if (!contract) {
            return res.status(404).json({ success: false, message: 'Corporate contract not found' });
        }

        const daysInMonth = new Date(year, month, 0).getDate();
        const monthStr = String(month).padStart(2, '0');
        const startDateStr = `${year}-${monthStr}-01`;
        const endDateStr = `${year}-${monthStr}-${String(daysInMonth).padStart(2, '0')}`;

        // 1. Fetch Regular Transport Records for month
        const regularRecords = await CorporateDailyRegister.find({
            contract: contractId,
            date: { $gte: startDateStr, $lte: endDateStr }
        }).sort({ date: 1, slotNumber: 1 });

        const contractedPerDay = contract.contractedVehiclesCount || 20;
        const totalContractedVehicleDays = contractedPerDay * daysInMonth;

        let operatedDays = 0;
        let absentDays = 0;
        let replacementDays = 0;
        let regularTotalAmount = 0;
        let regularTotalKm = 0;

        regularRecords.forEach(r => {
            if (r.status === 'Operated') operatedDays += 1;
            else if (r.status === 'Absent') absentDays += 1;
            else if (r.status === 'Replacement') replacementDays += 1;

            if (r.isBillable) {
                regularTotalAmount += Number(r.totalDayAmount || 0);
            }
            regularTotalKm += Number(r.totalKm || 0);
        });

        // 2. Fetch On-call Duty Slips for month
        const dutySlips = await CorporateDutySlip.find({
            contract: contractId,
            dutyDate: { $gte: startDateStr, $lte: endDateStr }
        }).sort({ dutyDate: 1, dutySlipNumber: 1 });

        let approvedDutyCount = 0;
        let pendingApprovalCount = 0;
        let rejectedDutyCount = 0;
        let onCallBaseTotal = 0;
        let onCallExtraKmTotal = 0;
        let onCallExtraHoursTotal = 0;
        let onCallTollParkingTotal = 0;
        let onCallApprovedAmount = 0;

        const dutySlipWarnings = [];

        dutySlips.forEach(slip => {
            if (slip.status === 'Approved') {
                approvedDutyCount += 1;
                onCallBaseTotal += Number(slip.charges?.baseRate || 0);
                onCallExtraKmTotal += Number(slip.charges?.extraKmAmount || 0);
                onCallExtraHoursTotal += Number(slip.charges?.extraHoursAmount || 0);
                onCallTollParkingTotal += (Number(slip.charges?.tollAmount || 0) + Number(slip.charges?.parkingAmount || 0));
                onCallApprovedAmount += Number(slip.charges?.taxableAmount || 0);
            } else if (slip.status === 'Rejected') {
                rejectedDutyCount += 1;
            } else {
                pendingApprovalCount += 1;
                dutySlipWarnings.push({
                    dutySlipNumber: slip.dutySlipNumber,
                    type: 'PENDING_APPROVAL',
                    message: `Duty slip ${slip.dutySlipNumber} is in '${slip.status}' state and not yet approved.`
                });
            }

            // Missing KM or timing check
            if (!slip.execution?.closingKm || slip.execution?.closingKm <= 0) {
                dutySlipWarnings.push({
                    dutySlipNumber: slip.dutySlipNumber,
                    type: 'MISSING_KM',
                    message: `Duty slip ${slip.dutySlipNumber} has no closing KM recorded.`
                });
            }
        });

        // 3. Check existing locked statement
        const existingStmt = await CorporateMonthlyStatement.findOne({
            contract: contractId,
            year,
            month
        });

        const grossTaxable = regularTotalAmount + onCallApprovedAmount;
        const gstRate = 5;
        const gstAmount = Math.round(grossTaxable * (gstRate / 100));
        const netInvoiceAmount = grossTaxable + gstAmount;

        res.json({
            success: true,
            year,
            month,
            billingPeriod: {
                startDate: startDateStr,
                endDate: endDateStr,
                daysInMonth
            },
            contract: {
                _id: contract._id,
                clientName: contract.clientName,
                clientCode: contract.clientCode,
                gstin: contract.gstin,
                billingAddress: contract.billingAddress,
                contactPerson: contract.contactPerson,
                contractedVehiclesCount: contractedPerDay,
                regularRateConfig: contract.regularRateConfig
            },
            sectionA_regularTransport: {
                contractedVehiclesPerDay: contractedPerDay,
                totalCalendarDays: daysInMonth,
                totalContractedVehicleDays,
                operatedVehicleDays: operatedDays,
                replacementVehicleDays: replacementDays,
                absentVehicleDays: absentDays,
                missingEntriesCount: Math.max(0, totalContractedVehicleDays - regularRecords.length),
                totalKm: regularTotalKm,
                ratePerDay: contract.regularRateConfig?.amount ?? 0,
                totalRegularAmount: regularTotalAmount,
                recordsCount: regularRecords.length
            },
            sectionB_onCallDuties: {
                totalDutiesCount: dutySlips.length,
                approvedDutiesCount: approvedDutyCount,
                pendingApprovalCount,
                rejectedDutyCount,
                totalBaseAmount: onCallBaseTotal,
                totalExtraKmAmount: onCallExtraKmTotal,
                totalExtraHoursAmount: onCallExtraHoursTotal,
                totalTollParking: onCallTollParkingTotal,
                totalApprovedOnCallAmount: onCallApprovedAmount,
                duties: dutySlips
            },
            reconciliation: {
                regularCharges: regularTotalAmount,
                approvedOnCallCharges: onCallApprovedAmount,
                grossAmount: grossTaxable,
                adjustments: existingStmt?.adjustments || 0,
                adjustmentReason: existingStmt?.adjustmentReason || '',
                taxableValue: (existingStmt?.taxableAmount !== undefined) ? existingStmt.taxableAmount : grossTaxable,
                gstRate,
                gstAmount,
                netPayable: netInvoiceAmount
            },
            warnings: dutySlipWarnings,
            statementRecord: existingStmt || null,
            isLocked: existingStmt?.isLocked || false
        });
    } catch (err) {
        console.error('Error generating statement preview:', err);
        res.status(500).json({ success: false, message: 'Server error generating monthly statement preview' });
    }
};

// @desc    Finalise / Lock Monthly Statement
// @route   POST /api/corporate/statement/lock/:contractId
exports.lockMonthlyStatement = async (req, res) => {
    try {
        const { contractId } = req.params;
        const { year, month, adjustments = 0, adjustmentReason = '', notes = '' } = req.body;

        if (!year || !month) {
            return res.status(400).json({ success: false, message: 'Year and month are required' });
        }

        const contract = await CorporateContract.findById(contractId);
        if (!contract) {
            return res.status(404).json({ success: false, message: 'Corporate contract not found' });
        }

        const daysInMonth = new Date(year, month, 0).getDate();
        const monthStr = String(month).padStart(2, '0');
        const startDateStr = `${year}-${monthStr}-01`;
        const endDateStr = `${year}-${monthStr}-${String(daysInMonth).padStart(2, '0')}`;

        // Compute figures
        const regularRecords = await CorporateDailyRegister.find({
            contract: contractId,
            date: { $gte: startDateStr, $lte: endDateStr }
        });

        let operatedDays = 0;
        let absentDays = 0;
        let replacementDays = 0;
        let regularTotalAmount = 0;

        regularRecords.forEach(r => {
            if (r.status === 'Operated') operatedDays += 1;
            else if (r.status === 'Absent') absentDays += 1;
            else if (r.status === 'Replacement') replacementDays += 1;

            if (r.isBillable) regularTotalAmount += Number(r.totalDayAmount || 0);
        });

        const dutySlips = await CorporateDutySlip.find({
            contract: contractId,
            dutyDate: { $gte: startDateStr, $lte: endDateStr }
        });

        let approvedDutyCount = 0;
        let pendingApprovalCount = 0;
        let onCallApprovedAmount = 0;
        let onCallBaseTotal = 0;
        let onCallExtraKmTotal = 0;
        let onCallExtraHoursTotal = 0;
        let onCallTollParkingTotal = 0;

        dutySlips.forEach(slip => {
            if (slip.status === 'Approved') {
                approvedDutyCount += 1;
                onCallApprovedAmount += Number(slip.charges?.taxableAmount || 0);
                onCallBaseTotal += Number(slip.charges?.baseRate || 0);
                onCallExtraKmTotal += Number(slip.charges?.extraKmAmount || 0);
                onCallExtraHoursTotal += Number(slip.charges?.extraHoursAmount || 0);
                onCallTollParkingTotal += (Number(slip.charges?.tollAmount || 0) + Number(slip.charges?.parkingAmount || 0));
            } else {
                pendingApprovalCount += 1;
            }
        });

        const grossAmount = regularTotalAmount + onCallApprovedAmount;
        const taxableAmount = Math.max(0, grossAmount - Number(adjustments || 0));
        const gstRate = 5;
        const gstAmount = Math.round(taxableAmount * (gstRate / 100));
        const totalInvoiceAmount = taxableAmount + gstAmount;

        const statementNumber = `CORP-STMT-${contract.clientCode || 'EXP'}-${year}-${monthStr}`;

        const stmt = await CorporateMonthlyStatement.findOneAndUpdate(
            {
                contract: contractId,
                year,
                month
            },
            {
                $set: {
                    company: contract.company,
                    clientName: contract.clientName,
                    statementNumber,
                    billingPeriod: {
                        startDate: startDateStr,
                        endDate: endDateStr
                    },
                    regularTransportSummary: {
                        contractedVehiclesPerDay: contract.contractedVehiclesCount || 0,
                        totalCalendarDays: daysInMonth,
                        totalContractedVehicleDays: (contract.contractedVehiclesCount || 0) * daysInMonth,
                        operatedVehicleDays: operatedDays,
                        absentVehicleDays: absentDays,
                        replacementVehicleDays: replacementDays,
                        ratePerVehicleDay: contract.regularRateConfig?.amount ?? 0,
                        totalRegularAmount: regularTotalAmount,
                        totalRegularSectionAmount: regularTotalAmount
                    },
                    onCallDutiesSummary: {
                        totalDutiesCount: dutySlips.length,
                        approvedDutiesCount: approvedDutyCount,
                        pendingApprovalCount,
                        totalBaseAmount: onCallBaseTotal,
                        totalExtraKmAmount: onCallExtraKmTotal,
                        totalExtraHoursAmount: onCallExtraHoursTotal,
                        totalTollParking: onCallTollParkingTotal,
                        totalOnCallAmount: onCallApprovedAmount
                    },
                    grossAmount,
                    adjustments: Number(adjustments) || 0,
                    adjustmentReason,
                    taxableAmount,
                    gstRate,
                    gstAmount,
                    totalInvoiceAmount,
                    status: 'Locked',
                    isLocked: true,
                    lockedAt: new Date(),
                    lockedBy: req.user?._id,
                    remarks: notes
                }
            },
            { upsert: true, new: true }
        );

        res.json({
            success: true,
            message: `Monthly statement ${statementNumber} locked successfully`,
            data: stmt
        });
    } catch (err) {
        console.error('Error locking monthly statement:', err);
        res.status(500).json({ success: false, message: err.message || 'Server error locking monthly statement' });
    }
};

// @desc    Unlock monthly statement for modifications
// @route   POST /api/corporate/statement/unlock/:contractId
exports.unlockMonthlyStatement = async (req, res) => {
    try {
        const { contractId } = req.params;
        const { year, month } = req.body;

        const stmt = await CorporateMonthlyStatement.findOne({ contract: contractId, year, month });
        if (!stmt) {
            return res.status(404).json({ success: false, message: 'Monthly statement record not found' });
        }

        stmt.isLocked = false;
        stmt.status = 'Draft';
        await stmt.save();

        res.json({
            success: true,
            message: 'Monthly statement unlocked for adjustments',
            data: stmt
        });
    } catch (err) {
        console.error('Error unlocking statement:', err);
        res.status(500).json({ success: false, message: 'Server error unlocking statement' });
    }
};

// @desc    Get real fleet vehicles & drivers for corporate selection
// @route   GET /api/corporate/fleet-options/:companyId
exports.getFleetOptions = async (req, res) => {
    try {
        const companyId = req.params.companyId || req.params.id || req.user?.company;
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'Company ID is required' });
        }

        const [vehicles, drivers] = await Promise.all([
            Vehicle.find({
                company: companyId,
                isOutsideCar: { $ne: true }, // STRICT COMPANY FLEET ONLY
                status: { $ne: 'deleted' }
            })
            .populate('currentDriver', '_id name mobile phone')
            .sort({ status: 1, carNumber: 1 })
            .lean(),

            User.find({
                company: companyId,
                role: 'Driver',
                status: 'active' // ACTIVE COMPANY DRIVERS ONLY
            })
            .select('_id name mobile phone status driverType isFreelancer assignedVehicle')
            .sort({ isFreelancer: 1, name: 1 })
            .lean()
        ]);

        const cleanedVehicles = (vehicles || []).map(v => {
            const rawNumber = v.carNumber || '';
            const cleanNumber = rawNumber.split('#')[0].trim();
            const drv = v.currentDriver;
            return {
                _id: v._id,
                carNumber: cleanNumber,
                rawNumber: rawNumber,
                model: v.model || '',
                make: v.make || '',
                status: v.status || 'active',
                defaultDriverName: drv?.name ? drv.name.trim() : '',
                defaultDriverMobile: drv?.mobile ? drv.mobile.trim() : (drv?.phone || ''),
                defaultDriverId: drv?._id || null,
                label: `${cleanNumber}${v.model ? ` (${v.model})` : ''}${drv?.name ? ` • 👤 ${drv.name.trim()}` : ''}`
            };
        });

        const cleanedDrivers = (drivers || []).map(d => {
            const cleanName = (d.name || '').trim();
            const cleanMobile = (d.mobile || d.phone || '').trim();
            return {
                _id: d._id,
                name: cleanName,
                mobile: cleanMobile,
                isFreelancer: !!d.isFreelancer,
                label: `${cleanName}${cleanMobile ? ` (${cleanMobile})` : ''}${d.isFreelancer ? ' [Freelancer]' : ' [Company Driver]'}`
            };
        });

        res.json({
            success: true,
            vehicles: cleanedVehicles,
            drivers: cleanedDrivers
        });
    } catch (err) {
        console.error('Error fetching fleet options:', err);
        res.status(500).json({ success: false, message: 'Server error fetching fleet options' });
    }
};
