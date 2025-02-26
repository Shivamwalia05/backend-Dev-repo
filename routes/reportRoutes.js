import express from "express";
import { getAllReports, addReport } from "../controllers/reportController.js";

const router = express.Router();

router.get("/", getAllReports); 
router.post("/", addReport); 

export default router;
