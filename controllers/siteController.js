import Site from '../models/site.js';

export const uploadSitesData = async (req, res) => {
  try {
    const sites = req.body;
    if (!Array.isArray(sites) || sites.length === 0) {
      return res.status(400).json({ error: 'Input must be a non-empty array of sites' });
    }

    const operations = sites.map(site => {
      if (!Array.isArray(site.params) || site.params.some(p => !p.label || !p.tagname)) {
        throw new Error(`Invalid params for site ${site.siteName}: must be an array of {label, tagname, unit} objects`);
      }
      if (site.priority !== undefined && !Number.isInteger(site.priority)) {
        throw new Error(`Invalid priority for site ${site.siteName}: must be an integer`);
      }
      return {
        updateOne: {
          filter: { siteName: site.siteName },
          update: { $set: site },
          upsert: true
        }
      };
    });

    await Site.bulkWrite(operations, { ordered: false });

    res.status(201).json({ message: 'Sites uploaded successfully' });
  } catch (error) {
    console.error('Upload error:', error.message);
    res.status(500).json({ error: 'Failed to upload sites' });
  }
};

export const getSiteByName = async (req, res) => {
  try {
    const { siteName } = req.params;
    const site = await Site.findOne({ siteName }).lean();
    console.log('Site data sent (including online status):', site);

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    res.status(200).json(site);
  } catch (error) {
    console.error('Get site error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve site' });
  }
};

export const getAllSites = async (req, res) => {
  try {
    const siteNames = await Site.aggregate([
      {
        $project: {
          _id: 0,
          siteName: 1,
          objecttype: 1,
          objectname: 1,
          tagnames: 1,
          online: 1,
          priority: 1 // Include priority in projection
        }
      },
      {
        $sort: { priority: 1 } // Sort by priority in ascending order
      }
    ]);
    res.status(200).json(siteNames);
  } catch (error) {
    console.error('Get site names error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve site names' });
  }
};
