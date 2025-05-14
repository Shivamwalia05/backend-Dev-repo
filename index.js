import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import reportRoutes from "./routes/reportRoutes.js";
import siteRoutes from "./routes/siteRoutes.js";

dotenv.config();

const app = express();

app.use(cors({ origin: "*" }));

app.use(express.json());


connectDB();

// Use Routes.
app.use("/api/report", reportRoutes);
app.use('/api', siteRoutes);

const PORT = process.env.PORT || 5000;


app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
