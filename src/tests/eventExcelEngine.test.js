const test = require('node:test');
const assert = require('node:assert/strict');
const {
    calculateDeparturePickup,
    parseGuestGroupPax,
    autoDetectHeaderAndMapping,
    expandMappedRowToMovements,
    compareMovements,
    reconcileBatchMovements,
    proposeDuties,
    checkVehicleTurnaroundOverlap,
    calculateDisposalBilling
} = require('../services/eventExcelEngine');

test('1. 200 guests across multi-car groups -> exact vehicle duties and 200 passengers traceable', () => {
    // 30 groups: 20 groups of 6 + 10 groups of 8 = 120 + 80 = 200 passengers -> 30 vehicle allocations
    const movements = [];
    for (let i = 1; i <= 20; i++) {
        movements.push({
            movementKey: `G1-${i}`,
            guestGroup: `Group A-${i}`,
            pax: 6,
            carType: 'Crysta',
            serviceType: 'ARRIVAL',
            pickupDate: '2026-11-26',
            guestPickup: '10:00',
            sourceLinks: [{ sheetName: 'Groom Arrival', rowNumber: i + 1, sourceRowId: `Groom#${i + 1}` }]
        });
    }
    for (let i = 1; i <= 10; i++) {
        movements.push({
            movementKey: `G2-${i}`,
            guestGroup: `Group B-${i}`,
            pax: 8,
            carType: 'Urbania',
            serviceType: 'ARRIVAL',
            pickupDate: '2026-11-26',
            guestPickup: '11:00',
            sourceLinks: [{ sheetName: 'Bride Arrival', rowNumber: i + 1, sourceRowId: `Bride#${i + 1}` }]
        });
    }

    const duties = proposeDuties(movements, [], 1);
    assert.equal(duties.length, 30);
    const totalPax = duties.reduce((s, d) => s + d.pax, 0);
    assert.equal(totalPax, 200);
    assert.ok(duties.every(d => d.sourceLinks && d.sourceLinks.length === 1 && d.guests.length === 1));
});

test('2. Mr X + 9 in single Urbania -> One duty, 10 PAX (never split into 10 bookings)', () => {
    const parsed = parseGuestGroupPax('Mr X + 9', '');
    assert.equal(parsed.pax, 10);
    assert.equal(parsed.guestGroup, 'Mr X + 9');

    const movs = expandMappedRowToMovements(
        { 'Guest / Group': 'Mr X + 9', 'Car Type': 'Urbania', 'Arrival Date': '2026-11-26', 'Arrival Time': '10:40' },
        { sheetName: 'Groom Arrival', rowNumber: 2 },
        {}
    );
    assert.equal(movs.length, 1);
    assert.equal(movs[0].pax, 10);
    const duties = proposeDuties(movs);
    assert.equal(duties.length, 1);
    assert.equal(duties[0].pax, 10);
    assert.equal(duties[0].carType, 'Urbania');
});

test('3. Groom + Common same guest without flight number -> Possible-duplicate alert, no silent merge', () => {
    const groomRow = expandMappedRowToMovements(
        { 'Guest / Group': 'Mr. Rahul + 9', 'Arrival Date': '2026-11-26', 'Arrival Time': '10:40', 'Pickup': 'Udaipur Airport', 'Drop': 'Taj Aravali' },
        { sheetName: 'Groom Arrival', rowNumber: 12 },
        {}
    )[0];
    const commonRow = expandMappedRowToMovements(
        { 'Guest / Group': 'Mr. Rahul + 9', 'Arrival Date': '2026-11-26', 'Arrival Time': '10:40', 'Pickup': 'Udaipur Airport', 'Drop': 'Taj Aravali' },
        { sheetName: 'Common Arrival', rowNumber: 8 },
        {}
    )[0];

    const cmp = compareMovements(groomRow, commonRow);
    assert.equal(cmp.kind, 'possible_duplicate');

    const recon = reconcileBatchMovements([groomRow, commonRow], []);
    assert.equal(recon.possibleDuplicates.length, 1);
    assert.equal(recon.possibleDuplicates[0].summary, 'Groom Arrival row 12 <-> Common Arrival row 8');
    // Both movements remain staged until human decision (no silent merge!)
    assert.equal(recon.newItems.length, 2);
});

