import { DateTime } from "luxon";
import moment from "moment";
import PumpReport from "../models/PumpReport.js";

const getPumpStatus = (rowData) => ({
  pump1: rowData.P1_ON_FB && rowData.P1_P2_ON_FB,
  pump2: rowData.P2_ON_FB && rowData.P1_P2_ON_FB
});

const getLogDateTime = (timestamp) => {
  const dateTime = DateTime.fromJSDate(new Date(timestamp), { zone: 'Asia/Kolkata' });
  return {
    logDate: dateTime.toFormat('dd-MM-yyyy'),
    time: dateTime.toFormat('HH:mm:ss'),
    dateStr: dateTime.toFormat('yyyy-MM-dd'),
    dateTime
  };
};

// energy report
export const energyReport = async (req, res) => {
  try {
    const { startDate, endDate, siteId } = req.query;

    if (!siteId) {
      return res.status(400).json({ message: 'Site ID is required.' });
    }

    let filter = { siteId: String(siteId) };

    if (startDate && endDate) {
      let startDateTime = DateTime.fromISO(startDate, { zone: 'Asia/Kolkata' });
      if (!startDateTime.isValid) {
        startDateTime = DateTime.fromFormat(startDate, 'yyyy-MM-dd', { zone: 'Asia/Kolkata' });
      }
      let endDateTime = DateTime.fromISO(endDate, { zone: 'Asia/Kolkata' });
      if (!endDateTime.isValid) {
        endDateTime = DateTime.fromFormat(endDate, 'yyyy-MM-dd', { zone: 'Asia/Kolkata' });
      }

      if (!startDateTime.isValid || !endDateTime.isValid) {
        return res.status(400).json({ message: 'Invalid date format' });
      }

      startDateTime = startDateTime.startOf('day');
      endDateTime = endDateTime.endOf('day');

      filter.timeStamp = { $gte: startDateTime.toJSDate(), $lte: endDateTime.toJSDate() };
    }

    const reports = await PumpReport.find(filter).sort({ timeStamp: 1 });

    if (!reports || reports.length === 0) {
      return res.status(404).json({ message: 'No data available for the selected site.' });
    }

    const formattedReports = reports.map((report) => {
      const timestampIST = DateTime.fromJSDate(report.timeStamp, { zone: 'Asia/Kolkata' });
      const rowData = report.data || {};
      const { pump1, pump2 } = getPumpStatus(rowData);

      let pumpData = [];

      const pumps = [
        { id: 'P1', name: 'PUMP 1', status: pump1, kwhField: 'P1_KWH' },
        { id: 'P2', name: 'PUMP 2', status: pump2, kwhField: 'P2_KWH' }
      ];

      pumps.forEach((pump) => {
        if (pump.status) {
          pumpData.push({
            pump: pump.name,
            kwh: rowData[pump.kwhField] !== undefined ? Number(rowData[pump.kwhField]).toFixed(2) : '0.00',
            voltage: (rowData[`${pump.id}_VOLT_AVG_LL`] || 0).toFixed(2),
            frequency: (rowData[`${pump.id}_FREQ`] || 0).toFixed(2),
            current: (rowData[`${pump.id}_CURR_AVG`] || 0).toFixed(2),
            powerfactor: (rowData[`${pump.id}_PF`] || 0).toFixed(2)
          });
        }
      });

      return {
        site: report.topic || 'Unknown',
        siteId: report.siteId,
        date: timestampIST.toFormat('dd-MM-yyyy'),
        time: timestampIST.toFormat('HH:mm'),
        pumps: pumpData
      };
    }).filter(report => report.pumps.length > 0);

    if (!formattedReports.length) {
      return res.status(404).json({ message: 'No active pump data available for the selected site.' });
    }
    res.json(formattedReports);
  } catch (error) {
    console.error('Error Fetching Reports:', error.message);
    res.status(500).json({ error: 'Server Error' });
  }
};

