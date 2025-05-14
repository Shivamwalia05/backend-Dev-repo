import express from 'express';
import { uploadSitesData, getSiteByName, getSiteNames } from '../controllers/siteController.js';

const router = express.Router();

router.post('/sites', uploadSitesData);
router.get('/sites/names', getSiteNames);
router.get('/sites/:siteName', getSiteByName);

export default router;
