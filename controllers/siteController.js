import Site from "../models/Site.js";

// Get all sites
export const getAllSites = async (req, res) => {
  try {
    const sites = await Site.find();
    res.json(sites);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

// Get site by ID
export const getSiteById = async (req, res) => {
  try {
    const site = await Site.findOne({ siteId: req.params.siteId });
    if (!site) {
      return res.status(404).json({ message: "Site not found" });
    }
    res.json(site);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

// Add a new site
export const addSite = async (req, res) => {
  try {
    const { siteId, siteName } = req.body;

    
    const existingSite = await Site.findOne({ siteId });
    if (existingSite) {
      return res.status(400).json({ message: "Site ID already exists" });
    }

    const newSite = new Site({ siteId, siteName });
    await newSite.save();

    res.status(201).json({ message: "Site added successfully", newSite });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};
