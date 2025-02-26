import { DateTime } from "luxon";
import moment from "moment";
import PumpReport from "../models/PumpReport.js";

export const getAllReports = async (req, res) => {
  try {
    const { startDate, endDate, siteId } = req.query;

    if (!siteId) {
      return res.status(400).json({ message: "Site ID is required." });
    }

    let filter = { siteId: String(siteId) };

    if (startDate && endDate) {
      const start = DateTime.fromFormat(startDate, "yyyy-MM-dd", { zone: "Asia/Kolkata" })
        .startOf("day")
        .toUTC()
        .toJSDate();
      const end = DateTime.fromFormat(endDate, "yyyy-MM-dd", { zone: "Asia/Kolkata" })
        .endOf("day")
        .toUTC()
        .toJSDate();

      filter.timeStamp = { $gte: start, $lte: end };
    }

    console.log("Querying MongoDB with:", filter);

    let reports = await PumpReport.find(filter).sort({ timeStamp: -1 });

   
    if (!reports || reports.length === 0) {
      return res.status(404).json({ message: "No data available for the selected site." });
    }

    const formattedReports = reports.map((report) => {
      const timestampIST = DateTime.fromJSDate(report.timeStamp, { zone: "Asia/Kolkata" });
      const rowData = report.data || {};

      const pump1 = rowData.P1_ON_FB && rowData.P1_P2_ON_FB;
      const pump2 = rowData.P2_ON_FB && rowData.P1_P2_ON_FB;

      let pumpData = [];
      if (pump1) {
        pumpData.push({
          pump: "PUMP 1",
          voltage: (rowData.P1_VOLT_AVG_LL || 0).toFixed(2),
          frequency: (rowData.P1_FREQ || 0).toFixed(2),
          current: (rowData.P1_CURR_AVG || 0).toFixed(2),
          powerfactor: (rowData.P1_PF || 0).toFixed(2),
        });
      }
      if (pump2) {
        pumpData.push({
          pump: "PUMP 2",
          voltage: (rowData.P2_VOLT_AVG_LL || 0).toFixed(2),
          frequency: (rowData.P2_FREQ || 0).toFixed(2),
          current: (rowData.P2_CURR_AVG || 0).toFixed(2),
          powerfactor: (rowData.P2_PF || 0).toFixed(2),
        });
      }

      return {
        site: report.topic,
        siteId: report.siteId,
        date: moment(report.timeStamp).format("DD-MM-YYYY"),
        time: timestampIST.toFormat("HH:mm"),
        pumps: pumpData,
      };
    });

    res.json(formattedReports);
  } catch (error) {
    console.error("Error Fetching Reports:", error);
    res.status(500).json({ error: "Server Error" });
  }
};


export const addReport = async (req, res) => {
  try {
    const { timeStamp, topic, siteId, data } = req.body;

    const newReport = new PumpReport({
      timeStamp,
      topic,
      siteId,
      data,
    });

    const savedReport = await newReport.save();
    res.json(savedReport);
  } catch (error) {
    console.error("Error adding report:", error);
    res.status(500).json({ error: "Failed to add report" });
  }
};
