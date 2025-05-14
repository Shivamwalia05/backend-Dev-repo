import mongoose from 'mongoose';

const ParamSchema = new mongoose.Schema({
  label: { type: String, required: true },
  value: { type: Number, required: true },
  unit: { type: String, required: true },
}, { _id: false }); 

const SiteSchema = new mongoose.Schema({
  siteName: { type: String, required: true },
  online: { type: Boolean, default: true },
  params: [ParamSchema],
});

export default mongoose.model('Site', SiteSchema);