// energy consumption report
export const EnergyConsumptionReport = async (req, res) => {
  try {
    const { startDate, endDate, siteId } = req.query;
    if (!siteId || !startDate || !endDate) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    let startDateTime = DateTime.fromISO(startDate, { zone: 'Asia/Kolkata' });
    if (!startDateTime.isValid) {
      startDateTime = DateTime.fromFormat(startDate, 'yyyy-MM-dd', { zone: 'Asia/Kolkata' });
    }
    let endDateTime = DateTime.fromISO(endDate, { zone: 'Asia/Kolkata' });
    if (!endDateTime.isValid) {
      endDateTime = DateTime.fromFormat(endDate, 'yyyy-MM-dd', { zone: 'Asia/Kolkata' });
    }

    if (!startDateTime.isValid || !endDateTime.isValid) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    startDateTime = startDateTime.startOf('day');
    endDateTime = endDateTime.endOf('day');

  
    const dailyReports = await PumpReport.find({
      siteId: String(siteId),
      timeStamp: { $gte: startDateTime.toJSDate(), $lte: endDateTime.toJSDate() }
    }).sort({ timeStamp: 1 });

    if (!dailyReports.length) {
      return res.status(404).json({ message: 'No data available' });
    }

    
    const monthKeys = new Set();
    dailyReports.forEach(report => {
      const monthKey = DateTime.fromJSDate(report.timeStamp, { zone: 'Asia/Kolkata' }).toFormat('yyyy-MM');
      monthKeys.add(monthKey);
    });

   
    const monthlyData = {};
    for (const monthKey of monthKeys) {
      const [year, month] = monthKey.split('-');
      const monthStart = DateTime.fromObject({ year, month, day: 1 }, { zone: 'Asia/Kolkata' }).startOf('day');
      const monthEnd = monthStart.endOf('month');

      const monthlyReports = await PumpReport.find({
        siteId: String(siteId),
        timeStamp: { $gte: monthStart.toJSDate(), $lte: monthEnd.toJSDate() }
      }).sort({ timeStamp: 1 });

      monthlyData[monthKey] = { 'PUMP 1': 0, 'PUMP 2': 0 };

      const groupedByDate = monthlyReports.reduce((acc, report) => {
        const dateStr = DateTime.fromJSDate(report.timeStamp, { zone: 'Asia/Kolkata' }).toFormat('yyyy-MM-dd');
        if (!acc[dateStr]) {
          acc[dateStr] = { 'PUMP 1': [], 'PUMP 2': [] };
        }
        const { pump1: pump1Status, pump2: pump2Status } = getPumpStatus(report.data);
        if (pump1Status) {
          acc[dateStr]['PUMP 1'].push({ kwh: report.data.P1_KWH, timeStamp: report.timeStamp });
        }
        if (pump2Status) {
          acc[dateStr]['PUMP 2'].push({ kwh: report.data.P2_KWH, timeStamp: report.timeStamp });
        }
        return acc;
      }, {});

      Object.values(groupedByDate).forEach(dateGroup => {
        ['PUMP 1', 'PUMP 2'].forEach(pumpId => {
          const records = dateGroup[pumpId];
          if (records.length > 0) {
            const sortedRecords = records.sort((a, b) => new Date(a.timeStamp) - new Date(b.timeStamp));
            const dailyKwh = sortedRecords[sortedRecords.length - 1].kwh - sortedRecords[0].kwh;
            monthlyData[monthKey][pumpId] += dailyKwh;
          }
        });
      });
    }


    const groupedData = dailyReports.reduce((acc, report, index) => {
      const { logDate, dateTime } = getLogDateTime(report.timeStamp);
      const recordDateStr = dateTime.toFormat('yyyy-MM-dd');

      if (dateTime < startDateTime || dateTime > endDateTime) {
        return acc;
      }

      if (!acc[recordDateStr]) {
        acc[recordDateStr] = {
          date: recordDateStr,
          pumps: [
            { pumpId: 'PUMP 1', firstKwh: null, lastKwh: null, dailyKwh: 0, records: [] },
            { pumpId: 'PUMP 2', firstKwh: null, lastKwh: null, dailyKwh: 0, records: [] }
          ]
        };
      }

      const { pump1: pump1Status, pump2: pump2Status } = getPumpStatus(report.data);

      if (pump1Status) {
        acc[recordDateStr].pumps[0].records.push({
          kwh: report.data.P1_KWH,
          timeStamp: report.timeStamp
        });
      }

      if (pump2Status) {
        acc[recordDateStr].pumps[1].records.push({
          kwh: report.data.P2_KWH,
          timeStamp: report.timeStamp
        });
      }

      const isLastReport = index === dailyReports.length - 1;
      const nextDateStr = isLastReport ? null : getLogDateTime(dailyReports[index + 1].timeStamp).dateTime.toFormat('yyyy-MM-dd');

      if (isLastReport || recordDateStr !== nextDateStr) {
        const group = acc[recordDateStr];
        group.pumps.forEach(pump => {
          if (pump.records.length > 0) {
            const sortedRecords = pump.records.sort((a, b) => new Date(a.timeStamp) - new Date(b.timeStamp));
            pump.firstKwh = sortedRecords[0].kwh;
            pump.lastKwh = sortedRecords[sortedRecords.length - 1].kwh;
            pump.dailyKwh = pump.lastKwh - pump.firstKwh;
          }
        });
      }

      return acc;
    }, {});

    const results = Object.values(groupedData).flatMap(({ date, pumps }) => {
      const monthKey = DateTime.fromISO(date, { zone: 'Asia/Kolkata' }).toFormat('yyyy-MM');
      return pumps
        .filter(pump => pump.records.length > 0)
        .map(pump => ({
          Date: date,
          pump: pump.pumpId,
          'daily kWh': pump.dailyKwh.toFixed(2),
          'monthly kWh': monthlyData[monthKey][pump.pumpId].toFixed(2)
        }));
    });

    if (!results.length) {
      return res.status(404).json({ message: 'No energy consumption data found' });
    }

    res.json(results);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: error.message || 'Server Error' });
  }
};

