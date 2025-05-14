import express from 'express';
import { uploadSitesData, getSiteByName, getAllSites } from '../controllers/siteController.js';

const router = express.Router();

router.post('/sites', uploadSitesData);
router.get('/sites/names', getAllSites);
router.get('/sites/:siteName', getSiteByName);

export default router;
