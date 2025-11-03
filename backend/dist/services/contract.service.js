"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contractService = exports.getContractService = exports.ContractService = void 0;
const ethers_1 = require("ethers");
const price_service_1 = require("./price.service");
// ABIs
const FACTORY_ABI = [
    'function createEscrow(address _kol, address _token, uint256 _totalAmount, uint256[] memory _milestoneAmounts, uint256[] memory _releaseDates, address[] memory _verifiers, uint8 _verificationThreshold) external returns (address)',
    'event EscrowCreated(address indexed escrow, address indexed project, address indexed kol, address token)',
];
const ESCROW_ABI = [
    'function release(uint256 milestoneId) external',
    'function claim() external',
    'function clawback() external',
    'function getMilestone(uint256 milestoneId) external view returns (uint256 amount, uint256 releaseDate, bool released, bool verified)',
    'function totalAmount() external view returns (uint256)',
    'function releasedAmount() external view returns (uint256)',
    'function claimedAmount() external view returns (uint256)',
    'function kolAddress() external view returns (address)',
    'function projectAddress() external view returns (address)',
    'function token() external view returns (address)',
    'function verifyMilestone(uint256 milestoneId) external',
    'function isVerifier(address) external view returns (bool)',
    'event MilestoneReleased(uint256 indexed milestoneId, uint256 amount)',
    'event MilestoneVerified(uint256 indexed milestoneId, address indexed verifier)',
    'event PaymentClaimed(address indexed kol, uint256 amount)',
];
// Token Factory and Bonding Curve ABIs for token launchpad
const TOKEN_FACTORY_ABI = [
    'function createToken(string name, string symbol, string description, string imageUrl, string twitter, string telegram, string website, string category) external payable returns (address)',
    'function getCreationFee() external view returns (uint256)',
    'event TokenCreated(address indexed token, address indexed creator, string name, string symbol, uint256 timestamp, uint256 devBuyAmount)',
];
// Import the correct ABI for DevBondingCurve V2
const DevBondingCurveV2ABI = require('../abis/DevBondingCurveV2ABI.json');
const BONDING_CURVE_ABI = DevBondingCurveV2ABI;
const ERC20_ABI = [
    'function name() external view returns (string)',
    'function symbol() external view returns (string)',
    'function decimals() external view returns (uint8)',
    'function totalSupply() external view returns (uint256)',
    'function balanceOf(address) external view returns (uint256)',
    'function approve(address spender, uint256 amount) external returns (bool)',
];
class ContractService {
    provider;
    signer;
    factoryContract;
    tokenFactoryContract;
    bondingCurveAddress;
    constructor() {
        // Use Base Sepolia for testnet
        const isTestnet = process.env['NODE_ENV'] !== 'production' || process.env['NEXT_PUBLIC_CHAIN_ID'] === '84532';
        const rpcUrl = isTestnet
            ? (process.env['BASE_SEPOLIA_RPC_URL'] || 'https://base-sepolia.drpc.org')
            : (process.env['BASE_RPC_URL'] || 'https://mainnet.base.org');
        const privateKey = process.env['PRIVATE_KEY'];
        if (!privateKey) {
            console.warn('PRIVATE_KEY not configured - using default test key');
            // Use a well-known test private key for development
            const testPrivateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
            this.provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
            this.signer = new ethers_1.ethers.Wallet(testPrivateKey, this.provider);
        }
        else {
            this.provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
            this.signer = new ethers_1.ethers.Wallet(privateKey, this.provider);
        }
        const factoryAddress = isTestnet
            ? (process.env['ESCROW_FACTORY_ADDRESS_SEPOLIA'] || process.env['FACTORY_CONTRACT_ADDRESS'])
            : process.env['FACTORY_CONTRACT_ADDRESS'];
        if (!factoryAddress) {
            console.warn('FACTORY_CONTRACT_ADDRESS not configured - contract service will have limited functionality');
            // Use a dummy address for development
            this.factoryContract = new ethers_1.ethers.Contract('0x0000000000000000000000000000000000000000', FACTORY_ABI, this.signer);
        }
        else {
            this.factoryContract = new ethers_1.ethers.Contract(factoryAddress, FACTORY_ABI, this.signer);
        }
        // Initialize Token Factory/Bonding contract address from env with sensible defaults
        const tokenFactoryAddress = process.env['TOKEN_FACTORY_ADDRESS_SEPOLIA'] ||
            process.env['TOKEN_FACTORY_ADDRESS'] ||
            process.env['NEXT_PUBLIC_ULTRA_SECURE_BONDING_FACTORY_ADDRESS'] ||
            '0xbf8759fB6B543A518cD16CdC627269e17317b65e'; // UltraSecureBondingCurve on Base Sepolia (fallback)
        this.tokenFactoryContract = new ethers_1.ethers.Contract(tokenFactoryAddress, TOKEN_FACTORY_ABI, this.signer);
        // Store bonding curve address (same as factory for UltraSecureBondingCurve)
        this.bondingCurveAddress =
            process.env['BONDING_CURVE_ADDRESS'] ||
                process.env['TOKEN_FACTORY_ADDRESS_SEPOLIA'] ||
                tokenFactoryAddress;
        console.log(`Contract service initialized for ${isTestnet ? 'Base Sepolia' : 'Base Mainnet'}`);
        console.log(`Escrow Factory: ${factoryAddress}`);
        console.log(`Token Factory: ${tokenFactoryAddress}`);
    }
    async prepareDeployEscrow(dto) {
        try {
            // Validate signature
            const message = JSON.stringify({
                type: 'ESCROW_DEPLOYMENT',
                dealBasics: dto.dealBasics,
                milestones: dto.milestones,
                verificationSettings: dto.verificationSettings,
                timestamp: new Date(dto.dealBasics.startDate).toISOString(),
                deployer: dto.deployerAddress,
            });
            const recoveredAddress = ethers_1.ethers.verifyMessage(message, dto.signature);
            if (recoveredAddress.toLowerCase() !== dto.deployerAddress.toLowerCase()) {
                throw new Error('Invalid signature');
            }
            // Prepare contract parameters
            const totalAmount = dto.milestones.reduce((sum, m) => sum + m.amount, 0);
            const totalAmountWei = ethers_1.ethers.parseUnits(totalAmount.toString(), dto.dealBasics.tokenDecimals);
            const milestoneAmounts = dto.milestones.map(m => ethers_1.ethers.parseUnits(m.amount.toString(), dto.dealBasics.tokenDecimals));
            const releaseDates = dto.milestones.map(m => Math.floor(new Date(m.releaseDate).getTime() / 1000));
            const verifiers = dto.verificationSettings.requireVerification
                ? dto.verificationSettings.verifierAddresses
                : [];
            const verificationThreshold = this.getVerificationThreshold(dto.verificationSettings.verificationMethod, verifiers.length);
            // Encode the transaction data
            const txData = this.factoryContract.interface.encodeFunctionData('createEscrow', [
                dto.dealBasics.kolAddress,
                dto.dealBasics.tokenAddress,
                totalAmountWei,
                milestoneAmounts,
                releaseDates,
                verifiers,
                verificationThreshold
            ]);
            return {
                success: true,
                factoryAddress: this.factoryContract.target,
                txData,
                totalAmountWei: totalAmountWei.toString(),
                parameters: {
                    kolAddress: dto.dealBasics.kolAddress,
                    tokenAddress: dto.dealBasics.tokenAddress,
                    totalAmount: totalAmountWei.toString(),
                    milestoneAmounts: milestoneAmounts.map(a => a.toString()),
                    releaseDates,
                    verifiers,
                    verificationThreshold
                }
            };
        }
        catch (error) {
            console.error('Prepare escrow deployment error:', error);
            return {
                success: false,
                error: error.message || 'Failed to prepare escrow deployment',
            };
        }
    }
    async deployEscrow(dto) {
        // This method now just prepares the transaction
        // The actual deployment happens on the frontend with user's wallet
        const prepared = await this.prepareDeployEscrow(dto);
        if (!prepared.success) {
            return prepared;
        }
        // Return transaction data for frontend
        return {
            success: true,
            // TransactionResult fields (will be filled by frontend after execution)
            transactionHash: undefined,
            blockNumber: undefined,
            // Additional data for frontend
            error: undefined,
            ...prepared
        };
    }
    async releasePayment(escrowAddress, milestoneId, callerAddress) {
        try {
            const escrowContract = new ethers_1.ethers.Contract(escrowAddress, ESCROW_ABI, this.signer);
            // Check if caller is authorized
            const projectAddress = await escrowContract['projectAddress']();
            const isVerifier = await escrowContract['isVerifier'](callerAddress);
            if (callerAddress.toLowerCase() !== projectAddress.toLowerCase() && !isVerifier) {
                return {
                    success: false,
                    error: 'Unauthorized: Only project owner or verifiers can release payment',
                };
            }
            // Get milestone details
            const milestone = await escrowContract['getMilestone'](milestoneId);
            if (milestone.released) {
                return {
                    success: false,
                    error: 'Milestone already released',
                };
            }
            // Removed date check - we're using admin-only verification
            // Admin can release milestones at any time
            // Use factory's adminReleaseMilestone to bypass project-only restriction
            const factoryAddress = process.env['ESCROW_FACTORY_ADDRESS'] || '0xdFA01a79fb8Bb816BC77aE9cC6C2404b87c2cd18';
            const factoryAbi = [
                'function adminReleaseMilestone(address escrowAddress, uint256 milestoneId) external'
            ];
            const factoryContract = new ethers_1.ethers.Contract(factoryAddress, factoryAbi, this.signer);
            console.log(`Calling factory.adminReleaseMilestone(${escrowAddress}, ${milestoneId})`);
            const tx = await factoryContract['adminReleaseMilestone']?.(escrowAddress, milestoneId);
            const receipt = await tx.wait();
            return {
                success: true,
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber,
            };
        }
        catch (error) {
            console.error('Release payment error:', error);
            return {
                success: false,
                error: error.message || 'Failed to release payment',
            };
        }
    }
    async releaseAndTransferPayment(escrowAddress, milestoneId, callerAddress) {
        try {
            console.log(`Starting release and transfer for milestone ${milestoneId} on escrow ${escrowAddress}`);
            const escrowContract = new ethers_1.ethers.Contract(escrowAddress, ESCROW_ABI, this.signer);
            // Get KOL address and token details
            const kolAddress = await escrowContract['kolAddress']();
            const tokenAddress = await escrowContract['token']();
            console.log(`KOL Address: ${kolAddress}`);
            console.log(`Token Address: ${tokenAddress}`);
            // First, release the milestone
            const releaseResult = await this.releasePayment(escrowAddress, milestoneId, callerAddress);
            if (!releaseResult.success) {
                return releaseResult;
            }
            console.log(`Milestone released successfully. TX: ${releaseResult.transactionHash}`);
            // IMPORTANT: We cannot automatically transfer funds to the KOL from the backend
            // because the smart contract's claim() function can only be called by the KOL address.
            // The funds are now released and available for the KOL to claim.
            // Return success - the milestone is released and KOL can claim
            return {
                success: true,
                transactionHash: releaseResult.transactionHash,
                blockNumber: releaseResult.blockNumber,
            };
        }
        catch (error) {
            console.error('Release and transfer error:', error);
            return {
                success: false,
                error: error.message || 'Failed to release and transfer payment',
            };
        }
    }
    async clawbackFunds(escrowAddress) {
        try {
            console.log(`Starting clawback for escrow ${escrowAddress}`);
            const escrowContract = new ethers_1.ethers.Contract(escrowAddress, ESCROW_ABI, this.signer);
            // Call clawback to return all unreleased funds to project owner
            const clawbackTx = await escrowContract['clawback']();
            const receipt = await clawbackTx.wait();
            console.log(`Funds returned to project owner. TX: ${receipt.hash}`);
            return {
                success: true,
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber,
            };
        }
        catch (error) {
            console.error('Clawback error:', error);
            return {
                success: false,
                error: error.message || 'Failed to return funds to project owner',
            };
        }
    }
    async getEscrowDetails(escrowAddress) {
        try {
            const escrowContract = new ethers_1.ethers.Contract(escrowAddress, ESCROW_ABI, this.provider);
            // Make sequential requests to avoid batch request limits on free RPC tier
            const totalAmount = await escrowContract['totalAmount']();
            const releasedAmount = await escrowContract['releasedAmount']();
            const claimedAmount = await escrowContract['claimedAmount']();
            const kolAddress = await escrowContract['kolAddress']();
            const projectAddress = await escrowContract['projectAddress']();
            const tokenAddress = await escrowContract['token']();
            // Get token details
            const tokenContract = new ethers_1.ethers.Contract(tokenAddress, ['function decimals() view returns (uint8)', 'function symbol() view returns (string)'], this.provider);
            // Sequential token detail requests
            const decimals = await tokenContract['decimals']();
            const symbol = await tokenContract['symbol']();
            // Get milestones
            const milestones = [];
            let milestoneId = 0;
            while (true) {
                try {
                    const milestone = await escrowContract['getMilestone'](milestoneId);
                    if (milestone.amount === 0n)
                        break;
                    milestones.push({
                        id: milestoneId,
                        amount: ethers_1.ethers.formatUnits(milestone.amount, decimals),
                        releaseDate: new Date(Number(milestone.releaseDate) * 1000).toISOString(),
                        released: milestone.released,
                        verified: milestone.verified,
                    });
                    milestoneId++;
                }
                catch {
                    break;
                }
            }
            return {
                address: escrowAddress,
                totalAmount: ethers_1.ethers.formatUnits(totalAmount, decimals),
                releasedAmount: ethers_1.ethers.formatUnits(releasedAmount, decimals),
                claimedAmount: ethers_1.ethers.formatUnits(claimedAmount, decimals),
                kolAddress,
                projectAddress,
                tokenAddress,
                tokenSymbol: symbol,
                milestones,
                status: this.calculateStatus(totalAmount, releasedAmount, milestones),
            };
        }
        catch (error) {
            console.error('Get escrow details error:', error);
            throw new Error('Failed to fetch escrow details');
        }
    }
    getVerificationThreshold(method, verifierCount) {
        switch (method) {
            case 'single':
                return 1;
            case 'majority':
                return Math.floor(verifierCount / 2) + 1;
            case 'unanimous':
                return verifierCount;
            default:
                return 1;
        }
    }
    calculateStatus(totalAmount, releasedAmount, milestones) {
        if (releasedAmount === totalAmount) {
            return 'completed';
        }
        const hasUnreleasedMilestones = milestones.some(m => !m.released);
        if (hasUnreleasedMilestones) {
            return 'active';
        }
        return 'disputed';
    }
    // Token Launchpad Methods
    async deployToken(params) {
        try {
            // Get creation fee from contract
            const creationFee = await this.tokenFactoryContract.getCreationFee();
            console.log('Token creation fee:', ethers_1.ethers.formatEther(creationFee), 'ETH');
            // Call createToken on the factory contract
            const tx = await this.tokenFactoryContract.createToken(params.name, params.symbol, params.description || '', params.imageUrl || '', params.twitter || '', params.telegram || '', params.website || '', params.category || 'meme', { value: creationFee });
            console.log('Token creation transaction sent:', tx.hash);
            const receipt = await tx.wait();
            console.log('Token creation transaction confirmed');
            // Find TokenCreated event to get the token address
            let tokenAddress = '';
            for (const log of receipt.logs) {
                try {
                    const parsed = this.tokenFactoryContract.interface.parseLog(log);
                    if (parsed?.name === 'TokenCreated') {
                        tokenAddress = parsed.args[0];
                        console.log('Token created at address:', tokenAddress);
                        break;
                    }
                }
                catch {
                    // Not our event, continue
                }
            }
            if (!tokenAddress) {
                // Fallback to a generated address if event not found
                tokenAddress = ethers_1.ethers.getAddress('0x' + ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes(params.name + params.symbol + Date.now())).slice(-40));
                console.log('Warning: Could not find TokenCreated event, using generated address:', tokenAddress);
            }
            return {
                success: true,
                transactionHash: receipt.hash,
                tokenAddress,
                bondingCurveAddress: this.bondingCurveAddress,
                blockNumber: receipt.blockNumber,
            };
        }
        catch (error) {
            console.error('Token deployment error:', error);
            return {
                success: false,
                error: error.message || 'Failed to deploy token',
            };
        }
    }
    async getTokenData(tokenAddress) {
        try {
            const tokenContract = new ethers_1.ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
            // Use DevBondingCurveV2 factory address
            const devBondingCurveAddress = process.env['DEV_BONDING_FACTORY_ADDRESS'] || '0x46eCf02772C4Bc9a5cd440FB93022d6e268355c8';
            const bondingCurveContract = new ethers_1.ethers.Contract(devBondingCurveAddress, BONDING_CURVE_ABI, this.provider);
            // Get token basic info
            const [name, symbol, decimals, totalSupply] = await Promise.all([
                tokenContract.name(),
                tokenContract.symbol(),
                tokenContract.decimals(),
                tokenContract.totalSupply(),
            ]);
            // Try to get token info from DevBondingCurve
            let tokenInfo;
            let currentPrice = '0.000001';
            try {
                tokenInfo = await bondingCurveContract.tokenInfo(tokenAddress);
                // Calculate current price from reserves using constant product formula
                // Use realEthReserve and realTokenReserve (or array indices for older ABI)
                const ethReserveValue = tokenInfo.realEthReserve || tokenInfo[2];
                const tokenReserveValue = tokenInfo.realTokenReserve || tokenInfo[3];
                if (ethReserveValue && tokenReserveValue && tokenReserveValue > 0n) {
                    const ethReserve = Number(ethers_1.ethers.formatEther(ethReserveValue));
                    const tokenReserve = Number(ethers_1.ethers.formatUnits(tokenReserveValue, decimals));
                    currentPrice = (ethReserve / tokenReserve).toString();
                }
            }
            catch (error) {
                console.log('Could not get token info from contract, using defaults');
                // Default values for tokens not in bonding curve
                tokenInfo = {
                    ethReserve: BigInt(0),
                    tokenReserve: BigInt(0),
                    creator: '0x0000000000000000000000000000000000000000',
                    createdAt: BigInt(Math.floor(Date.now() / 1000)),
                    totalEthTraded: BigInt(0),
                    graduated: false
                };
            }
            // Calculate market cap and bonding progress
            const priceInEth = parseFloat(currentPrice);
            const ethPriceUSD = await price_service_1.priceService.getETHPriceUSD();
            const priceInUsd = priceInEth * ethPriceUSD;
            const totalSupplyNumber = Number(ethers_1.ethers.formatUnits(totalSupply, decimals));
            const marketCapInUsd = priceInUsd * totalSupplyNumber;
            // Calculate bonding progress (percentage to graduation at $69k)
            const graduationThreshold = 69000;
            const bondingProgress = Math.min((marketCapInUsd / graduationThreshold) * 100, 100);
            return {
                address: tokenAddress,
                name,
                symbol,
                decimals,
                totalSupply: totalSupply.toString(),
                price: priceInUsd.toString(), // Store price in USD for display
                currentPrice: currentPrice, // ETH price per token
                marketCap: marketCapInUsd.toString(),
                bondingProgress: bondingProgress,
                graduated: tokenInfo.graduated || false,
                ethReserve: tokenInfo.ethReserve?.toString() || '0',
                tokenReserve: tokenInfo.tokenReserve?.toString() || '0',
                creator: tokenInfo.creator || '0x0000000000000000000000000000000000000000',
                totalEthTraded: tokenInfo.totalEthTraded?.toString() || '0',
            };
        }
        catch (error) {
            console.error('Get token data error:', error);
            throw new Error(error.message || 'Failed to get token data');
        }
    }
    async buyTokens(params) {
        try {
            // Use DevBondingCurve factory address
            // Use V2 as default fallback
            const devBondingCurveAddress = process.env['DEV_BONDING_FACTORY_ADDRESS'] || '0x46eCf02772C4Bc9a5cd440FB93022d6e268355c8';
            const bondingCurveContract = new ethers_1.ethers.Contract(devBondingCurveAddress, BONDING_CURVE_ABI, this.signer);
            // DevBondingCurve uses buyTokens(address token, uint256 minTokensOut)
            const tx = await bondingCurveContract.buyTokens(params.tokenAddress, params.minTokensOut || '0', { value: ethers_1.ethers.parseEther(params.amount) });
            const receipt = await tx.wait();
            // Find TokensPurchased event from DevBondingCurve
            let tokenAmount = '0';
            for (const log of receipt.logs) {
                try {
                    const parsed = bondingCurveContract.interface.parseLog(log);
                    if (parsed?.name === 'TokensPurchased') {
                        tokenAmount = parsed.args.tokensReceived?.toString() || parsed.args.tokenAmount?.toString() || '0';
                        break;
                    }
                }
                catch {
                    // Not our event
                }
            }
            return {
                success: true,
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber,
                tokenAmount: tokenAmount,
                price: '0', // Will be calculated from reserves
                totalCost: params.amount,
            };
        }
        catch (error) {
            console.error('Buy tokens error:', error);
            return {
                success: false,
                error: error.message || 'Failed to buy tokens',
            };
        }
    }
    async sellTokens(params) {
        try {
            // Use DevBondingCurve factory address
            // Use V2 as default fallback
            const devBondingCurveAddress = process.env['DEV_BONDING_FACTORY_ADDRESS'] || '0x46eCf02772C4Bc9a5cd440FB93022d6e268355c8';
            const bondingCurveContract = new ethers_1.ethers.Contract(devBondingCurveAddress, BONDING_CURVE_ABI, this.signer);
            // First approve the bonding curve to spend tokens
            const tokenContract = new ethers_1.ethers.Contract(params.tokenAddress, ERC20_ABI, this.signer);
            const approveTx = await tokenContract.approve(devBondingCurveAddress, params.tokenAmount);
            await approveTx.wait();
            // DevBondingCurve uses sellTokens(address token, uint256 tokenAmount, uint256 minEthOut)
            const tx = await bondingCurveContract.sellTokens(params.tokenAddress, params.tokenAmount, params.minEthOut || '0');
            const receipt = await tx.wait();
            // Find TokensSold event from DevBondingCurve
            let ethAmount = '0';
            for (const log of receipt.logs) {
                try {
                    const parsed = bondingCurveContract.interface.parseLog(log);
                    if (parsed?.name === 'TokensSold') {
                        ethAmount = parsed.args.ethReceived?.toString() || parsed.args.ethAmount?.toString() || '0';
                        break;
                    }
                }
                catch {
                    // Not our event
                }
            }
            return {
                success: true,
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber,
                ethAmount: ethAmount,
                price: '0', // Will be calculated from reserves
                totalReceived: ethAmount,
            };
        }
        catch (error) {
            console.error('Sell tokens error:', error);
            return {
                success: false,
                error: error.message || 'Failed to sell tokens',
            };
        }
    }
}
exports.ContractService = ContractService;
// Lazy load to ensure env vars are loaded
let _contractService = null;
const getContractService = () => {
    if (!_contractService) {
        _contractService = new ContractService();
    }
    return _contractService;
};
exports.getContractService = getContractService;
// For backward compatibility
exports.contractService = {
    get deployEscrow() {
        return (0, exports.getContractService)().deployEscrow.bind((0, exports.getContractService)());
    },
    get releasePayment() {
        return (0, exports.getContractService)().releasePayment.bind((0, exports.getContractService)());
    },
    get releaseAndTransferPayment() {
        return (0, exports.getContractService)().releaseAndTransferPayment.bind((0, exports.getContractService)());
    },
    get clawbackFunds() {
        return (0, exports.getContractService)().clawbackFunds.bind((0, exports.getContractService)());
    },
    get getEscrowDetails() {
        return (0, exports.getContractService)().getEscrowDetails.bind((0, exports.getContractService)());
    },
    // Token launchpad methods
    get deployToken() {
        return (0, exports.getContractService)().deployToken.bind((0, exports.getContractService)());
    },
    get getTokenData() {
        return (0, exports.getContractService)().getTokenData.bind((0, exports.getContractService)());
    },
    get buyTokens() {
        return (0, exports.getContractService)().buyTokens.bind((0, exports.getContractService)());
    },
    get sellTokens() {
        return (0, exports.getContractService)().sellTokens.bind((0, exports.getContractService)());
    }
};
//# sourceMappingURL=contract.service.js.map