// pump hours report
const calculatePumpHours = (startTime, stopTime, logDate) => {
  const start = DateTime.fromFormat(`${logDate} ${startTime}`, 'dd-MM-yyyy HH:mm:ss', { zone: 'Asia/Kolkata' });
  let stop = DateTime.fromFormat(`${logDate} ${stopTime}`, 'dd-MM-yyyy HH:mm:ss', { zone: 'Asia/Kolkata' });

  if (!start.isValid || !stop.isValid) {
    return 0;
  }

  if (stop < start) {
    stop = stop.plus({ days: 1 });
  }

  const dayStart = start.startOf('day');
  const dayEnd = start.endOf('day');
  const cappedStart = start < dayStart ? dayStart : start;
  const cappedEnd = stop > dayEnd ? dayEnd : stop;

  if (cappedStart >= cappedEnd) {
    return 0;
  }

  const hours = cappedEnd.diff(cappedStart, 'minutes').minutes / 60;
  return hours;
};

const minutesToTimeFormat = (minutes) => {
  const totalMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

export const pumpingReport = async (req, res) => {
  try {
    const { startDate, endDate, siteId } = req.query;
    if (!siteId || !startDate || !endDate) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    let startDateTime = DateTime.fromISO(startDate, { zone: 'Asia/Kolkata' });
    if (!startDateTime.isValid) {
      startDateTime = DateTime.fromFormat(startDate, 'yyyy-MM-dd', { zone: 'Asia/Kolkata' });
    }
    let endDateTime = DateTime.fromISO(endDate, { zone: 'Asia/Kolkata' });
    if (!endDateTime.isValid) {
      endDateTime = DateTime.fromFormat(endDate, 'yyyy-MM-dd', { zone: 'Asia/Kolkata' });
    }

    if (!startDateTime.isValid || !endDateTime.isValid) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    startDateTime = startDateTime.startOf('day');
    endDateTime = endDateTime.endOf('day');

    // Determine the month range for monthly data
    const monthStart = startDateTime.startOf('month');
    const monthEnd = endDateTime.endOf('month');


    const monthlyReports = await PumpReport.find({
      siteId: String(siteId),
      timeStamp: { $gte: monthStart.toJSDate(), $lte: monthEnd.toJSDate() }
    }).sort({ timeStamp: 1 });

    if (!monthlyReports.length) {
      return res.status(404).json({ message: 'No data available' });
    }

 
    const monthlyData = monthlyReports.reduce((acc, report) => {
      const { logDate, time, dateStr, dateTime } = getLogDateTime(report.timeStamp);
      const monthKey = dateTime.toFormat('yyyy-MM');

      if (!acc[monthKey]) {
        acc[monthKey] = { 'PUMP 1': 0, 'PUMP 2': 0 };
      }

      if (!acc.current) {
        acc.current = {
          dateStr,
          pumps: [
            { pumpId: 'PUMP 1', running: false, start: null },
            { pumpId: 'PUMP 2', running: false, start: null }
          ]
        };
      }

      const { pump1: pump1Status, pump2: pump2Status } = getPumpStatus(report.data);

      acc.current.pumps.forEach((pump, idx) => {
        const status = idx === 0 ? pump1Status : pump2Status;

        if (status && !pump.running) {
          pump.running = true;
          pump.start = { logDate, time };
        } else if (!status && pump.running && pump.start) {
          if (pump.start.logDate === logDate) {
            const hours = calculatePumpHours(pump.start.time, time, logDate);
            acc[monthKey][pump.pumpId] += hours * 60;
          }
          pump.running = false;
          pump.start = null;
        }
      });

      const isLastReport = report === monthlyReports[monthlyReports.length - 1];
      const nextDateStr = isLastReport ? null : getLogDateTime(monthlyReports[monthlyReports.indexOf(report) + 1].timeStamp).dateStr;

      if (isLastReport || dateStr !== nextDateStr) {
        acc.current.pumps.forEach((pump) => {
          if (pump.running && pump.start && pump.start.logDate === logDate) {
            const hours = calculatePumpHours(pump.start.time, time, logDate);
            acc[monthKey][pump.pumpId] += hours * 60;
            pump.running = false;
            pump.start = null;
          }
        });
        acc.current = null;
      }

      return acc;
    }, {});

    const reports = await PumpReport.find({
      siteId: String(siteId),
      timeStamp: { $gte: startDateTime.toJSDate(), $lte: endDateTime.toJSDate() }
    }).sort({ timeStamp: 1 });

    if (!reports.length) {
      return res.status(404).json({ message: 'No data available' });
    }


    const groupedData = reports.reduce(
      (acc, report, index) => {
        const { logDate, time, dateStr, dateTime } = getLogDateTime(report.timeStamp);

        if (dateTime < startDateTime || dateTime > endDateTime) {
          return acc;
        }

        if (!acc.groupedData[dateStr]) {
          acc.groupedData[dateStr] = {
            date: dateStr,
            pumps: [
              { pumpId: 'PUMP 1', running: false, start: null, dailyMinutes: 0 },
              { pumpId: 'PUMP 2', running: false, start: null, dailyMinutes: 0 }
            ]
          };
        }

        const { pump1: pump1Status, pump2: pump2Status } = getPumpStatus(report.data);
        const group = acc.groupedData[dateStr];

        group.pumps.forEach((pump, idx) => {
          const status = idx === 0 ? pump1Status : pump2Status;

          if (status && !pump.running) {
            pump.running = true;
            pump.start = { logDate, time };

          } else if (!status && pump.running && pump.start) {
            if (pump.start.logDate === logDate) {
              const hours = calculatePumpHours(pump.start.time, time, logDate);
              pump.dailyMinutes += hours * 60;
            }
            pump.running = false;
            pump.start = null;

          }
        });

        const isLastReport = index === reports.length - 1;
        const nextDateStr = isLastReport ? null : getLogDateTime(reports[index + 1].timeStamp).dateStr;

        if (isLastReport || dateStr !== nextDateStr) {
          group.pumps.forEach((pump) => {
            if (pump.running && pump.start && pump.start.logDate === logDate) {
              const hours = calculatePumpHours(pump.start.time, time, logDate);
              pump.dailyMinutes += hours * 60;
              pump.running = false;
              pump.start = null;

            }
          });
        }

        return acc;
      },
      { groupedData: {} }
    ).groupedData;

    const results = Object.values(groupedData).flatMap(({ date, pumps }) => {
      const monthKey = DateTime.fromISO(date, { zone: 'Asia/Kolkata' }).toFormat('yyyy-MM');
      return pumps
        .filter((pump) => pump.dailyMinutes > 0)
        .map((pump) => ({
          Date: date,
          pump: pump.pumpId,
          'daily pumping hours': minutesToTimeFormat(pump.dailyMinutes),
          'monthly pumping hours': minutesToTimeFormat(monthlyData[monthKey]?.[pump.pumpId] || 0)
        }));
    });

    if (!results.length) {
      return res.status(404).json({ message: 'No active pumps found' });
    }

    res.json(results);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: error.message || 'Server Error' });
  }
};

