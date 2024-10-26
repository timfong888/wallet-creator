const { Coinbase, Wallet } = require("@coinbase/coinbase-sdk");
const express = require("express");
const app = express();

// Configure SDK with API key from uploaded file
Coinbase.configureFromJson({ filePath: "./.keys/cdp_api_key.json" });

// Simple in-memory storage (replace with proper database in production)
const domainWalletMap = new Map();

app.use(express.json());

// Root path handler
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to the Wallet-Domain API",
    endpoints: {
      create_wallet: 'POST /create-wallet with {"domainName": "example.com"}',
      get_wallet: "GET /wallet/:domainName",
    },
  });
});

// Create wallet and associate with domain
app.post("/create-wallet", async (req, res) => {
  try {
    const { domainName } = req.body;

    if (!domainName) {
      return res.status(400).json({ error: "Domain name is required" });
    }

    if (domainWalletMap.has(domainName)) {
      return res.status(409).json({
        error: "Domain already has an associated wallet",
      });
    }

    const wallet = await Wallet.create();
    const address = await wallet.getDefaultAddress();
    domainWalletMap.set(domainName, wallet.export());

    res.json({
      domainName,
      address: address.toString(),
      message: "Wallet created and associated with domain",
    });
  } catch (error) {
    console.error("Error creating wallet:", error);
    res
      .status(500)
      .json({ error: "Failed to create wallet", details: error.message });
  }
});

// Get wallet info by domain
app.get("/wallet/:domainName", async (req, res) => {
  try {
    const { domainName } = req.params;
    const walletData = domainWalletMap.get(domainName);

    if (!walletData) {
      return res.status(404).json({
        error: "No wallet found for domain",
      });
    }

    const wallet = await Wallet.import(walletData);
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
