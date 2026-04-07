import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // BLS API Proxy
  app.get("/api/bls/us-macro", async (req, res) => {
    const apiKey = process.env.BLS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "BLS_API_KEY not configured" });
    }

    try {
      // Fetching CPI and Unemployment for the last few years
      const response = await fetch("https://api.bls.gov/publicAPI/v2/timeseries/data/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          seriesid: ["CUUR0000SA0", "LNS14000000"],
          startyear: "2021",
          endyear: "2026",
          registrationkey: apiKey,
        }),
      });

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("BLS API Error:", error);
      res.status(500).json({ error: "Failed to fetch data from BLS" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
