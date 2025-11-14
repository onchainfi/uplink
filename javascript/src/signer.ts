/**
 * Transaction signing for EVM and Solana
 */

import { Wallet, TypedDataDomain, TypedDataField, getAddress } from 'ethers';
import {
  Connection,
  Keypair,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
  ComputeBudgetProgram,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js';
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  getMint,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';
import bs58 from 'bs58';
import { SigningError, ValidationError } from './errors.js';

// Token addresses by network
const USDC_ADDRESSES: Record<string, string> = {
  'base': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
};

const CHAIN_IDS: Record<string, number> = {
  'base': 8453,
};

const SOLANA_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const PAYAI_FEE_PAYER = '2wKupLR9q6wXYppw8Gr2NvWxKBUqm4PPJKkQfoxHDBg4';

/**
 * EVM (Ethereum/Base) transaction signer
 */
export class EVMSigner {
  private wallet: Wallet;
  private network: string;
  private usdcAddress: string;
  private chainId: number;

  constructor(privateKey: string, network: string = 'base') {
    // Normalize private key
    if (!privateKey.startsWith('0x')) {
      privateKey = '0x' + privateKey;
    }

    try {
      this.wallet = new Wallet(privateKey);
    } catch (error) {
      throw new ValidationError(`Invalid private key: ${error}`);
    }

    this.network = network;
    
    const usdcAddress = USDC_ADDRESSES[network];
    const chainId = CHAIN_IDS[network];
    
    if (!usdcAddress || !chainId) {
      throw new ValidationError(`Unsupported network: ${network}`);
    }

    this.usdcAddress = usdcAddress;
    this.chainId = chainId;
  }

  get address(): string {
    return this.wallet.address;
  }

  async signPayment(
    to: string,
    amount: string,
    sourceNetwork: string,
    destinationNetwork: string
  ): Promise<string> {
    try {
      // Convert amount to atomic units (USDC has 6 decimals)
      const amountFloat = parseFloat(amount);
      const amountAtomic = BigInt(Math.floor(amountFloat * 1_000_000));

      // Generate random nonce
      const nonce = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Validity period
      const validAfter = 0;
      const validBefore = Math.floor(Date.now() / 1000) + 3600; // 1 hour

      // EIP-712 domain
      const domain: TypedDataDomain = {
        name: 'USD Coin',
        version: '2',
        chainId: this.chainId,
        verifyingContract: this.usdcAddress,
      };

      // EIP-712 types
      const types: Record<string, TypedDataField[]> = {
        TransferWithAuthorization: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'validAfter', type: 'uint256' },
          { name: 'validBefore', type: 'uint256' },
          { name: 'nonce', type: 'bytes32' },
        ],
      };

      // Message to sign
      const value = {
        from: this.wallet.address,
        to: getAddress(to), // Ensure checksum address
        value: amountAtomic,
        validAfter: BigInt(validAfter),
        validBefore: BigInt(validBefore),
        nonce: nonce,
      };

      // Sign
      const signature = await this.wallet.signTypedData(domain, types, value);

      // Create x402 header
      const x402Payload = {
        x402Version: 1,
        scheme: 'exact',
        network: sourceNetwork,
        payload: {
          signature: signature,
          authorization: {
            from: this.wallet.address,
            to: to,
            value: amountAtomic.toString(),
            validAfter: validAfter.toString(),
            validBefore: validBefore.toString(),
            nonce: nonce,
          },
        },
      };

      // Encode to base64
      const x402Header = Buffer.from(JSON.stringify(x402Payload)).toString('base64');

      return x402Header;
    } catch (error) {
      throw new SigningError(`Failed to sign EVM payment: ${error}`);
    }
  }
}

/**
 * Solana transaction signer
 */
export class SolanaSigner {
  private keypair: Keypair;
  private connection: Connection;

  constructor(privateKey: string, rpcUrl: string = 'https://api.mainnet-beta.solana.com') {
    try {
      let keyBytes: Uint8Array;

      // Support multiple formats
      if (privateKey.startsWith('0x')) {
        // Hex format
        keyBytes = new Uint8Array(Buffer.from(privateKey.slice(2), 'hex'));
      } else if (privateKey.length === 64 && /^[0-9a-fA-F]+$/.test(privateKey)) {
        // Hex without 0x
        keyBytes = new Uint8Array(Buffer.from(privateKey, 'hex'));
      } else {
        // Base58
        keyBytes = bs58.decode(privateKey);
      }

      this.keypair = Keypair.fromSecretKey(keyBytes);
      this.connection = new Connection(rpcUrl, 'confirmed');
    } catch (error) {
      throw new ValidationError(`Invalid Solana private key: ${error}`);
    }
  }

