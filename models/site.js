import mongoose from 'mongoose';

const ParamSchema = new mongoose.Schema({
  label: { type: String, required: true },
  tagname: { type: String, required: true },
}, { _id: false });

const SiteSchema = new mongoose.Schema({
  siteName: { type: String, required: true },
  online: { type: Boolean, default: true },
  objecttype: { type: String, required: true },
  objectname: { type: String, required: true },
  tagnames: { type: String, required: true },
  params: { type: mongoose.Schema.Types.Mixed, required: true },
});

export default mongoose.model('Site', SiteSchema);
