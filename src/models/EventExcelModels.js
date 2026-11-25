const mongoose = require('mongoose');

const sheetConfigSchema = new mongoose.Schema({
    sheetName: { type: String, required: true },
    selected: { type: Boolean, default: true },
    headerRowIndex: { type: Number, default: 0 },
    totalRows: { type: Number, default: 0 },
    headers: [{ type: String }],
    columnMap: { type: mongoose.Schema.Types.Mixed, default: {} },
    isDispatchSideBySide: { type: Boolean, default: false },
    sampleRows: { type: mongoose.Schema.Types.Mixed, default: [] }
}, { _id: false });

const eventImportBatchSchema = new mongoose.Schema({
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    revisionNumber: { type: Number, default: 1 },
    fileName: { type: String, default: 'client_workbook.xlsx' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    uploadedByName: { type: String, default: 'Admin' },
    sheetConfigs: [sheetConfigSchema],
    mappingTemplateName: { type: String, default: '' },
    status: {
        type: String,
        enum: ['Staged', 'Mapped', 'Reconciled', 'Committed', 'Cancelled'],
        default: 'Staged'
    },
    rawRowsCount: { type: Number, default: 0 },
    reconciliationReport: { type: mongoose.Schema.Types.Mixed, default: {} },
    operatorDecisions: { type: mongoose.Schema.Types.Mixed, default: {} },
    consolidationGroups: { type: mongoose.Schema.Types.Mixed, default: [] },
    committedAt: { type: Date, default: null }
}, { timestamps: true });

eventImportBatchSchema.index({ event: 1, revisionNumber: -1 });

const eventImportSourceRowSchema = new mongoose.Schema({
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'EventImportBatch', required: true, index: true },
    sheetName: { type: String, required: true },
    rowNumber: { type: Number, required: true },
    externalRef: { type: String, default: '' },
    rawData: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

eventImportSourceRowSchema.index({ batch: 1, sheetName: 1, rowNumber: 1 });

const sourceLinkSubSchema = new mongoose.Schema({
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'EventImportBatch', default: null },
    sourceRowId: { type: String, default: '' },
    sheetName: { type: String, default: '' },
    rowNumber: { type: Number, default: 0 },
    rawSnippet: { type: String, default: '' }
}, { _id: false });

const eventGuestMovementSchema = new mongoose.Schema({
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'EventImportBatch', default: null, index: true },
    movementKey: { type: String, required: true },
    guestGroup: { type: String, required: true },
    baseKey: { type: String, default: '' },
    phone: { type: String, default: '' },
    partySide: { type: String, default: 'Common' },
    pax: { type: Number, default: 1 },
    carType: { type: String, default: 'Crysta' },
    carTypeMissing: { type: Boolean, default: false },
    serviceType: { type: String, enum: ['ARRIVAL', 'DEPARTURE', 'DISPOSAL', 'INTERCITY', 'LOCAL'], default: 'ARRIVAL' },
    direction: { type: String, default: 'ARRIVAL' },
    isStation: { type: Boolean, default: false },
    pickupDate: { type: String, default: '' },
    guestPickup: { type: String, default: '' },
    flightDate: { type: String, default: '' },
    flightTime: { type: String, default: '' },
    flightNumber: { type: String, default: '' },
    pickupLeadMinutes: { type: Number, default: 120 },
    manualPickupOverride: { type: Boolean, default: false },
    needsPickupConfirm: { type: Boolean, default: false },
    pickupConfirmed: { type: Boolean, default: false },
    pickupPoint: { type: String, default: '' },
    dropLocation: { type: String, default: '' },
    disposalHours: { type: Number, default: 8 },
    disposalKm: { type: Number, default: 80 },
    intercityRoute: { type: String, default: '' },
    stopovers: { type: String, default: '' },
    vehicleNumber: { type: String, default: '' },
    vendorName: { type: String, default: '' },
    externalRef: { type: String, default: '' },
    remarks: { type: String, default: '' },
    sourceSheet: { type: String, default: '' },
    sourceRow: { type: Number, default: 0 },
    sourceLinks: [sourceLinkSubSchema],
    consolidationGroupId: { type: String, default: '' },
    approvedDutyRef: { type: mongoose.Schema.Types.ObjectId, ref: 'EventDuty', default: null },
    status: {
        type: String,
        enum: ['Staged', 'MergedDuplicate', 'Approved', 'Skipped'],
        default: 'Staged'
    },
    reconciliationNote: { type: String, default: '' }
}, { timestamps: true });

const dutyGuestSubSchema = new mongoose.Schema({
    movementId: { type: mongoose.Schema.Types.ObjectId, ref: 'EventGuestMovement', default: null },
    guestGroup: { type: String, default: '' },
    pax: { type: Number, default: 1 },
    phone: { type: String, default: '' },
    partySide: { type: String, default: '' },
    notes: { type: String, default: '' }
}, { _id: true });