  get publicKey(): PublicKey {
    return this.keypair.publicKey;
  }

  async signPayment(
    to: string,
    amount: string,
    sourceNetwork: string,
    destinationNetwork: string
  ): Promise<string> {
    try {
      // Parse amount to atomic units (6 decimals for USDC)
      const amountFloat = parseFloat(amount);
      const amountLamports = BigInt(Math.floor(amountFloat * 1_000_000));

      // Create public keys
      const userPubkey = this.keypair.publicKey;
      const destinationPubkey = new PublicKey(to);
      const mintPubkey = new PublicKey(SOLANA_USDC_MINT);

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed');

      // Detect token program
      const mintInfo = await this.connection.getAccountInfo(mintPubkey, 'confirmed');
      const programId = mintInfo?.owner.toBase58() === TOKEN_2022_PROGRAM_ID.toBase58()
        ? TOKEN_2022_PROGRAM_ID
        : TOKEN_PROGRAM_ID;

      // Get associated token addresses
      const sourceAta = await getAssociatedTokenAddress(mintPubkey, userPubkey, false, programId);
      const destinationAta = await getAssociatedTokenAddress(mintPubkey, destinationPubkey, true, programId);

      // Fetch mint to get decimals
      const mint = await getMint(this.connection, mintPubkey, undefined, programId);

      const instructions: TransactionInstruction[] = [];

      // Position 0: ComputeBudget limit (REQUIRED - must be first)
      instructions.push(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 40_000 })
      );

      // Position 1: ComputeBudget price (REQUIRED - must be second)
      instructions.push(
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 })
      );

      // Position 2 (conditional): Create ATA if doesn't exist
      const destAtaInfo = await this.connection.getAccountInfo(destinationAta, 'confirmed');
      if (!destAtaInfo) {
        const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
        
        const createAtaInstruction = new TransactionInstruction({
          keys: [
            { pubkey: userPubkey, isSigner: false, isWritable: true },
            { pubkey: destinationAta, isSigner: false, isWritable: true },
            { pubkey: destinationPubkey, isSigner: false, isWritable: false },
            { pubkey: mintPubkey, isSigner: false, isWritable: false },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: programId, isSigner: false, isWritable: false },
          ],
          programId: ASSOCIATED_TOKEN_PROGRAM_ID,
          data: Buffer.from([0]), // CreateATA discriminator
        });
        instructions.push(createAtaInstruction);
      }

      // Position 3/2: TransferChecked instruction
      const transferIx = createTransferCheckedInstruction(
        sourceAta,
        mintPubkey,
        destinationAta,
        userPubkey,
        amountLamports,
        mint.decimals,
        [],
        programId
      );
      instructions.push(transferIx);

      // Use PayAI's fee payer
      const feePayerPubkey = new PublicKey(PAYAI_FEE_PAYER);

      // Create message with PayAI as payer
      const message = new TransactionMessage({
        payerKey: feePayerPubkey,
        recentBlockhash: blockhash,
        instructions,
      }).compileToV0Message();

      // Create transaction
      const transaction = new VersionedTransaction(message);

      // Sign with user's keypair (partial signature)
      transaction.sign([this.keypair]);

      // Serialize transaction
      const serializedTransaction = Buffer.from(transaction.serialize()).toString('base64');

      // Create x402 header
      const payloadData: any = {
        transaction: serializedTransaction,
      };

      // Add cross-chain metadata if needed
      if (sourceNetwork !== destinationNetwork) {
        payloadData.destinationNetwork = destinationNetwork;
        payloadData.destinationAddress = to;
      }

      const x402Payload = {
        x402Version: 1,
        scheme: 'exact',
        network: sourceNetwork,
        payload: payloadData,
      };

      // Encode to base64
      const x402Header = Buffer.from(JSON.stringify(x402Payload)).toString('base64');

      return x402Header;
    } catch (error) {
      throw new SigningError(`Failed to sign Solana payment: ${error}`);
    }
  }
}