// flow report
export const flowReport = async (req, res) => {
  try {
    const { startDate, endDate, siteId } = req.query;


    if (!siteId) {
      return res.status(400).json({ message: 'Site ID is required.' });
    }
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start and end dates are required.' });
    }


    let startDateTime = DateTime.fromISO(startDate, { zone: 'Asia/Kolkata' });
    if (!startDateTime.isValid) {
      startDateTime = DateTime.fromFormat(startDate, 'yyyy-MM-dd', { zone: 'Asia/Kolkata' });
    }
    let endDateTime = DateTime.fromISO(endDate, { zone: 'Asia/Kolkata' });
    if (!endDateTime.isValid) {
      endDateTime = DateTime.fromFormat(endDate, 'yyyy-MM-dd', { zone: 'Asia/Kolkata' });
    }

    if (!startDateTime.isValid || !endDateTime.isValid) {
      return res.status(400).json({ message: 'Invalid date format' });
    }


    const dailyFilter = {
      siteId: String(siteId),
      timeStamp: {
        $gte: startDateTime.startOf('day').toJSDate(),
        $lte: endDateTime.endOf('day').toJSDate(),
      },
    };

    const monthlyFilter = {
      siteId: String(siteId),
      timeStamp: {
        $gte: startDateTime.startOf('month').toJSDate(),
        $lte: startDateTime.endOf('month').toJSDate(),
      },
    };

    const dailyReports = await PumpReport.find(dailyFilter).sort({ timeStamp: 1 });
    const monthlyReports = await PumpReport.find(monthlyFilter).sort({ timeStamp: 1 });

    if (!dailyReports.length) {
      return res.status(404).json({ message: 'No data available for the selected site and date range.' });
    }

    const monthlyFlows = {};
    for (const report of monthlyReports) {
      const { month } = getLogDateTime(report.timeStamp);
      const { pump1, pump2 } = getPumpStatus(report.data || {});
      const flow = Number(report.data?.DAILY_FLOW || 0);

      if (isNaN(flow) || flow <= 0) {
        continue;
      }

      const pumps = [
        { id: 'P1', active: pump1 },
        { id: 'P2', active: pump2 },
      ];

      for (const pump of pumps) {
        if (!pump.active) continue;
        const monthKey = `${month}-${pump.id}`;
        monthlyFlows[monthKey] = (monthlyFlows[monthKey] || 0) + flow;
      }
    }

    const dailyFlows = {};
    const result = [];
    const seen = new Set();

    for (const report of dailyReports) {
      const { logDate, dateStr, month } = getLogDateTime(report.timeStamp);
      const { pump1, pump2 } = getPumpStatus(report.data || {});
      const flow = Number(report.data?.DAILY_FLOW || 0);

      if (isNaN(flow) || flow <= 0) {
        continue;
      }

      const pumps = [
        { id: 'P1', active: pump1 },
        { id: 'P2', active: pump2 },
      ];

      for (const pump of pumps) {
        if (!pump.active) {
          continue;
        }

        const dayKey = `${dateStr}-${pump.id}`;
        const monthKey = `${month}-${pump.id}`;

        dailyFlows[dayKey] = (dailyFlows[dayKey] || 0) + flow;


        if (seen.has(dayKey)) continue;
        seen.add(dayKey);

        result.push({
          date: logDate,
          pumpId: pump.id,
          dailyFlow: dailyFlows[dayKey].toFixed(2),
          monthlyFlow: (monthlyFlows[monthKey] || dailyFlows[dayKey] || 0).toFixed(2),
        });
      }
    }

    if (!result.length) {
      return res.status(404).json({ message: 'No active pump data available for the selected site.' });
    }

    res.json(result);
  } catch (error) {
    console.error('Error Fetching Flow Report:', error.message);
    res.status(500).json({ error: 'Server Error' });
  }
};
