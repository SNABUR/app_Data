const express = require('express');
const { createRequest, fetchOnrampRequest } = require('./helpers'); // Ajusta la ruta de helpers si es necesario
const ethers = require("ethers");
const { Client } = require('pg');
const cors = require('cors'); // Importa el paquete cors
const app = express();
const { contractABI_UNISWAP_FACTORY_V2, contractABI_MEMECOIN, contractABI_NFT_COLLECTION } = require('./abis/Constants.js');
const port = 3000; // Puedes usar otro puerto si lo prefieres

app.use(cors({
  origin: ['http://localhost:5173'] // Restringe los orígenes permitidos
  //origin: ['https://ggeese.github.io'] // Restringe los orígenes permitidos
}));

// Middleware para parsear JSON
app.use(express.json());


/*const db = new Client({
  user: process.env.USER_DB_POSTGRES,
  host: process.env.HOST_DB_POSTGRES,
  database: process.env.DATABASE_DB_POSTGRES,
  password: process.env.PASSWORD_DB_POSTGRES,
  port: process.env.PORT_DB_POSTGRES,
});*/

const db = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'db_memes',
  password: '1M3M323_3-152G0553XD##',
  port: 5432,
});

db.connect();

// Endpoint para generar el token
app.post('/api/secure-token', async (req, res) => {
  try {
    const request_method = 'POST';
    const { url, jwt } = await createRequest({
      request_method,
      request_path: '/onramp/v1/token',
    });

    const { ethAddress, blockchains } = req.body;

    // Construir el cuerpo de la petición
    const body = {
      destination_wallets: [
        {
          address: ethAddress,
          blockchains: blockchains || ['base', 'ethereum'],
        },
      ],
    };

    // Llamar al helper para hacer la solicitud externa
    await fetchOnrampRequest({
      request_method,
      url,
      jwt,
      body: JSON.stringify(body),
      res,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error generating token' });
  }
});

app.get("/meme_pool", async (req, res) => {
  console.log("qwer1")

  const { contract, network, AMM } = req.query; // Obtener los valores de los query parameters 'contract', 'network' y 'AMM'
  //console.log(contract, network, AMM )
  // Verificar que los parámetros necesarios estén presentes
  if (!contract || !network || !AMM) {
      return res.status(400).json({ error: 'Contract, network, and AMM parameters are required' });
  }

  try {
      // Consultar la base de datos para obtener el router del AMM específico
      const routerQuery = `SELECT factory, weth FROM db_lp WHERE network = $1 AND AMM = $2 LIMIT 1`;
      const poolFactory = await db.query(routerQuery, [network, AMM]);
      if (poolFactory.rows.length === 0) {
          return res.status(404).json({ error: 'Factory and WETH not found for the specified network and AMM' });
      }
      const FactoryAddress = poolFactory.rows[0].factory;
      const wethAddress = poolFactory.rows[0].weth;

      // Consultar la base de datos para obtener el RPC del network específico
      const rpcQuery = `SELECT * FROM db_rpcs WHERE network = $1 LIMIT 1`;
      const rpcResult = await db.query(rpcQuery, [network]);

      const rpcUrl = rpcResult.rows[0].url;

      // Conectar al proveedor usando el RPC URL
      const provider = new ethers.JsonRpcProvider(rpcUrl);

      const FactoryContract = new ethers.Contract(FactoryAddress, contractABI_UNISWAP_FACTORY_V2, provider);

      // Lógica para obtener el par de liquidez correspondiente al contrato del token
      // Por ejemplo, puedes usar el contrato de pares para encontrar los tokens en el par
      const pairAddress = await FactoryContract.getPair(contract, wethAddress); // Modifica esto según el AMM específico

      // Devolver la información del pool
      res.json({
          pairAddress,
      });
  } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error fetching liquidity pool information' });
  }
});

app.get("/meme_data", async (req, res) => {
  const { contract_meme, network } = req.query; // Obtener los valores de los query parameters 'contract_meme' y 'network'
  
  console.log("Contract:", contract_meme, "Network:", network);
  
  // Verificar que los parámetros requeridos estén presentes
  if (!contract_meme || !network) {
    return res.status(400).json({ error: 'Contract and network parameters are required' });
  }

  try {
    // Consultar la base de datos para obtener el RPC del network específico
    const rpcQuery = `SELECT * FROM db_rpcs WHERE network = $1 LIMIT 1`;
    const rpcResult = await db.query(rpcQuery, [network]);

    // Verificar si se encontró un RPC
    if (rpcResult.rows.length === 0) {
      return res.status(404).json({ error: 'RPC not found for the specified network' });
    }

    const rpcUrl = rpcResult.rows[0].url;
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Asegurarse de que el contrato sea válido
    try {
      const tokenContract = new ethers.Contract(contract_meme, contractABI_MEMECOIN, provider);

      // Obtener las tarifas y detalles de protección del contrato
      const memefees = await tokenContract.getCurrentFee();
      const memefeestring = memefees.toString();

      const [startTrade, protectminutes] = await tokenContract.getProtectDetails();

      // Convertir startTrade y protectminutes a cadenas
      const startTradeString = startTrade.toString();
      const protectMinutesString = protectminutes.toString();

      // Devolver la información del contrato
      res.json({
        memefeestring,
        startTrade: startTradeString,
        protectminutes: protectMinutesString
      });

      console.log("Fees:", memefeestring, "Start Trade:", startTrade, "Protect Minutes:", protectminutes);
    } catch (contractError) {
      console.error("Error al interactuar con el contrato:", contractError);
      return res.status(500).json({ error: 'Error interacting with the contract' });
    }

  } catch (err) {
    console.error("Error general:", err);
    res.status(500).json({ error: 'Error fetching liquidity pool information' });
  }
});

app.get("/NFT-minted", async (req, res) => {
  const { contract_NFT, network } = req.query; // Obtener los valores de los query parameters 'contract_meme' y 'network'
  console.log("Contract:", contract_NFT, "Network:", network);
  
  // Verificar que los parámetros requeridos estén presentes
  if (!contract_NFT || !network) {
    return res.status(400).json({ error: 'Contract and network parameters are required' });
  }

  try {
    // Consultar la base de datos para obtener el RPC del network específico
    const rpcQuery = `SELECT * FROM db_rpcs WHERE network = $1 LIMIT 1`;
    const rpcResult = await db.query(rpcQuery, [network]);

    // Verificar si se encontró un RPC
    if (rpcResult.rows.length === 0) {
      return res.status(404).json({ error: 'RPC not found for the specified network' });
    }

    const rpcUrl = rpcResult.rows[0].url;
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Asegurarse de que el contrato sea válido
    try {
      const nFTContract = new ethers.Contract(contract_NFT, contractABI_NFT_COLLECTION, provider);

      // Obtener las tarifas y detalles de protección del contrato
      const currentMint = await nFTContract.getMintCount();
      
      const MintedNFT = currentMint.toString();

      // Devolver la información del contrato
      res.json({
        MintedNFT,
      });

      console.log("Fees:");
    } catch (contractError) {
      console.error("Error al interactuar con el contrato:", contractError);
      return res.status(500).json({ error: 'Error interacting with the contract' });
    }

  } catch (err) {
    console.error("Error general:", err);
    res.status(500).json({ error: 'Error fetching liquidity pool information' });
  }
    
});



// Iniciar el servidor
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