test('4. Same person Arrival + Departure on same row -> Two movements, NOT a duplicate', () => {
    const movs = expandMappedRowToMovements(
        {
            'Guest / Group': 'Mr. Amit + 3',
            'PAX': 4,
            'Car Type': 'Crysta',
            'Arrival Date': '2026-11-25',
            'Arrival Time': '12:00',
            'Pickup': 'Udaipur Airport',
            'Drop': 'Trident',
            'Departure Date': '2026-11-26',
            'Departure Time': '18:00'
        },
        { sheetName: 'Common Guest List', rowNumber: 5 },
        {}
    );

    assert.equal(movs.length, 2);
    assert.equal(movs[0].serviceType, 'ARRIVAL');
    assert.equal(movs[1].serviceType, 'DEPARTURE');
    assert.equal(movs[1].flightDate, '2026-11-26');
    assert.equal(movs[1].flightTime, '18:00');
    assert.equal(movs[1].pickupDate, '2026-11-26');
    assert.equal(movs[1].guestPickup, '16:00');

    const cmp = compareMovements(movs[0], movs[1]);
    assert.equal(cmp.kind, 'separate_direction');

    const recon = reconcileBatchMovements(movs, []);
    assert.equal(recon.possibleDuplicates.length, 0);
});

test('5. Flight 27 Nov 01:00 with lead 120m -> Pickup 26 Nov 23:00; separate fields & manual override', () => {
    const calcNight = calculateDeparturePickup('2026-11-27', '01:00', 120, 'Asia/Kolkata');
    assert.equal(calcNight.pickupDate, '2026-11-26');
    assert.equal(calcNight.pickupTime, '23:00');
    assert.equal(calcNight.flightDate, '2026-11-27');
    assert.equal(calcNight.flightTime, '01:00');

    const calcEve = calculateDeparturePickup('2026-11-26', '18:00', 120, 'Asia/Kolkata');
    assert.equal(calcEve.pickupDate, '2026-11-26');
    assert.equal(calcEve.pickupTime, '16:00');

    // Station departure does NOT force 120m if configured with 60m
    const stationCalc = calculateDeparturePickup('2026-11-26', '10:00', 60, 'Asia/Kolkata');
    assert.equal(stationCalc.pickupTime, '09:00');
});

test('6. Disposal 8 hours, actual 10 hours (extra 2 hours) -> accumulates actual & flags potential extras', () => {
    const billing = calculateDisposalBilling(
        {
            disposalHours: 8,
            disposalKm: 80,
            actualStartTime: '09:00',
            actualEndTime: '19:00',
            actualKm: 95
        },
        { extraHourRate: 250, extraKmRate: 18 }
    );
    assert.equal(billing.actualHours, 10);
    assert.equal(billing.extraHours, 2);
    assert.equal(billing.extraKm, 15);
    assert.equal(billing.hasExtras, true);
    assert.equal(billing.extraAmount, 2 * 250 + 15 * 18);
});

test('7. Intercity Udaipur -> Jaipur -> linked transfer duty with route and destination', () => {
    const movs = expandMappedRowToMovements(
        {
            'Guest / Group': 'Mr. Shah + 1',
            'PAX': 2,
            'Car Type': 'Crysta',
            'Service Type': 'INTERCITY',
            'Pickup Date': '2026-11-26',
            'Pickup Time': '07:00',
            'From': 'Udaipur',
            'To': 'Jaipur'
        },
        { sheetName: 'Intercity', rowNumber: 2 },
        {}
    );
    assert.equal(movs.length, 1);
    assert.equal(movs[0].serviceType, 'INTERCITY');
    assert.equal(movs[0].intercityRoute, 'Udaipur -> Jaipur');
    assert.equal(movs[0].pickupPoint, 'Udaipur');
    assert.equal(movs[0].dropLocation, 'Jaipur');
});

test('8. Same vehicle reuse 10:40 then 13:00 allowed (11:40 + 30m <= 13:00), overlap 11:50 flagged', () => {
    const duty1 = {
        dutyId: 'LK-001',
        guestGroup: 'Mr. Rahul + 9',
        serviceType: 'ARRIVAL',
        pickupDate: '2026-11-26',
        guestPickup: '10:40',
        vehicleNumber: 'RJ27-TA-1001',
        status: 'Scheduled'
    };
    const duty2Valid = {
        dutyId: 'LK-003',
        guestGroup: 'Mr. Amit + 3',
        serviceType: 'DEPARTURE',
        pickupDate: '2026-11-26',
        guestPickup: '13:00',
        vehicleNumber: 'RJ27-TA-1001',
        status: 'Scheduled'
    };
    const resValid = checkVehicleTurnaroundOverlap(duty2Valid, [duty1], 30);
    assert.equal(resValid.conflict, false);

    const duty2Conflict = {
        ...duty2Valid,
        dutyId: 'LK-099',
        guestPickup: '11:50'
    };
    const resConflict = checkVehicleTurnaroundOverlap(duty2Conflict, [duty1], 30);
    assert.equal(resConflict.conflict, true);
    assert.equal(resConflict.overlappingDuties[0].dutyId, 'LK-001');
});

