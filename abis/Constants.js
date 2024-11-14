const UniswapV2Factory = require('./UniswapV2Factory.json');
const GoldengNFT = require('./GoldengNFT.json');
const MemeCoin = require('./MemeCoinGG.json');

const contractABI_UNISWAP_FACTORY_V2 = UniswapV2Factory.abi;
const contractABI_NFT_COLLECTION = GoldengNFT.abi;
const contractABI_MEMECOIN = MemeCoin.abi;

module.exports = {
    contractABI_UNISWAP_FACTORY_V2: contractABI_UNISWAP_FACTORY_V2,
    contractABI_NFT_COLLECTION: contractABI_NFT_COLLECTION,
    contractABI_MEMECOIN: contractABI_MEMECOIN,
};
