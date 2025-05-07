import express from "express";
import { energyReport,EnergyConsumptionReport,pumpingReport } from "../controllers/reportController.js";

const router = express.Router();

router.get("/energyReport", energyReport); 
router.get("/energyConsumptionReport", EnergyConsumptionReport); 
router.get("/pumpingReport", pumpingReport); 

export default router;