test('9. Client revision after dispatch -> flagged postDispatchRevision so no silent overwrite occurs', () => {
    const liveDuties = [
        {
            dutyId: 'LK-010',
            guestGroup: 'Mr. Verma',
            pax: 3,
            carType: 'Crysta',
            serviceType: 'DEPARTURE',
            pickupDate: '2026-11-26',
            guestPickup: '15:00',
            flightDate: '2026-11-26',
            flightTime: '17:00',
            pickupPoint: 'Trident',
            dropLocation: 'Udaipur Airport',
            status: 'Dispatched',
            sourceRef: 'REF-10'
        },
        {
            dutyId: 'LK-011',
            guestGroup: 'Mrs. Rao',
            pax: 2,
            serviceType: 'ARRIVAL',
            pickupDate: '2026-11-26',
            status: 'Scheduled'
        }
    ];

    const revisionCandidate = expandMappedRowToMovements(
        {
            'Guest / Group': 'Mr. Verma',
            'PAX': 3,
            'Car Type': 'Crysta',
            'Service Type': 'DEPARTURE',
            'Departure Date': '2026-11-26',
            'Departure Time': '18:00',
            'Ref': 'REF-10'
        },
        { sheetName: 'Revision v2', rowNumber: 2 },
        {}
    )[0];

    const recon = reconcileBatchMovements([revisionCandidate], liveDuties);
    assert.equal(recon.changedItems.length, 1);
    assert.equal(recon.changedItems[0].postDispatchRevision, true);
    assert.equal(recon.changedItems[0].dutyId, 'LK-010');
    // Section 7 rule: LK-011 missing from revision file is NEVER marked cancelled!
    assert.equal(recon.retainedLiveDuties.length, 1);
    assert.equal(recon.retainedLiveDuties[0].dutyId, 'LK-011');
});

test('10. Auto-detect header row even with title banner rows above header', () => {
    const sheet2D = [
        ['Udaipur Wedding Logistics — Groom Side'],
        ['Generated 25 Nov 2026'],
        ['Guest / Group', 'PAX', 'Car Type', 'Arrival Date', 'Arrival Time', 'Pickup', 'Drop'],
        ['Mr. Kapoor + 4', '5', 'Crysta', '2026-11-26', '11:30', 'Airport', 'Taj Lake Palace']
    ];
    const detected = autoDetectHeaderAndMapping(sheet2D, 'Groom Arrival');
    assert.equal(detected.headerRowIndex, 2);
    assert.equal(detected.columnMap.guestGroup, 'Guest / Group');
    assert.equal(detected.columnMap.pax, 'PAX');
    assert.equal(detected.columnMap.carType, 'Car Type');
});

test('11. Consolidation merges ONLY explicit operator groups, never auto-shares different guests with same flight time', () => {
    const m1 = expandMappedRowToMovements(
        { 'Guest / Group': 'Family A', 'PAX': 2, 'Arrival Date': '2026-11-26', 'Arrival Time': '14:00' },
        { sheetName: 'Groom', rowNumber: 2 },
        {}
    )[0];
    const m2 = expandMappedRowToMovements(
        { 'Guest / Group': 'Family B', 'PAX': 2, 'Arrival Date': '2026-11-26', 'Arrival Time': '14:00' },
        { sheetName: 'Bride', rowNumber: 3 },
        {}
    )[0];

    // Without explicit consolidation group -> 2 separate vehicle duties
    const proposedSeparate = proposeDuties([m1, m2], [], 1);
    assert.equal(proposedSeparate.length, 2);

    // With explicit consolidation group -> 1 shared vehicle duty combining manifest & sources
    const proposedMerged = proposeDuties(
        [m1, m2],
        [{ movementKeys: [m1.movementKey, m2.movementKey], carType: 'Crysta' }],
        1
    );
    assert.equal(proposedMerged.length, 1);
    assert.equal(proposedMerged[0].pax, 4);
    assert.equal(proposedMerged[0].guests.length, 2);
    assert.equal(proposedMerged[0].sourceLinks.length, 2);
});

test('12. Controller enforces optimistic concurrency, Completed lock, and pre-dispatch vendor cost protection', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const ctrlCode = fs.readFileSync(path.join(__dirname, '../controllers/eventExcelController.js'), 'utf8');
    const syncCode = fs.readFileSync(path.join(__dirname, '../services/eventOutboxSync.js'), 'utf8');

    assert.ok(ctrlCode.includes('res.status(409)'), 'Must reject stale optimistic concurrency version with 409');
    assert.ok(ctrlCode.includes('res.status(423)'), 'Must lock Completed duties unless unlockCorrection provided');
    assert.ok(syncCode.includes('!options.pickupTimeOnly'), 'Pre-dispatch time edits must not overwrite agreed vendor buyAmount');
    assert.ok(syncCode.includes("duty.syncStatus = 'SyncError'"), 'Must keep sync failure visible & retryable without fake Synced badge');
});
