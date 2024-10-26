const { Coinbase, Wallet } = require("@coinbase/coinbase-sdk");
const Database = require("@replit/database");
const express = require("express");
const app = express();

// Configure SDK and Database
Coinbase.configureFromJson({ filePath: "./.keys/cdp_api_key.json" });
const db = new Database();

app.use(express.json());

// Create wallet and associate with domain
app.post("/create-wallet", async (req, res) => {
  try {
    const { domainName } = req.body;

    if (!domainName) {
      return res.status(400).json({ error: "Domain name is required" });
    }

    const dbKey = `domain:${domainName}`;
    console.log("Checking domain:", dbKey);

    const existingWallet = await db.get(dbKey);
    console.log("Existing wallet check result:", existingWallet);

    if (existingWallet) {
      console.log("Found existing wallet for domain");
      return res.status(409).json({
        error: "Domain already has an associated wallet",
      });
    }

    console.log("No existing wallet found, creating new one...");
    const wallet = await Wallet.create();
    const address = await wallet.getDefaultAddress();

    const walletData = {
      address: address.toString(),
      walletData: wallet.export(),
    };

    console.log("Storing new wallet data for domain:", dbKey);
    await db.set(dbKey, walletData);
    console.log("Wallet data stored successfully");

    res.json({
      domainName,
      address: address.toString(),
      message: "Wallet created and associated with domain",
    });
  } catch (error) {
    console.error("Error in create-wallet:", error);
    res
      .status(500)
      .json({ error: "Failed to create wallet", details: error.message });
  }
});

// Get wallet info by domain
app.get("/wallet/:domainName", async (req, res) => {
  try {
    const { domainName } = req.params;
    const storedData = await db.get(`domain:${domainName}`);

    if (!storedData) {
      return res.status(404).json({
        error: "No wallet found for domain",
      });
    }

    const wallet = await Wallet.import(storedData.walletData);
    const address = await wallet.getDefaultAddress();
    const balances = await wallet.listBalances();

    res.json({
      domainName,
      address: address.toString(),
      balances: balances.toString(),
    });
  } catch (error) {
    console.error("Error fetching wallet:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch wallet", details: error.message });
  }
});

// Debug endpoint to list all domains
app.get("/debug/domains", async (req, res) => {
  try {
    const keys = await db.list();
    console.log("All database keys:", keys);

    const domains = {};
    for (const key of keys) {
      domains[key] = await db.get(key);
    }

    res.json({
      message: "Current database contents",
      keys: keys,
      domains: domains,
    });
  } catch (error) {
    console.error("Error in debug endpoint:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
