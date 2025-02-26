import mongoose from "mongoose";

const PumpReportSchema = new mongoose.Schema({
  timeStamp: { type: Date, required: true },
  topic: { type: String, required: true }, 
  siteId: { type: String, required: true }, 

  data: {
    type: Object,
    required: false,
    default: {}
  }
});

const PumpReport = mongoose.model("PumpReport", PumpReportSchema, "PumpReport");

export default PumpReport;
