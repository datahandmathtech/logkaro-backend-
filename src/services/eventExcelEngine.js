const { DateTime } = require('luxon');

const SERVICE_TYPES = ['ARRIVAL', 'DEPARTURE', 'DISPOSAL', 'INTERCITY', 'LOCAL'];

function normalizePlate(plate) {
    return String(plate || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

function normalizeGuestKey(name) {
    return String(name || '')
        .toLowerCase()
        .replace(/\b(mr|mrs|ms|miss|dr|shri|smt|prof)\.?\s*/gi, '')
        .replace(/\+\s*\d+\s*$/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function parseGuestGroupPax(rawName, rawPax) {
    const cleanName = String(rawName || '').trim() || 'Guest Group';
    const plusMatch = cleanName.match(/\+\s*(\d+)\s*$/);
    const plusExtra = plusMatch ? parseInt(plusMatch[1], 10) : 0;
    const explicitNum = Number(rawPax);

    let pax = 1;
    if (Number.isFinite(explicitNum) && explicitNum > 1) {
        pax = Math.round(explicitNum);
    } else if (plusExtra > 0) {
        pax = 1 + plusExtra;
    } else if (Number.isFinite(explicitNum) && explicitNum === 1) {
        pax = 1;
    }

    return {
        guestGroup: cleanName,
        baseKey: normalizeGuestKey(cleanName),
        pax
    };
}

function normalizeDateValue(raw, defaultYear = 2026, timezone = 'Asia/Kolkata') {
    if (raw === null || raw === undefined || raw === '') return '';
    if (raw instanceof Date && !isNaN(raw.getTime())) {
        return DateTime.fromJSDate(raw, { zone: timezone }).toISODate() || '';
    }
    if (typeof raw === 'number' && Number.isFinite(raw) && raw > 20000 && raw < 100000) {
        const epochMs = Math.round((raw - 25569) * 86400 * 1000);
        return DateTime.fromMillis(epochMs, { zone: 'UTC' }).toISODate() || '';
    }
    const str = String(raw).trim();
    if (!str) return '';
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.substring(0, 10);

    const dmy = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
    if (dmy) {
        let yr = dmy[3];
        if (yr.length === 2) yr = `20${yr}`;
        return `${yr}-${String(dmy[2]).padStart(2, '0')}-${String(dmy[1]).padStart(2, '0')}`;
    }

    const words = str.match(/^(\d{1,2})(?:st|nd|rd|th)?[-\s]+([A-Za-z]+)(?:[-\s,]+(\d{2,4}))?/i);
    if (words) {
        const day = String(words[1]).padStart(2, '0');
        const monKey = words[2].toLowerCase().substring(0, 3);
        const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
        const mon = months[monKey];
        if (mon) {
            let yr = words[3] || String(defaultYear);
            if (yr.length === 2) yr = `20${yr}`;
            return `${yr}-${mon}-${day}`;
        }
    }

    if (/^\d{5}$/.test(str)) {
        const serial = parseInt(str, 10);
        const epochMs = Math.round((serial - 25569) * 86400 * 1000);
        return DateTime.fromMillis(epochMs, { zone: 'UTC' }).toISODate() || '';
    }

    return '';
}

function normalizeTimeValue(raw, timezone = 'Asia/Kolkata') {
    if (raw === null || raw === undefined || raw === '') return '';
    if (raw instanceof Date && !isNaN(raw.getTime())) {
        const dt = DateTime.fromJSDate(raw, { zone: timezone });
        return dt.toFormat('HH:mm');
    }
    if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 && raw < 1) {
        const totalMinutes = Math.round(raw * 24 * 60) % (24 * 60);
        const hh = Math.floor(totalMinutes / 60);
        const mm = totalMinutes % 60;
        return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    }
    const str = String(raw).trim();
    if (!str) return '';
    if (/^\d?\.?\d+$/.test(str) && Number(str) >= 0 && Number(str) < 1) {
        const totalMinutes = Math.round(Number(str) * 24 * 60) % (24 * 60);
        const hh = Math.floor(totalMinutes / 60);
        const mm = totalMinutes % 60;
        return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    }
    if (/morning/i.test(str)) return '09:00';
    if (/afternoon/i.test(str)) return '14:00';
    if (/evening/i.test(str)) return '18:00';
    if (/night/i.test(str)) return '21:00';

    const match = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
    if (match) {
        let hh = parseInt(match[1], 10);
        const mm = parseInt(match[2], 10);
        const mer = match[3] ? match[3].toUpperCase() : null;
        if (mer === 'PM' && hh < 12) hh += 12;
        if (mer === 'AM' && hh === 12) hh = 0;
        if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
            return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
        }
    }
    return '';
}

function toMinutesOfDay(time24Str) {
    const clean = normalizeTimeValue(time24Str) || String(time24Str || '').trim();
    const m = clean.match(/^(\d{1,2}):(\d{2})/);
    if (!m) return null;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function minutesToTime24(totalMinutes) {
    const mins = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
    const hh = Math.floor(mins / 60);
    const mm = mins % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function calculateDeparturePickup(flightDateStr, flightTimeStr, leadMinutes = 120, timezone = 'Asia/Kolkata') {
    const normTime = normalizeTimeValue(flightTimeStr, timezone);
    if (!normTime) {
        return {
            pickupDate: flightDateStr || '',
            pickupTime: '',
            flightDate: flightDateStr || '',
            flightTime: ''
        };
    }

    const baseDateStr = normalizeDateValue(flightDateStr, 2026, timezone) || DateTime.now().setZone(timezone).toISODate();
    const [hh, mm] = normTime.split(':').map(Number);

    const flightDt = DateTime.fromISO(baseDateStr, { zone: timezone }).set({
        hour: hh || 0,
        minute: mm || 0,
        second: 0,
        millisecond: 0
    });

    const lead = Number.isFinite(Number(leadMinutes)) ? Number(leadMinutes) : 120;
    const pickupDt = flightDt.minus({ minutes: lead });

    return {
        pickupDate: pickupDt.toISODate(),
        pickupTime: pickupDt.toFormat('HH:mm'),
        flightDate: flightDt.toISODate(),
        flightTime: flightDt.toFormat('HH:mm'),
        leadMinutes: lead,
        tightBufferWarning: lead < 90
    };
}

function normalizeServiceType(rawService, contextHint = '') {
    const v = `${String(rawService || '')} ${String(contextHint || '')}`.toUpperCase();
    if (v.includes('DEPART') || v.includes('DROP OFF') || v.includes('CHECKOUT')) return 'DEPARTURE';
    if (v.includes('DISPOS') || v.includes('PACKAGE') || v.includes('8HR') || v.includes('8 HR') || v.includes('FULL DAY')) return 'DISPOSAL';
    if (v.includes('INTERC') || v.includes('OUTSTATION')) return 'INTERCITY';
    if (v.includes('LOCAL') || v.includes('SHUTTLE') || v.includes('VENUE')) return 'LOCAL';
    if (v.includes('ARRIV') || v.includes('PICKUP') || v.includes('CHECKIN')) return 'ARRIVAL';
    return 'ARRIVAL';
}

function normalizeCarType(rawCar) {
    const s = String(rawCar || '').trim();
    if (!s) return 'Crysta';
    if (/urbania|force/i.test(s)) return 'Urbania';
    if (/hycross/i.test(s)) return 'Innova Hycross';
    if (/crysta|innova/i.test(s)) return 'Crysta';
    if (/ertiga/i.test(s)) return 'Ertiga';
    if (/fortuner/i.test(s)) return 'Fortuner';
    if (/tempo\s*17|17\s*s/i.test(s)) return 'Tempo 17 Seater';
    if (/tempo/i.test(s)) return 'Tempo 12 Seater';
    if (/bus\s*45|45\s*s/i.test(s)) return 'Bus 45 Seater';
    if (/bus/i.test(s)) return 'Bus 35 Seater';
    if (/sedan|dzire|etios|amaze/i.test(s)) return 'Sedan';
    return s;
}

const CANONICAL_MAPPING_FIELDS = [
    { key: 'guestGroup', label: 'Guest / Group Name' },
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'phone', label: 'Mobile / Phone' },
    { key: 'partySide', label: 'Side / Party (Groom/Bride)' },
    { key: 'pax', label: 'PAX Count' },
    { key: 'carType', label: 'Car / Vehicle Type' },
    { key: 'serviceType', label: 'Service Type' },
    { key: 'externalRef', label: 'Client Booking Ref / Code' },
    { key: 'arrivalDate', label: 'Arrival / Pickup Date' },
    { key: 'arrivalTime', label: 'Arrival / Pickup Time' },
    { key: 'arrivalFlightNo', label: 'Arrival Flight / Train No.' },
    { key: 'arrivalMode', label: 'Arrival Travel Mode' },
    { key: 'arrivalPickup', label: 'Pickup / Reporting Point' },
    { key: 'arrivalDrop', label: 'Drop / Destination' },
    { key: 'departureDate', label: 'Departure Flight / Train Date' },
    { key: 'departureTime', label: 'Departure Flight / Train Time' },
    { key: 'departureFlightNo', label: 'Departure Flight / Train No.' },
    { key: 'departureMode', label: 'Departure Travel Mode' },
    { key: 'departurePickup', label: 'Departure Pickup Point' },
    { key: 'departureDrop', label: 'Departure Drop Point' },
    { key: 'guestPickupOverride', label: 'Explicit Guest Pickup Time' },
    { key: 'disposalHours', label: 'Disposal Package Hours' },
    { key: 'disposalKm', label: 'Disposal Included KM' },
    { key: 'vehicleNumber', label: 'Assigned Vehicle Number' },
    { key: 'vendorName', label: 'Vendor Name' },
    { key: 'remarks', label: 'Notes / Remarks' }
];

function autoDetectHeaderAndMapping(rows2D = [], sheetName = '') {
    let bestRowIdx = 0;
    let bestScore = -1;

    const headerHints = [
        'guest', 'name', 'first name', 'pax', 'arrival', 'departure', 'flight', 'train',
        'pickup', 'drop', 'car', 'vehicle', 'date', 'time', 'service', 'phone', 'mobile',
        'party', 'side', 'ref', 'from', 'to', 'remark', 'note', 'destination'
    ];

    const maxScan = Math.min(rows2D.length, 15);
    for (let r = 0; r < maxScan; r++) {
        const row = rows2D[r] || [];
        let score = 0;
        let nonEmpty = 0;
        row.forEach(cell => {
            const c = String(cell || '').toLowerCase().trim();
            if (!c) return;
            nonEmpty++;
            if (headerHints.some(h => c.includes(h))) score += 2;
        });
        const totalScore = score + (nonEmpty >= 3 ? 1 : 0);
        if (totalScore > bestScore && nonEmpty >= 2) {
            bestScore = totalScore;
            bestRowIdx = r;
        }
    }

    const headerRow = (rows2D[bestRowIdx] || []).map(c => String(c || '').trim());
    const columnMap = {};

    const matchField = (colHeader, idx) => {
        const h = colHeader.toLowerCase().trim();
        if (!h) return;
        const setIfEmpty = (k) => { if (columnMap[k] === undefined) columnMap[k] = colHeader; };

        if (h.includes('guest') && (h.includes('group') || h.includes('name')) || h === 'guest' || h === 'name' || h === 'passenger') setIfEmpty('guestGroup');
        else if (h === 'first name' || h === 'firstname') setIfEmpty('firstName');
        else if (h === 'last name' || h === 'lastname') setIfEmpty('lastName');
        else if (h.includes('phone') || h.includes('mobile') || h.includes('contact')) setIfEmpty('phone');
        else if (h.includes('party') || h === 'side' || h.includes('groom/bride')) setIfEmpty('partySide');
        else if (h === 'pax' || h.includes('no of pax') || h.includes('guest count') || h === 'headcount') setIfEmpty('pax');
        else if (h.includes('car number') || h.includes('vehicle number') || h.includes('reg no')) setIfEmpty('vehicleNumber');
        else if (h.includes('car') || h.includes('vehicle') || h.includes('cab')) setIfEmpty('carType');
        else if (h.includes('service') || h.includes('duty type') || h.includes('movement')) setIfEmpty('serviceType');
        else if (h.includes('ref') || h.includes('booking id') || h.includes('code')) setIfEmpty('externalRef');
        else if (h.includes('departure') && h.includes('date')) setIfEmpty('departureDate');
        else if ((h.includes('departure') || h === 'flight time') && h.includes('time')) setIfEmpty('departureTime');
        else if ((h.includes('departure') || h === 'return') && (h.includes('flight') || h.includes('train') || h.includes('detail'))) setIfEmpty('departureFlightNo');
        else if (h.includes('departure') && (h.includes('pickup') || h.includes('from'))) setIfEmpty('departurePickup');
        else if (h.includes('departure') && (h.includes('drop') || h.includes('to'))) setIfEmpty('departureDrop');
        else if (h.includes('arrival') && h.includes('date')) setIfEmpty('arrivalDate');
        else if (h.includes('arrival') && h.includes('time')) setIfEmpty('arrivalTime');
        else if ((h.includes('arrival') || h === 'flight' || h.includes('flight no')) && (h.includes('flight') || h.includes('train') || h.includes('detail'))) setIfEmpty('arrivalFlightNo');
        else if (h.includes('guest pickup') || h.includes('reporting time')) setIfEmpty('guestPickupOverride');
        else if (h === 'date' || h.includes('pickup date') || h.includes('travel date')) setIfEmpty('arrivalDate');
        else if (h === 'time' || h.includes('pickup time')) setIfEmpty('arrivalTime');
        else if (h.includes('pickup') || h === 'from' || h.includes('reporting') || h.includes('origin')) setIfEmpty('arrivalPickup');
        else if (h.includes('drop') || h === 'to' || h.includes('destination') || h.includes('hotel')) setIfEmpty('arrivalDrop');
        else if (h.includes('flight') || h.includes('train')) setIfEmpty('arrivalFlightNo');
        else if (h.includes('disposal') && h.includes('hour')) setIfEmpty('disposalHours');
        else if (h.includes('disposal') && h.includes('km')) setIfEmpty('disposalKm');
        else if (h.includes('vendor')) setIfEmpty('vendorName');
        else if (h.includes('remark') || h.includes('note') || h.includes('comment')) setIfEmpty('remarks');
        else if (h === 'mode' || h.includes('travel mode')) {
            if (columnMap.arrivalDate !== undefined && columnMap.departureDate !== undefined) setIfEmpty('departureMode');
            else setIfEmpty('arrivalMode');
        }
    };

    headerRow.forEach((h, idx) => matchField(h, idx));

    return {
        headerRowIndex: bestRowIdx,
        headers: headerRow.filter(Boolean),
        columnMap,
        isDispatchSideBySide: rows2D.slice(0, 6).some(r => {
            const txt = (r || []).join(' ').toLowerCase();
            return txt.includes('arrivals') && txt.includes('departures');
        })
    };
}

function getMappedVal(rowObj, mappedColName, fallbackKeys = []) {
    if (mappedColName && rowObj[mappedColName] !== undefined && rowObj[mappedColName] !== '') {
        return rowObj[mappedColName];
    }
    for (const k of fallbackKeys) {
        if (rowObj[k] !== undefined && rowObj[k] !== '') return rowObj[k];
    }
    return '';
}

function expandMappedRowToMovements(rowObj, rowMeta = {}, columnMap = {}, config = {}) {
    const timezone = config.timezone || 'Asia/Kolkata';
    const defaultYear = Number(config.defaultYear) || 2026;
    const departureLeadMinutes = Number(config.departureLeadMinutes) || 120;
    const stationLeadMinutes = Number(config.stationLeadMinutes) || 60;
    const defaultHotel = config.defaultHotel || 'Hotel';
    const sheetName = rowMeta.sheetName || 'Sheet1';
    const rowNumber = rowMeta.rowNumber || 1;
    const sourceRowId = rowMeta.sourceRowId || `${sheetName}#${rowNumber}`;

    let rawName = String(getMappedVal(rowObj, columnMap.guestGroup, ['Guest Name', 'Guest / Group', 'Guest', 'Name', 'Passenger']) || '').trim();
    if (!rawName) {
        const fn = String(getMappedVal(rowObj, columnMap.firstName, ['First Name']) || '').trim();
        const ln = String(getMappedVal(rowObj, columnMap.lastName, ['Last Name']) || '').trim();
        rawName = [fn, ln].filter(Boolean).join(' ').trim();
    }

    const rawPax = getMappedVal(rowObj, columnMap.pax, ['PAX', 'Pax', 'No of Pax', 'Count', 'Guests']);
    const phone = String(getMappedVal(rowObj, columnMap.phone, ['Phone', 'Mobile', 'Phone Number']) || '').trim();
    const partySide = String(getMappedVal(rowObj, columnMap.partySide, ['Party', 'Side']) || (/bride/i.test(sheetName) ? 'Bride' : /groom/i.test(sheetName) ? 'Groom' : 'Common')).trim();
    const rawCar = getMappedVal(rowObj, columnMap.carType, ['Car Type', 'Vehicle', 'Cab', 'Vehicle Type']);
    const rawService = getMappedVal(rowObj, columnMap.serviceType, ['Service Type', 'Service', 'Duty Type']);
    const externalRef = String(getMappedVal(rowObj, columnMap.externalRef, ['Ref', 'Booking Ref', 'Reference', 'Code']) || '').trim();
    const remarks = String(getMappedVal(rowObj, columnMap.remarks, ['Remarks', 'Notes', 'Comment']) || '').trim();
    const assignedVeh = String(getMappedVal(rowObj, columnMap.vehicleNumber, ['Vehicle Number', 'Car Number']) || '').trim();
    const vendorName = String(getMappedVal(rowObj, columnMap.vendorName, ['Vendor', 'Vendor Name']) || '').trim();

    const arrDateRaw = getMappedVal(rowObj, columnMap.arrivalDate, ['Arrival Date', 'Pickup Date', 'Date', 'Travel Date']);
    const arrTimeRaw = getMappedVal(rowObj, columnMap.arrivalTime, ['Arrival Time', 'Guest Pickup', 'Pickup Time', 'Time']);
    const arrFlight = String(getMappedVal(rowObj, columnMap.arrivalFlightNo, ['Flight No.', 'Flight', 'Flight Number', 'Train No']) || '').trim();
    const arrMode = String(getMappedVal(rowObj, columnMap.arrivalMode, ['Arrival Mode', 'Travel Mode']) || '').trim();
    const arrPickup = String(getMappedVal(rowObj, columnMap.arrivalPickup, ['Pickup', 'From', 'Pickup / Reporting', 'Origin']) || '').trim();
    const arrDrop = String(getMappedVal(rowObj, columnMap.arrivalDrop, ['Drop', 'To', 'Drop / Destination', 'Hotel', 'Destination']) || '').trim();
    const explicitGuestPickup = normalizeTimeValue(getMappedVal(rowObj, columnMap.guestPickupOverride, ['Guest Pickup', 'Guest Pickup Time']), timezone);

    const depDateRaw = getMappedVal(rowObj, columnMap.departureDate, ['Departure Date', 'Return Date', 'Flight Date']);
    const depTimeRaw = getMappedVal(rowObj, columnMap.departureTime, ['Departure Time', 'Flight Time', 'Return Time']);
    const depFlight = String(getMappedVal(rowObj, columnMap.departureFlightNo, ['Return Flight', 'Departure Flight', 'Departure Flight No']) || '').trim();
    const depMode = String(getMappedVal(rowObj, columnMap.departureMode, ['Departure Mode', 'Mode']) || '').trim();
    const depPickup = String(getMappedVal(rowObj, columnMap.departurePickup, ['Departure Pickup']) || '').trim();
    const depDrop = String(getMappedVal(rowObj, columnMap.departureDrop, ['Departure Drop']) || '').trim();

    const arrDate = normalizeDateValue(arrDateRaw, defaultYear, timezone);
    const arrTime = normalizeTimeValue(arrTimeRaw, timezone);
    const depDate = normalizeDateValue(depDateRaw, defaultYear, timezone);
    const depTime = normalizeTimeValue(depTimeRaw, timezone);

    // Skip genuinely empty trailing rows
    if (!rawName && !arrDate && !depDate && !arrTime && !depTime && !arrPickup && !arrDrop) {
        return [];
    }

    const { guestGroup, baseKey, pax } = parseGuestGroupPax(rawName || `Guest Row ${rowNumber}`, rawPax);
    const carType = rawCar ? normalizeCarType(rawCar) : '';
    const sourceLink = {
        batchId: rowMeta.batchId || null,
        sourceRowId,
        sheetName,
        rowNumber,
        rawSnippet: `${rawName} | ${arrDate || depDate} | ${arrTime || depTime}`
    };

    const movements = [];
    const sheetLower = sheetName.toLowerCase();
    const explicitService = rawService ? normalizeServiceType(rawService, sheetName) : null;

    // Determine whether this row encodes explicit single service (e.g. only Departure, Disposal, Intercity) OR Arrival + Departure on same row
    const hasArrivalData = Boolean(arrDate || arrTime || arrFlight || arrPickup || (!depDate && !depTime));
    const hasDepartureColumns = Boolean(depDate || depTime || depFlight);

    if (explicitService === 'DEPARTURE' && !hasDepartureColumns) {
        // Single-movement row explicitly marked DEPARTURE
        const isStation = /train|station|rail/i.test(`${arrMode} ${arrFlight} ${arrDrop}`);
        const lead = isStation ? stationLeadMinutes : departureLeadMinutes;
        const fDate = arrDate || DateTime.now().setZone(timezone).toISODate();
        const fTime = arrTime;
        const calc = fTime ? calculateDeparturePickup(fDate, fTime, lead, timezone) : { pickupDate: fDate, pickupTime: explicitGuestPickup || '' };

        movements.push({
            movementKey: `${sourceRowId}#DEP`,
            guestGroup,
            baseKey,
            phone,
            partySide,
            pax,
            carType: carType || 'Crysta',
            carTypeMissing: !carType,
            serviceType: 'DEPARTURE',
            direction: 'DEPARTURE',
            isStation,
            pickupDate: explicitGuestPickup ? fDate : calc.pickupDate,
            guestPickup: explicitGuestPickup || calc.pickupTime,
            flightDate: fDate,
            flightTime: fTime,
            flightNumber: arrFlight,
            pickupLeadMinutes: lead,
            manualPickupOverride: Boolean(explicitGuestPickup),
            needsPickupConfirm: Boolean(fTime && !explicitGuestPickup),
            pickupPoint: arrPickup || defaultHotel,
            dropLocation: arrDrop || (isStation ? 'Railway Station' : 'Udaipur Airport'),
            vehicleNumber: assignedVeh,
            vendorName,
            externalRef,
            remarks,
            sourceRowId,
            sourceLinks: [sourceLink],
            sourceSheet: sheetName,
            sourceRow: rowNumber
        });
        return movements;
    }

    if (hasArrivalData) {
        let svc = explicitService || (sheetLower.includes('depart') ? 'DEPARTURE' : sheetLower.includes('dispos') ? 'DISPOSAL' : sheetLower.includes('interc') ? 'INTERCITY' : 'ARRIVAL');
        if (hasDepartureColumns && svc === 'DEPARTURE') {
            // Dual-direction row: left columns are Arrival, right columns are Departure
            svc = 'ARRIVAL';
        }
        const isDep = svc === 'DEPARTURE';
        const isStation = /train|station|rail/i.test(`${arrMode} ${arrFlight} ${arrPickup} ${arrDrop}`);
        const lead = isDep ? (isStation ? stationLeadMinutes : departureLeadMinutes) : 0;

        let pickupDate = arrDate || depDate || '';
        let guestPickup = explicitGuestPickup || arrTime || '';
        let flightDate = isDep ? (arrDate || '') : (arrDate || '');
        let flightTime = isDep ? (arrTime || '') : (arrTime || '');

        if (isDep && flightTime && !explicitGuestPickup) {
            const calc = calculateDeparturePickup(pickupDate, flightTime, lead, timezone);
            pickupDate = calc.pickupDate;
            guestPickup = calc.pickupTime;
        }

        movements.push({
            movementKey: `${sourceRowId}#${svc}`,
            guestGroup,
            baseKey,
            phone,
            partySide,
            pax,
            carType: carType || 'Crysta',
            carTypeMissing: !carType,
            serviceType: svc,
            direction: svc,
            isStation,
            pickupDate,
            guestPickup,
            flightDate,
            flightTime,
            flightNumber: arrFlight,
            pickupLeadMinutes: lead,
            manualPickupOverride: Boolean(explicitGuestPickup),
            needsPickupConfirm: Boolean(isDep && flightTime && !explicitGuestPickup),
            pickupPoint: arrPickup || (svc === 'ARRIVAL' ? (isStation ? 'Railway Station' : 'Udaipur Airport') : defaultHotel),
            dropLocation: arrDrop || (svc === 'ARRIVAL' ? defaultHotel : (svc === 'DISPOSAL' ? 'Local Disposal' : 'Destination')),
            disposalHours: svc === 'DISPOSAL' ? (Number(getMappedVal(rowObj, columnMap.disposalHours)) || Number(config.disposalHours) || 8) : undefined,
            disposalKm: svc === 'DISPOSAL' ? (Number(getMappedVal(rowObj, columnMap.disposalKm)) || Number(config.disposalKm) || 80) : undefined,
            intercityRoute: svc === 'INTERCITY' && arrPickup && arrDrop ? `${arrPickup} -> ${arrDrop}` : '',
            vehicleNumber: assignedVeh,
            vendorName,
            externalRef,
            remarks,
            sourceRowId,
            sourceLinks: [sourceLink],
            sourceSheet: sheetName,
            sourceRow: rowNumber
        });
    }

    if (hasDepartureColumns) {
        const isStation = /train|station|rail/i.test(`${depMode} ${depFlight} ${depDrop}`);
        const lead = isStation ? stationLeadMinutes : departureLeadMinutes;
        const baseDepDate = depDate || arrDate || '';
        const calc = depTime ? calculateDeparturePickup(baseDepDate, depTime, lead, timezone) : { pickupDate: baseDepDate, pickupTime: '' };

        movements.push({
            movementKey: `${sourceRowId}#DEP`,
            guestGroup,
            baseKey,
            phone,
            partySide,
            pax,
            carType: carType || 'Crysta',
            carTypeMissing: !carType,
            serviceType: 'DEPARTURE',
            direction: 'DEPARTURE',
            isStation,
            pickupDate: calc.pickupDate,
            guestPickup: calc.pickupTime,
            flightDate: baseDepDate,
            flightTime: depTime,
            flightNumber: depFlight,
            pickupLeadMinutes: lead,
            manualPickupOverride: false,
            needsPickupConfirm: Boolean(depTime),
            pickupPoint: depPickup || arrDrop || defaultHotel,
            dropLocation: depDrop || arrPickup || (isStation ? 'Railway Station' : 'Udaipur Airport'),
            vehicleNumber: assignedVeh,
            vendorName,
            externalRef,
            remarks,
            sourceRowId,
            sourceLinks: [sourceLink],
            sourceSheet: sheetName,
            sourceRow: rowNumber
        });
    }

    return movements;
}

function compareMovements(rowA, rowB) {
    if (!rowA || !rowB) return { kind: 'distinct', reasons: [] };

    const keyA = rowA.baseKey || normalizeGuestKey(rowA.guestGroup);
    const keyB = rowB.baseKey || normalizeGuestKey(rowB.guestGroup);
    const dirA = (rowA.serviceType || 'ARRIVAL').toUpperCase();
    const dirB = (rowB.serviceType || 'ARRIVAL').toUpperCase();

    // Section 11 Acceptance Test #4: Same person arrival + departure = TWO movements, NEVER a duplicate!
    if ((dirA === 'ARRIVAL' && dirB === 'DEPARTURE') || (dirA === 'DEPARTURE' && dirB === 'ARRIVAL')) {
        return { kind: 'separate_direction', reasons: ['Arrival and Departure are separate trip directions'] };
    }

    // Check authoritative external booking ref when present on both
    if (rowA.externalRef && rowB.externalRef && String(rowA.externalRef).trim().toLowerCase() === String(rowB.externalRef).trim().toLowerCase()) {
        if (dirA !== dirB) {
            return {
                kind: 'source_conflict',
                reasons: [`Matching ref ${rowA.externalRef} but contradictory service (${dirA} vs ${dirB})`]
            };
        }
        const diffs = computeFieldDiffs(rowA, rowB);
        if (diffs.length > 0) {
            return {
                kind: 'changed',
                reasons: [`Matching booking ref ${rowA.externalRef} with updated details`],
                diffs
            };
        }
        return { kind: 'unchanged', reasons: [`Exact match on ref ${rowA.externalRef}`], diffs: [] };
    }

    // Same guest name & same service direction
    const namesSimilar = Boolean(keyA && keyB && (keyA === keyB || keyA.includes(keyB) || keyB.includes(keyA)));
    if (!namesSimilar || dirA !== dirB) {
        return { kind: 'distinct', reasons: [] };
    }

    const reasons = [];
    const dateA = rowA.pickupDate || rowA.flightDate || '';
    const dateB = rowB.pickupDate || rowB.flightDate || '';
    const timeA = toMinutesOfDay(rowA.flightTime || rowA.guestPickup);
    const timeB = toMinutesOfDay(rowB.flightTime || rowB.guestPickup);
    const flightA = String(rowA.flightNumber || '').trim().toUpperCase();
    const flightB = String(rowB.flightNumber || '').trim().toUpperCase();

    let compatibleDate = !dateA || !dateB || dateA === dateB;
    if (!compatibleDate && dateA && dateB) {
        const diffDays = Math.abs(DateTime.fromISO(dateA).diff(DateTime.fromISO(dateB), 'days').days);
        if (diffDays <= 1) compatibleDate = true;
    }

    if (!compatibleDate) {
        return { kind: 'distinct', reasons: ['Different travel dates'] };
    }

    if (dateA && dateB && dateA === dateB) reasons.push('Same date');
    if (!flightA || !flightB) reasons.push('Flight number missing on at least one row');
    else if (flightA === flightB) reasons.push(`Same flight/train ${flightA}`);
    else {
        return {
            kind: 'possible_duplicate',
            reasons: [`Same guest (${rowA.guestGroup}) & date but different flight (${flightA} vs ${flightB}) — verify conflict`],
            hasConflict: true
        };
    }

    if (timeA !== null && timeB !== null) {
        const diffMin = Math.abs(timeA - timeB);
        if (diffMin === 0) reasons.push('Same time');
        else if (diffMin <= 120) reasons.push(`Times within ${diffMin} mins`);
        else return { kind: 'possible_duplicate', reasons: [`Same guest & date (${diffMin} mins apart)`] };
    }

    if (Number(rowA.pax) === Number(rowB.pax)) reasons.push(`Same group size (${rowA.pax} PAX)`);

    return {
        kind: 'possible_duplicate',
        reasons
    };
}

function computeFieldDiffs(oldItem, newItem) {
    const fields = [
        { k: 'pax', label: 'PAX' },
        { k: 'carType', label: 'Car Type' },
        { k: 'pickupDate', label: 'Pickup Date' },
        { k: 'guestPickup', label: 'Guest Pickup' },
        { k: 'flightDate', label: 'Flight Date' },
        { k: 'flightTime', label: 'Flight Time' },
        { k: 'flightNumber', label: 'Flight No.' },
        { k: 'pickupPoint', label: 'Pickup Point' },
        { k: 'dropLocation', label: 'Drop Location' }
    ];
    const diffs = [];
    fields.forEach(({ k, label }) => {
        const a = String(oldItem[k] ?? '').trim();
        const b = String(newItem[k] ?? '').trim();
        if (a !== b && (a || b)) {
            diffs.push({ field: k, label, oldValue: a || '—', newValue: b || '—' });
        }
    });
    return diffs;
}

function reconcileBatchMovements(candidateMovements = [], existingLiveDuties = []) {
    const possibleDuplicates = [];
    const changedItems = [];
    const sourceConflicts = [];
    const missingDetails = [];
    const newItems = [];
    const unchangedItems = [];
    const matchedLiveDutyIds = new Set();

    // 1. Cross-sheet duplicate scan inside the batch itself
    const pairedDuplicateIdx = new Set();
    for (let i = 0; i < candidateMovements.length; i++) {
        if (pairedDuplicateIdx.has(i)) continue;
        const mA = candidateMovements[i];
        const clusterMatches = [];
        for (let j = i + 1; j < candidateMovements.length; j++) {
            const mB = candidateMovements[j];
            // Only flag across sheets OR duplicate within same sheet when different rowNumber
            if (mA.sourceRowId === mB.sourceRowId) continue;
            const cmp = compareMovements(mA, mB);
            if (cmp.kind === 'possible_duplicate' || cmp.kind === 'source_conflict') {
                clusterMatches.push({ idx: j, candidate: mB, cmp });
                pairedDuplicateIdx.add(j);
            }
        }
        if (clusterMatches.length > 0) {
            possibleDuplicates.push({
                id: `dup-${mA.movementKey}`,
                primary: mA,
                duplicates: clusterMatches.map(m => ({
                    movement: m.candidate,
                    reasons: m.cmp.reasons,
                    hasConflict: Boolean(m.cmp.hasConflict)
                })),
                summary: `${mA.sourceSheet || 'Sheet'} row ${mA.sourceRow} <-> ${clusterMatches.map(m => `${m.candidate.sourceSheet || 'Sheet'} row ${m.candidate.sourceRow}`).join(', ')}`,
                status: 'pending'
            });
        }
    }

    // 2. Match candidates against existing Live Duties (client revision handling!)
    candidateMovements.forEach((cand) => {
        const candKey = cand.baseKey || normalizeGuestKey(cand.guestGroup);
        const liveMatch = existingLiveDuties.find(d => {
            if (d.status === 'Cancelled') return false;
            if (cand.externalRef && d.sourceRef && String(d.sourceRef).toLowerCase() === String(cand.externalRef).toLowerCase()) {
                return (d.serviceType || '').toUpperCase() === (cand.serviceType || '').toUpperCase();
            }
            const dutyKey = normalizeGuestKey(d.guestGroup);
            const sameService = (d.serviceType || 'ARRIVAL').toUpperCase() === (cand.serviceType || 'ARRIVAL').toUpperCase();
            const sameDate = !cand.pickupDate || !d.pickupDate || cand.pickupDate === d.pickupDate || cand.flightDate === d.flightDate;
            return sameService && sameDate && dutyKey && candKey && (dutyKey === candKey || dutyKey.includes(candKey) || candKey.includes(dutyKey));
        });

        if (liveMatch) {
            matchedLiveDutyIds.add(String(liveMatch.dutyId || liveMatch._id));
            const diffs = computeFieldDiffs(liveMatch, cand);
            const isPostDispatch = ['Dispatched', 'Running', 'Completed'].includes(liveMatch.status);
            const hasConflict = Boolean(liveMatch.status === 'Completed' || isPostDispatch);

            if (diffs.length > 0) {
                changedItems.push({
                    id: `chg-${cand.movementKey}`,
                    candidate: cand,
                    liveDuty: liveMatch,
                    dutyId: liveMatch.dutyId,
                    liveStatus: liveMatch.status,
                    postDispatchRevision: isPostDispatch,
                    lockedCompleted: liveMatch.status === 'Completed' || Boolean(liveMatch.isLocked),
                    diffs,
                    status: 'pending'
                });
            } else {
                unchangedItems.push({
                    id: `unc-${cand.movementKey}`,
                    candidate: cand,
                    liveDutyId: liveMatch.dutyId
                });
            }
        } else {
            newItems.push(cand);
        }

        // Check missing / unresolved fields on candidate
        const missingFields = [];
        if (!cand.pickupDate && !cand.flightDate) missingFields.push('Date');
        if (cand.carTypeMissing) missingFields.push('Car Type');
        if (!cand.guestPickup && !cand.flightTime) missingFields.push('Time');
        if (!cand.pickupPoint) missingFields.push('Pickup Point');
        if (!cand.dropLocation) missingFields.push('Drop Location');
        if (cand.needsPickupConfirm) missingFields.push('Departure Pickup Confirmation');

        if (missingFields.length > 0) {
            missingDetails.push({
                id: `mis-${cand.movementKey}`,
                candidate: cand,
                missingFields,
                status: 'pending'
            });
        }
    });

    const retainedLiveDuties = existingLiveDuties.filter(
        d => d.status !== 'Cancelled' && !matchedLiveDutyIds.has(String(d.dutyId || d._id))
    );

    return {
        summary: {
            newCount: newItems.length,
            unchangedCount: unchangedItems.length,
            changedCount: changedItems.length,
            possibleDuplicatesCount: possibleDuplicates.length,
            missingDetailsCount: missingDetails.length,
            sourceConflictsCount: sourceConflicts.length,
            retainedLiveCount: retainedLiveDuties.length
        },
        newItems,
        unchangedItems,
        changedItems,
        possibleDuplicates,
        missingDetails,
        sourceConflicts,
        retainedLiveDuties: retainedLiveDuties.map(d => ({
            dutyId: d.dutyId,
            guestGroup: d.guestGroup,
            serviceType: d.serviceType,
            pickupDate: d.pickupDate,
            status: d.status
        }))
    };
}

function proposeDuties(movements = [], consolidationGroups = [], startSequence = 1) {
    const proposed = [];
    const consumedIds = new Set();
    let seq = Number(startSequence) || 1;

    // 1. Explicit operator-approved consolidation groups (shared cars)
    (consolidationGroups || []).forEach(grp => {
        const memberIds = new Set((grp.movementKeys || grp.movementIds || []).map(String));
        const members = movements.filter(m => memberIds.has(String(m._id || m.movementKey)));
        if (members.length === 0) return;

        members.forEach(m => consumedIds.add(String(m._id || m.movementKey)));
        const first = members[0];
        const totalPax = members.reduce((s, m) => s + (Number(m.pax) || 1), 0);
        const guestNames = members.map(m => `${m.guestGroup} (${m.pax})`).join(' + ');

        proposed.push({
            dutyId: grp.dutyId || `LK-${String(seq++).padStart(3, '0')}`,
            guestGroup: grp.label || (members.length === 1 ? first.guestGroup : guestNames),
            pax: totalPax,
            carType: grp.carType || first.carType || 'Crysta',
            serviceType: first.serviceType || 'ARRIVAL',
            pickupDate: first.pickupDate,
            guestPickup: first.guestPickup,
            flightDate: first.flightDate || '',
            flightTime: first.flightTime || '',
            flightNumber: first.flightNumber || '',
            pickupLeadMinutes: first.pickupLeadMinutes ?? (first.serviceType === 'DEPARTURE' ? 120 : 0),
            manualPickupOverride: Boolean(first.manualPickupOverride),
            pickupConfirmed: Boolean(first.pickupConfirmed),
            pickupPoint: first.pickupPoint || '',
            dropLocation: first.dropLocation || '',
            disposalHours: first.disposalHours || 8,
            disposalKm: first.disposalKm || 80,
            intercityRoute: first.intercityRoute || '',
            sourceRef: first.externalRef || '',
            remarks: grp.remarks || members.map(m => m.remarks).filter(Boolean).join(' | '),
            guests: members.map(m => ({
                movementId: m._id || null,
                guestGroup: m.guestGroup,
                pax: Number(m.pax) || 1,
                phone: m.phone || '',
                partySide: m.partySide || '',
                notes: m.remarks || ''
            })),
            sourceLinks: members.flatMap(m => m.sourceLinks || []),
            rawSourceSheet: first.sourceSheet || first.rawSourceSheet || '',
            rawSourceRow: first.sourceRow || first.rawSourceRow || 0
        });
    });

    // 2. Remaining individual unique guest movements -> 1 movement = 1 proposed vehicle duty
    // Note: "Mr X + 9" is 1 group with PAX = 10 -> yields ONE duty with pax = 10.
    // Note: Never auto-combines different groups!
    movements.forEach(m => {
        const key = String(m._id || m.movementKey);
        if (consumedIds.has(key)) return;
        consumedIds.add(key);

        proposed.push({
            dutyId: `LK-${String(seq++).padStart(3, '0')}`,
            guestGroup: m.guestGroup,
            pax: Number(m.pax) || 1,
            carType: m.carType || 'Crysta',
            serviceType: m.serviceType || 'ARRIVAL',
            pickupDate: m.pickupDate || '',
            guestPickup: m.guestPickup || '',
            flightDate: m.flightDate || '',
            flightTime: m.flightTime || '',
            flightNumber: m.flightNumber || '',
            pickupLeadMinutes: m.pickupLeadMinutes ?? (m.serviceType === 'DEPARTURE' ? 120 : 0),
            manualPickupOverride: Boolean(m.manualPickupOverride),
            pickupConfirmed: Boolean(m.pickupConfirmed),
            pickupPoint: m.pickupPoint || '',
            dropLocation: m.dropLocation || '',
            disposalHours: m.disposalHours || 8,
            disposalKm: m.disposalKm || 80,
            intercityRoute: m.intercityRoute || '',
            sourceRef: m.externalRef || '',
            remarks: m.remarks || '',
            guests: [{
                movementId: m._id || null,
                guestGroup: m.guestGroup,
                pax: Number(m.pax) || 1,
                phone: m.phone || '',
                partySide: m.partySide || '',
                notes: m.remarks || ''
            }],
            sourceLinks: m.sourceLinks || [],
            rawSourceSheet: m.sourceSheet || m.rawSourceSheet || '',
            rawSourceRow: m.sourceRow || m.rawSourceRow || 0
        });
    });

    return proposed;
}

function estimateDutyInterval(duty) {
    const startMin = toMinutesOfDay(duty.guestPickup || duty.flightTime);
    if (!duty.pickupDate || startMin === null) return null;

    let durationMin = 60;
    const svc = (duty.serviceType || '').toUpperCase();
    if (svc === 'DEPARTURE') durationMin = 75;
    else if (svc === 'DISPOSAL') durationMin = (Number(duty.disposalHours) || 8) * 60;
    else if (svc === 'INTERCITY') durationMin = 240;
    else if (svc === 'LOCAL') durationMin = 60;

    if (duty.plannedEndTime) {
        const explicitEnd = toMinutesOfDay(duty.plannedEndTime);
        if (explicitEnd !== null && explicitEnd > startMin) {
            durationMin = explicitEnd - startMin;
        }
    }

    const baseDay = DateTime.fromISO(duty.pickupDate, { zone: 'Asia/Kolkata' });
    if (!baseDay.isValid) return null;

    const startEpochMin = Math.floor(baseDay.toMillis() / 60000) + startMin;
    const endEpochMin = startEpochMin + durationMin;

    return { startEpochMin, endEpochMin, durationMin };
}

function checkVehicleTurnaroundOverlap(candidateDuty, allDuties = [], defaultTurnaroundMinutes = 30) {
    const normTargetPlate = normalizePlate(candidateDuty.vehicleNumber);
    if (!normTargetPlate) return { conflict: false, overlappingDuties: [] };

    const targetInterval = estimateDutyInterval(candidateDuty);
    if (!targetInterval) return { conflict: false, overlappingDuties: [] };

    const buffer = Number.isFinite(Number(defaultTurnaroundMinutes)) ? Number(defaultTurnaroundMinutes) : 30;
    const overlappingDuties = [];

    allDuties.forEach(other => {
        if (!other || other.status === 'Cancelled') return;
        if (candidateDuty.dutyId && other.dutyId === candidateDuty.dutyId) return;
        if (candidateDuty._id && other._id && String(candidateDuty._id) === String(other._id)) return;
        if (normalizePlate(other.vehicleNumber) !== normTargetPlate) return;

        const otherInterval = estimateDutyInterval(other);
        if (!otherInterval) return;

        // Conflict when intervals overlap OR gap between one finish and next start < buffer
        const noConflictBefore = otherInterval.endEpochMin + buffer <= targetInterval.startEpochMin;
        const noConflictAfter = targetInterval.endEpochMin + buffer <= otherInterval.startEpochMin;

        if (!noConflictBefore && !noConflictAfter) {
            overlappingDuties.push({
                dutyId: other.dutyId,
                guestGroup: other.guestGroup,
                pickupDate: other.pickupDate,
                guestPickup: other.guestPickup,
                serviceType: other.serviceType,
                estimatedEndTime: minutesToTime24(toMinutesOfDay(other.guestPickup) + otherInterval.durationMin),
                requiredTurnaroundMinutes: buffer
            });
        }
    });

    return {
        conflict: overlappingDuties.length > 0,
        overlappingDuties,
        message: overlappingDuties.length > 0
            ? `Vehicle ${candidateDuty.vehicleNumber} overlaps or violates ${buffer}m turnaround with ${overlappingDuties.map(d => `${d.dutyId} (${d.guestPickup})`).join(', ')}`
            : ''
    };
}

function calculateDisposalBilling(duty, rateCardItem = null) {
    const pkgHours = Number(duty.disposalHours) || Number(rateCardItem?.baseHours) || 8;
    const pkgKm = Number(duty.disposalKm) || Number(rateCardItem?.baseKms) || 80;

    const startMin = toMinutesOfDay(duty.actualStartTime || duty.guestPickup);
    const endMin = toMinutesOfDay(duty.actualEndTime);

    let actualHours = 0;
    if (startMin !== null && endMin !== null) {
        let diff = endMin - startMin;
        if (diff < 0) diff += 1440; // crossed midnight
        actualHours = Number((diff / 60).toFixed(2));
    }

    const actualKm = Number(duty.actualKm) || 0;
    const extraHours = Math.max(0, Number((actualHours - pkgHours).toFixed(2)));
    const extraKm = Math.max(0, Math.round(actualKm - pkgKm));

    const extraHourRate = Number(rateCardItem?.extraHourRate) || 0;
    const extraKmRate = Number(rateCardItem?.extraKmRate) || 0;
    const extraAmount = Math.round(extraHours * extraHourRate + extraKm * extraKmRate);

    return {
        packageHours: pkgHours,
        packageKm: pkgKm,
        actualHours,
        actualKm,
        extraHours,
        extraKm,
        hasExtras: extraHours > 0 || extraKm > 0,
        extraAmount
    };
}

module.exports = {
    SERVICE_TYPES,
    CANONICAL_MAPPING_FIELDS,
    normalizePlate,
    normalizeGuestKey,
    parseGuestGroupPax,
    normalizeDateValue,
    normalizeTimeValue,
    toMinutesOfDay,
    minutesToTime24,
    calculateDeparturePickup,
    normalizeServiceType,
    normalizeCarType,
    autoDetectHeaderAndMapping,
    expandMappedRowToMovements,
    compareMovements,
    reconcileBatchMovements,
    proposeDuties,
    estimateDutyInterval,
    checkVehicleTurnaroundOverlap,
    calculateDisposalBilling
};
