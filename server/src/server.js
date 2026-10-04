const express = require("express");
const cors = require("cors");
const config = require("./config/env");
const apiRouter = require("./routes/apiRouter");
const authRouter = require("./routes/authRouter");

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api", apiRouter);
app.use("/auth", authRouter);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date() });
});

app.listen(config.port, () => {
  console.log(`Backend server running on http://localhost:${config.port}`);
});
