import mongoose from "mongoose";

const siteSchema = new mongoose.Schema({
  siteId: String,
  siteName: String
});

const Site = mongoose.model("Site", siteSchema, "sites"); // Collection name: sites
export default Site;
