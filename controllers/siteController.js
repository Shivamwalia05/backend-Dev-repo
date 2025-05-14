import Site from '../models/site.js';

export const uploadSitesData = async (req, res) => {
  try {
    const sites = req.body;
    if (!Array.isArray(sites) || sites.length === 0) {
      return res.status(400).json({ error: 'Input must be a non-empty array of sites' });
    }

    const operations = sites.map(site => ({
      updateOne: {
        filter: { siteName: site.siteName },
        update: { $set: site },
        upsert: true
      }
    }));

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
    const [site] = await Site.aggregate([
      { $match: { siteName } },
      {
        $project: {
          siteName: 1,
          online: 1,
          params: {
            $arrayToObject: {
              $map: {
                input: "$params",
                as: "param",
                in: {
                  k: "$$param.label",
                  v: { value: "$$param.value", unit: "$$param.unit" }
                }
              }
            }
          }
        }
      }
    ]);

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
          online: 1
        }
      }
    ]);
    res.status(200).json(siteNames);
  } catch (error) {
    console.error('Get site names error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve site names' });
  }
};
