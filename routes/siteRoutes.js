import express from "express";
import { getAllSites, getSiteById, addSite } from "../controllers/siteController.js";

const router = express.Router();

router.get("/", getAllSites);
router.get("/:siteId", getSiteById);
router.post("/", addSite);

export default router;
