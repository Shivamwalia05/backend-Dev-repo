import express from "express";
import { energyReport,EnergyConsumptionReport,pumpingReport,flowReport } from "../controllers/reportController.js";

const router = express.Router();

router.get("/energyReport", energyReport); 
router.get("/energyConsumptionReport", EnergyConsumptionReport); 
router.get("/pumpingReport", pumpingReport); 
router.get("/flowReport", flowReport); 

export default router;