const eventDutySchema = new mongoose.Schema({
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    dutyId: { type: String, required: true }, // Durable e.g. LK-001
    version: { type: Number, default: 1 }, // Optimistic concurrency version!

    guestGroup: { type: String, default: '' },
    pax: { type: Number, default: 1 },
    carType: { type: String, default: 'Crysta' },
    serviceType: {
        type: String,
        enum: ['ARRIVAL', 'DEPARTURE', 'DISPOSAL', 'INTERCITY', 'LOCAL'],
        default: 'ARRIVAL'
    },
    isStation: { type: Boolean, default: false },

    // Independent Flight/Train vs Guest Pickup timing
    pickupDate: { type: String, default: '' },
    guestPickup: { type: String, default: '' },
    flightDate: { type: String, default: '' },
    flightTime: { type: String, default: '' },
    flightNumber: { type: String, default: '' },
    arrivalEta: { type: String, default: '' },
    pickupLeadMinutes: { type: Number, default: 120 },
    manualPickupOverride: { type: Boolean, default: false },
    overrideReason: { type: String, default: '' },
    pickupConfirmed: { type: Boolean, default: false },

    // Route & Disposal / Intercity conditional fields
    pickupPoint: { type: String, default: '' },
    dropLocation: { type: String, default: '' },
    disposalPackage: { type: String, default: '8h / 80km' },
    disposalHours: { type: Number, default: 8 },
    disposalKm: { type: Number, default: 80 },
    plannedEndTime: { type: String, default: '' },
    actualStartTime: { type: String, default: '' },
    actualEndTime: { type: String, default: '' },
    actualKm: { type: Number, default: 0 },
    extraHours: { type: Number, default: 0 },
    extraKm: { type: Number, default: 0 },
    extraAmount: { type: Number, default: 0 },

    intercityRoute: { type: String, default: '' },
    stopovers: { type: String, default: '' },
    linkedReturnDutyId: { type: String, default: '' },

    // Vehicle & Vendor allocation
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
    vehicleNumber: { type: String, default: '' },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    driverName: { type: String, default: '' },
    driverPhone: { type: String, default: '' },
    vehicleSource: { type: String, enum: ['Own', 'Vendor'], default: 'Own' },
    vendorName: { type: String, default: '' },
    vendorCost: { type: Number, default: 0 },
    vendorCostApproved: { type: Boolean, default: false },
    vendorCancellationCharge: { type: Number, default: 0 },
    dutyAmount: { type: Number, default: 0 },

    // Linked legacy module references for single-duty sync
    drsDutyRef: { type: mongoose.Schema.Types.ObjectId, ref: 'DRSDuty', default: null },
    outsideVehicleRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },

    // Status & Lock
    status: {
        type: String,
        enum: ['Scheduled', 'Dispatched', 'Running', 'Completed', 'Cancelled'],
        default: 'Scheduled'
    },
    isLocked: { type: Boolean, default: false },
    cancellationReason: { type: String, default: '' },

    // Outbox Sync Status
    syncStatus: {
        type: String,
        enum: ['Pending', 'Synced', 'SyncError'],
        default: 'Pending'
    },
    syncError: { type: String, default: '' },
    lastSyncedAt: { type: Date, default: null },

    // Audit & Traceability
    guests: [dutyGuestSubSchema],
    sourceLinks: [sourceLinkSubSchema],
    sourceRef: { type: String, default: '' },
    rawSourceSheet: { type: String, default: '' },
    rawSourceRow: { type: Number, default: 0 },
    remarks: { type: String, default: '' }
}, { timestamps: true });

eventDutySchema.index({ event: 1, dutyId: 1 }, { unique: true });

const eventDutyChangeSchema = new mongoose.Schema({
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    duty: { type: mongoose.Schema.Types.ObjectId, ref: 'EventDuty', default: null, index: true },
    dutyId: { type: String, default: '' },
    version: { type: Number, default: 1 },
    changeType: {
        type: String,
        enum: ['Created', 'CellEdit', 'DrawerEdit', 'AssignVehicle', 'Merge', 'Split', 'RevisionApply', 'Cancel', 'StatusChange', 'SyncRetry'],
        default: 'CellEdit'
    },
    field: { type: String, default: '' },
    oldValue: { type: mongoose.Schema.Types.Mixed, default: null },
    newValue: { type: mongoose.Schema.Types.Mixed, default: null },
    reason: { type: String, default: '' },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'EventImportBatch', default: null },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    changedByName: { type: String, default: 'Admin' }
}, { timestamps: true });

const eventOutboxEventSchema = new mongoose.Schema({
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    duty: { type: mongoose.Schema.Types.ObjectId, ref: 'EventDuty', default: null, index: true },
    dutyId: { type: String, default: '' },
    idempotencyKey: { type: String, required: true },
    targetModule: { type: String, enum: ['DRS', 'VendorBook', 'MasterCalendar'], required: true },
    action: { type: String, enum: ['Upsert', 'Cancel', 'Delete'], default: 'Upsert' },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ['Pending', 'Completed', 'Failed'], default: 'Pending' },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: '' },
    completedAt: { type: Date, default: null }
}, { timestamps: true });

eventOutboxEventSchema.index({ event: 1, status: 1 });

const EventImportBatch = mongoose.model('EventImportBatch', eventImportBatchSchema);
const EventImportSourceRow = mongoose.model('EventImportSourceRow', eventImportSourceRowSchema);
const EventGuestMovement = mongoose.model('EventGuestMovement', eventGuestMovementSchema);
const EventDuty = mongoose.model('EventDuty', eventDutySchema);
const EventDutyChange = mongoose.model('EventDutyChange', eventDutyChangeSchema);
const EventOutboxEvent = mongoose.model('EventOutboxEvent', eventOutboxEventSchema);

module.exports = {
    EventImportBatch,
    EventImportSourceRow,
    EventGuestMovement,
    EventDuty,
    EventDutyChange,
    EventOutboxEvent
};
