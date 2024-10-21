const { SignOptions, sign } = require("jsonwebtoken");
const crypto = require("crypto");
const fs = require("fs");
const { Coinbase, Wallet, CoinbaseOptions } = require("@coinbase/coinbase-sdk");

async function fetchApiCredentials() {
  const key = require("./api_keys/cdp_api_key.json");
  const key_name = key.name;
  const key_secret = key.privateKey;

  return { key_name, key_secret };
}

async function createRequest({ request_method, request_path }) {
  const { key_name, key_secret } = await fetchApiCredentials();
  const host = "api.developer.coinbase.com";

  const url = `https://${host}${request_path}`;
  const uri = `${request_method} ${host}${request_path}`;

  const payload = {
    iss: "coinbase-cloud",
    nbf: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 120,
    sub: key_name,
    uri,
  };

  const signOptions = {
    algorithm: "ES256",
    header: {
      kid: key_name,
      nonce: crypto.randomBytes(16).toString("hex"), // non-standard, coinbase-specific header that is necessary
    },
  };

  const jwt = sign(payload, key_secret, signOptions);

  return { url, jwt };
}

async function fetchOnrampRequest({ request_method, url, jwt, body, res }) {
  await fetch(url, {
    method: request_method,
    body: body,
    headers: { Authorization: "Bearer " + jwt },
  })
    .then((response) => response.json())
    .then((json) => {
      if (json.message) {
        console.error("Error:", json.message);
        res.status(500).json({ error: json.message });
      } else {
        res.status(200).json(json);
      }
    })
    .catch((error) => {
      console.log("Caught error: ", error);
      res.status(500);
    });
}

async function fetchWallet(network_id) {
  const { key_name, key_secret } = await fetchApiCredentials();
  const coinbaseOptions = {
    apiKeyName: key_name,
    privateKey: key_secret,
  };
  const coinbase = new Coinbase(coinbaseOptions);
  const seedFilePath = "wallet_seed/" + network_id + ".json";
  let wallet;

  if (!fs.existsSync(seedFilePath)) {
    console.log("Create Wallet");
    wallet = await Wallet.create({ networkId: network_id });

    const data = wallet.export();
    const jsonData = JSON.stringify(data);

    fs.writeFileSync(seedFilePath, jsonData);
    console.log(
      `Seed for wallet ${wallet.getId()} successfully saved to ${seedFilePath}.`
    );

    if (network_id == Coinbase.networks.BaseSepolia) {
      const faucetEthTransaction = await wallet.faucet();
      console.log(`Faucet transaction: ${faucetEthTransaction}`);
    }
  } else {
    console.log("Load Wallet");
    const fetchedData = JSON.parse(fs.readFileSync(seedFilePath, "utf8"));
    wallet = await Wallet.import({
      walletId: fetchedData.walletId,
      seed: fetchedData.seed,
    });
  }
  return { wallet };
}

// Exportar las funciones para usarlas en otros módulos
module.exports = {
  fetchApiCredentials,
  createRequest,
  fetchOnrampRequest,
  fetchWallet,
};
