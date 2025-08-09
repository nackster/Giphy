import React, {useEffect, useState} from 'react';
import twitterLogo from './assets/twitter-logo.svg';
import './App.css';
import idl from './assets/idl.json'; // Import your IDL file for Solana program interaction
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
// Import necessary Solana libraries
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor';
import process from "process";
window.process = process;

// Constants
const TWITTER_HANDLE = '_buildspace';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const TEST_GIFS = [
  "https://media.giphy.com/media/13ZHjidRzoi7n2/giphy.gif",
  "https://media.giphy.com/media/l0ExncehJzexFpRHq/giphy.gif",
  "https://media.giphy.com/media/3o6ZtaO9BZHcOjmErm/giphy.gif",
];

const { SystemProgram, Keypair } = web3;

let baseAccount = Keypair.generate(); // Generate a new keypair for the base account
const programID = new PublicKey(idl.address); // Use the IDL metadata address for your program
const opts = {
  preflightCommitment: "processed",
};

let idlCache = null;

const network = clusterApiUrl('devnet'); // Use the Solana devnet for testing

const App = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [gifList, setGifList] = useState([]);
  const [initialized, setInitialized]   = useState(false);
  const checkIfWalletIsConnected = async() => {
    try{
        const {solana} = window;
        if(solana){
          if(solana.isPhantom){
            console.log("Phantom Wallet Found!");
            // Check if the wallet is connected
            const response = await solana.connect({onlyIfTrusted: true});
            console.log("Connected with Public Key:", response.publicKey.toString());
            // You can add additional logic here to handle the connected wallet state if needed
            setWalletAddress(response.publicKey.toString());
          }else{
            alert("Please connect to the Phantom Wallet 👻");
          }
        }else{
          alert("Solana object not found! Get a Phantom Wallet 👻");
        }
    }catch(error){
      console.error("Error checking wallet connection:", error);
    }
  }

  const connectWallet = async() => {
    try {
      const provider = (window).solana;
      if (!provider || !provider.isPhantom) {
        alert('Phantom Wallet not found! Please install it from https://phantom.app');
        return;
      }
      // This must be inside the user-click handler
      const resp = await provider.connect();
      console.log('Connected with Public Key:', resp.publicKey.toString());
      setWalletAddress(resp.publicKey.toString());
    } catch (err) {
      console.error('⛔️ connectWallet failed', err);
    }
  };

  function normalizeIdl(idl) {
  if (!idl) return idl;

  // 1) Build a map of type name -> type def
  const typeMap = new Map((idl.types || []).map(t => [t.name, t.type]));

  // 2) Some builds put account structs only in `types`. Anchor JS sometimes
  //    expects `idl.accounts[i].type` to exist. Copy it over if missing.
  if (idl.accounts) {
    idl.accounts = idl.accounts.map(acc =>
      acc.type ? acc : { ...acc, type: typeMap.get(acc.name) }
    );
  }

  // 3) Normalize `defined` to string (some builders emit `{ defined: { name: "X" } }`)
  for (const t of idl.types || []) {
    if (t.type?.fields) {
      for (const f of t.type.fields) {
        if (f.type && typeof f.type === 'object' && f.type.defined && typeof f.type.defined === 'object') {
          f.type.defined = f.type.defined.name; // "ItemStruct"
        }
      }
    }
  }

  return idl;
}

  async function sendGif() {
  if (!inputValue) return;
   const { program, provider } = await getProgram();

  try {
    await program.methods
  .addGif(inputValue)
  .accounts({
    baseAccount:  baseAccount.publicKey,
    user:         provider.wallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
    console.log("GIF successfully sent to program", inputValue);
    await getGifList();
  } catch (error) {
    if (error.message.includes("already been processed")) {
      console.log("↺ replay detected, ignoring");
    } else {
      console.error("❌ sendGif failed:", error);
    }
  } finally {
    setInputValue("");
  }
}
    
  const renderNotConnectedContainer = () => {
    return (
      <button className="cta-button connect-wallet-button" onClick={connectWallet}>
        Connect to Wallet
      </button>
    );
  };

  const onInputChange = (event) => {
    const { value } = event.target;
    setInputValue(value);
  };

  async function getProgram() {
  const provider = getAnchorProvider();

  if (!idlCache) {
    const fetched = await Program.fetchIdl(programID, provider).catch(() => null);
    idlCache = normalizeIdl(fetched ?? idl);   // <- normalize before use
    // Optional sanity check:
    // console.log('Account type after normalize:', idlCache.accounts?.[0]?.type);
  }

  return { program: new Program(idlCache, provider, programID), provider };
}

  const getAnchorProvider = () => {
    const connection = new Connection(network, { commitment: "processed" });
  return new AnchorProvider(
    connection,
    window.solana,
    {
      preflightCommitment: "processed",
      commitment:         "processed",
    }
  );
  };

  const renderConnectedContainer = () => {
  // 1) If we haven’t initialized our baseAccount on-chain yet, show the button
  if (!initialized) {
    return (
      <div className="connected-container">
        <p>Your wallet is connected as <code>{walletAddress}</code></p>
        <button
          className="cta-button submit-gif-button"
          onClick={initializeAccount}
        >
          Initialize On-Chain Account
        </button>
      </div>
    );
  }

  // 2) Otherwise show the normal GIF UI
  return (
    <div className="connected-container">
      <p>Connected as <code>{walletAddress}</code></p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          await sendGif();
          event.target.reset();
        }}
      >
        <input
          type="text"
          placeholder="Enter GIF URL"
          className="gif-input"
          value={inputValue}
          onChange={onInputChange}
          required
        />
        <button type="submit" className="cta-button submit-gif-button">
          Submit GIF
        </button>
      </form>
      <div className="gif-container">
        {gifList.map((it, i) => (
  <img key={i} src={it.gifLink} className="gif" />
))}
      </div>
    </div>
  );
};


  
  useEffect(() => {
    checkIfWalletIsConnected();
  }, []);

  const initializeAccount = async () => {
    try {
      //const provider = getAnchorProvider();
      console.log("IDL.accounts:", idl.accounts);
      console.log("IDL.accounts:", idl.address);
      console.log("Base Account Public Key:", baseAccount.publicKey.toString());
      //console.log("→ LOADED IDL:", JSON.stringify(idl, null, 2));
      console.log("idl.account[0]", idl.accounts[0]);
      console.log("Program ID:", programID.toString());
      const { program, provider } = await getProgram();

      await program.methods
  .startStuffOff()
  .accounts({
    baseAccount:  baseAccount.publicKey,
    user:         provider.wallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .signers([baseAccount])       // only for init
  .rpc();

      console.log("Base account initialized");
      setInitialized(true);
    } catch (err) {
      console.error("Already initialized or error", err);
      setInitialized(true);
    }
  };

  const getGifList = async() => {
    try {
      console.log("In getGifList function");
    //const provider = getAnchorProvider();
    const { program } = await getProgram();
    console.log("Program:", program);
    
    // If you’re on Anchor v0.31+, you can do:
    // const account = await program.account.baseAccount.fetchNullable(baseAccount.publicKey);
    // Otherwise wrap fetch in a try/catch and detect “account not found”
    console.log("Get the account");
    const account = await program.account.baseAccount.fetchNullable(baseAccount.publicKey);
    console.log("Got the account", account);
    if (account === null) {
      // show your “Initialize On-Chain Account” button instead of crashing
      return setGifList([]);
    }
    setGifList(account.gifList);
  } catch (error) {
    console.error("Error fetching GIF list:", error);
    setGifList([]);         // ← never null!
  }
  };

  useEffect(() => {
    if (!walletAddress) return;

  (async () => {
    console.log("Wallet connected, initializing account…");
    await initializeAccount();

    console.log("Now fetching GIF list…");
    await getGifList();
  })();
  }, [walletAddress]);
  return (
    <div className="App">
      <div className={walletAddress ? 'authed-container' : "container"}>
        <div className="header-container">
          <p className="header">🖼 GIF Portal</p>
          <p className="sub-text">
            View your GIF collection in the metaverse ✨
          </p>
          {!walletAddress && renderNotConnectedContainer()
            }
            {walletAddress && renderConnectedContainer()}
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built on @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
