const mongoose = require("mongoose");
require("dotenv").config();
mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const Booking = mongoose.model("Booking", new mongoose.Schema({}, { strict: false }));
    const companyId = new mongoose.Types.ObjectId("698ac8b01587e01651a49443");
    const bkgs = await Booking.find({ company: companyId, bookingStatus: "Completed" }).lean();
    const fys = {};
    bkgs.forEach(b => {
        const d = new Date(b.travelStartDate || b.travelEndDate || b.createdAt);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const fy = m >= 4 ? `FY ${String(y).slice(-2)}-${String(y+1).slice(-2)}` : `FY ${String(y-1).slice(-2)}-${String(y).slice(-2)}`;
        fys[fy] = (fys[fy] || 0) + 1;
    });
    console.log("FYs of completed bookings:", fys);
    process.exit(0);
});
