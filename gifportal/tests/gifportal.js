const anchor = require("@coral-xyz/anchor");

async function main() {
  console.log("⚡️ Running gifportal test...");

  // 1) Hook up to the local validator
  //const provider = anchor.AnchorProvider.local("http://127.0.0.1:8899");
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // 2) Airdrop 1 SOL to the payer so it can pay all account‐creation rent
  // const airdropSig = await provider.connection.requestAirdrop(
  //   provider.wallet.publicKey,
  //   1_000_000_000
  // );
  // await provider.connection.confirmTransaction(airdropSig);

  // 3) Pull in the IDL’d program and make a fresh BaseAccount keypair
  const program     = anchor.workspace.Gifportal;
  const baseAccount = anchor.web3.Keypair.generate();

  console.log("  • BaseAccount:", baseAccount.publicKey.toBase58());
  console.log("  • Program ID:",  program.programId.toBase58());

  // 4) Initialize the on-chain account
  const tx1 = await program.methods
    .startStuffOff()
    .accounts({
      baseAccount:   baseAccount.publicKey,
      user:           provider.wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([baseAccount])   // the only time baseAccount must sign is at init
    .rpc();
  console.log("  ✓ startStuffOff sig:", tx1);

  // 5) Fetch & inspect the empty account
  let account = await program.account.baseAccount.fetch(
    baseAccount.publicKey
  );
  console.log("    → totalGifs:",   account.totalGifs.toString());
  console.log("    → gifList len:", account.gifList.length);

  // 6) Push one GIF
  const gifUrl = "https://media.giphy.com/media/13ZHjidRzoi7n2/giphy.gif";
  const tx2 = await program.methods
    .addGif(gifUrl)
    .accounts({
      baseAccount:   baseAccount.publicKey,
      user:           provider.wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();  // only your provider's wallet signs here
  console.log("  ✓ addGif sig:", tx2);

  // 7) Fetch & inspect again
  account = await program.account.baseAccount.fetch(baseAccount.publicKey);
  console.log("    → totalGifs:",   account.totalGifs.toString());
  console.log("    → gifList len:", account.gifList.length);
  account.gifList.forEach((item, i) => {
    console.log(`      [${i}] ${item.gifLink} (by ${item.userAddress.toBase58()})`);
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
