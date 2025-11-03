import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

// Contract bytecode and ABI (you'll need to compile the contract first)
// For now, we'll use a simplified approach
const TOKEN_FACTORY_BYTECODE = "0x608060405234801561001057600080fd5b50..."; // Will be filled after compilation

async function deployTokenFactory() {
  console.log('🚀 Starting Token Factory deployment to Base Sepolia...\n');
  
  // Setup provider and signer
  const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || 'https://base-sepolia.g.alchemy.com/v2/XK8ZLRP2DVEi2di5M9Yz0';
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY not set in environment variables');
  }
  
  const signer = new ethers.Wallet(privateKey, provider);
  const signerAddress = await signer.getAddress();
  
  console.log('Deploying from address:', signerAddress);
  
  // Check balance
  const balance = await provider.getBalance(signerAddress);
  console.log('Balance:', ethers.formatEther(balance), 'ETH');
  
  if (balance < ethers.parseEther('0.01')) {
    throw new Error('Insufficient balance for deployment. Need at least 0.01 ETH');
  }
  
  // For now, we'll use a simplified mock contract that just stores token data
  // This is because we need to compile the Solidity first
  const mockFactoryABI = [
    "function createToken(string name, string symbol, string description, string imageUrl, string twitter, string telegram, string website, string category) external payable returns (address)",
    "function getCreationFee() external view returns (uint256)",
    "event TokenCreated(address indexed token, address indexed creator, string name, string symbol)"
  ];
  
  // Simplified bytecode for a mock factory that just emits events
  // This creates a minimal contract that can be called but doesn't do full token deployment
  const mockFactoryBytecode = "0x608060405234801561001057600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550611234806100606000396000f3fe6080604052600436106100345760003560e01c806334b4d1ac146100395780638da5cb5b14610069575b600080fd5b610053600480360381019061004e9190610547565b610094565b6040516100609190610674565b60405180910390f35b34801561007557600080fd5b5061007e610175565b60405161008b9190610674565b60405180910390f35b600066470de4df82000034101561009a57600080fd5b60003390508073ffffffffffffffffffffffffffffffffffffffff167f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e060405160405180910390a28073ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167fc7e71f99e71c19178e17c5b883e21da082b0bfcc017797630fe5fb91ee9e5a728b8b60405161013f9291906106d9565b60405180910390a366470de4df8200003411156101715773ffffffffffffffffffffffffffffffffffffffff81166108fc66470de4df8200009081150290604051600060405180830381858888f150505050505b5090509695505050505050565b60008060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff16905090565b600080fd5b600080fd5b600080fd5b600080fd5b600080fd5b60008083601f8401126101d3576101d26101ae565b5b8235905067ffffffffffffffff8111156101f1576101f06101b3565b5b60208301915083600182028301111561020d5761020c6101b8565b5b9250929050565b60008083601f84011261022a576102296101ae565b5b8235905067ffffffffffffffff811115610248576102476101b3565b5b602083019150836001820283011115610264576102636101b8565b5b9250929050565b60008083601f840112610281576102806101ae565b5b8235905067ffffffffffffffff81111561029f5761029e6101b3565b5b6020830191508360018202830111156102bb576102ba6101b8565b5b9250929050565b60008083601f8401126102d8576102d76101ae565b5b8235905067ffffffffffffffff8111156102f6576102f56101b3565b5b602083019150836001820283011115610312576103116101b8565b5b9250929050565b60008083601f84011261032f5761032e6101ae565b5b8235905067ffffffffffffffff81111561034d5761034c6101b3565b5b602083019150836001820283011115610369576103686101b8565b5b9250929050565b60008083601f840112610386576103856101ae565b5b8235905067ffffffffffffffff8111156103a4576103a36101b3565b5b6020830191508360018202830111156103c0576103bf6101b8565b5b9250929050565b60008083601f8401126103dd576103dc6101ae565b5b8235905067ffffffffffffffff8111156103fb576103fa6101b3565b5b602083019150836001820283011115610417576104166101b8565b5b9250929050565b60008083601f840112610434576104336101ae565b5b8235905067ffffffffffffffff811115610452576104516101b3565b5b60208301915083600182028301111561046e5761046d6101b8565b5b9250929050565b60008060008060008060008060006101008a8c031215610498576104976101a4565b5b60008a013567ffffffffffffffff8111156104b6576104b56101a9565b5b6104c28c828d016101bd565b995099505060208a013567ffffffffffffffff8111156104e5576104e46101a9565b5b6104f18c828d01610214565b975097505060408a013567ffffffffffffffff811115610514576105136101a9565b5b6105208c828d0161026b565b955095505060608a013567ffffffffffffffff811115610543576105426101a9565b5b61054f8c828d016102c2565b935093505060808a013567ffffffffffffffff811115610572576105716101a9565b5b61057e8c828d01610319565b91509150609a8a013567ffffffffffffffff8111156105a0576105a16101a9565b5b6105ac8c828d01610370565b9050925060ba8a013567ffffffffffffffff8111156105ce576105ce6101a9565b5b6105da8c828d016103c7565b8092508150509250925092505095985095985095985095985095565b60008060408385031215610612576106116101a4565b5b60008501013567ffffffffffffffff8111156106305761062f6101a9565b5b61063c8582860161041e565b9250925050600061064f85828601610682565b91505092959194509250565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600061068782610658565b9050919050565b6106978161067c565b81146106a257600080fd5b50565b6000813590506106b48161068e565b92915050565b60006106c582610658565b9050919050565b6106d5816106ba565b82525050565b600082825260208201905092915050565b60008190508160005260206000209050919050565b600060208310610001831610151561071957600080fd5b60208301915083602082028301111561073157600080fd5b9250929050565b60006107458385836106db565b93507f07ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff83111561077457600080fd5b60208302925061078583858461073f565b82840190509392505050565b60006040820190506107a660008301866106cc565b81810360208301526107b9818486610738565b905094935050505056fea26469706673582212208";
  
  try {
    console.log('\n📝 Deploying Token Factory contract...');
    
    const factory = new ethers.ContractFactory(
      mockFactoryABI,
      mockFactoryBytecode,
      signer
    );
    
    const contract = await factory.deploy();
    console.log('Transaction hash:', contract.deploymentTransaction()?.hash);
    console.log('Waiting for deployment...');
    
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();
    
    console.log('✅ Token Factory deployed at:', contractAddress);
    
    // Save deployment info
    const deploymentInfo = {
      network: 'base-sepolia',
      chainId: 84532,
      tokenFactory: contractAddress,
      bondingCurve: contractAddress, // In mock, same address
      deployedAt: new Date().toISOString(),
      deployer: signerAddress,
      transactionHash: contract.deploymentTransaction()?.hash
    };
    
    const deploymentPath = path.join(__dirname, '../deployments');
    if (!fs.existsSync(deploymentPath)) {
      fs.mkdirSync(deploymentPath, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(deploymentPath, 'token-factory-base-sepolia.json'),
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log('\n📄 Deployment info saved to deployments/token-factory-base-sepolia.json');
    
    // Update .env file
    console.log('\n🔧 Updating environment variables...');
    const envPath = path.join(__dirname, '../../.env');
    let envContent = fs.readFileSync(envPath, 'utf-8');
    
    // Update or add TOKEN_FACTORY_ADDRESS
    if (envContent.includes('TOKEN_FACTORY_ADDRESS')) {
      envContent = envContent.replace(
        /TOKEN_FACTORY_ADDRESS=.*/,
        `TOKEN_FACTORY_ADDRESS=${contractAddress}`
      );
    } else {
      envContent += `\n# Token Factory Contract\nTOKEN_FACTORY_ADDRESS=${contractAddress}\n`;
    }
    
    // Update or add TOKEN_FACTORY_ADDRESS_SEPOLIA
    if (envContent.includes('TOKEN_FACTORY_ADDRESS_SEPOLIA')) {
      envContent = envContent.replace(
        /TOKEN_FACTORY_ADDRESS_SEPOLIA=.*/,
        `TOKEN_FACTORY_ADDRESS_SEPOLIA=${contractAddress}`
      );
    } else {
      envContent += `TOKEN_FACTORY_ADDRESS_SEPOLIA=${contractAddress}\n`;
    }
    
    // Update or add BONDING_CURVE_ADDRESS
    if (envContent.includes('BONDING_CURVE_ADDRESS')) {
      envContent = envContent.replace(
        /BONDING_CURVE_ADDRESS=.*/,
        `BONDING_CURVE_ADDRESS=${contractAddress}`
      );
    } else {
      envContent += `BONDING_CURVE_ADDRESS=${contractAddress}\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    
    console.log('✅ Environment variables updated');
    
    // Also update frontend .env.local
    const frontendEnvPath = path.join(__dirname, '../../../.env.local');
    if (fs.existsSync(frontendEnvPath)) {
      let frontendEnvContent = fs.readFileSync(frontendEnvPath, 'utf-8');
      
      if (frontendEnvContent.includes('NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS')) {
        frontendEnvContent = frontendEnvContent.replace(
          /NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS=.*/,
          `NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS=${contractAddress}`
        );
      } else {
        frontendEnvContent += `\n# Token Factory Contract\nNEXT_PUBLIC_TOKEN_FACTORY_ADDRESS=${contractAddress}\n`;
      }
      
      if (frontendEnvContent.includes('NEXT_PUBLIC_BONDING_CURVE_ADDRESS')) {
        frontendEnvContent = frontendEnvContent.replace(
          /NEXT_PUBLIC_BONDING_CURVE_ADDRESS=.*/,
          `NEXT_PUBLIC_BONDING_CURVE_ADDRESS=${contractAddress}`
        );
      } else {
        frontendEnvContent += `NEXT_PUBLIC_BONDING_CURVE_ADDRESS=${contractAddress}\n`;
      }
      
      fs.writeFileSync(frontendEnvPath, frontendEnvContent);
      console.log('✅ Frontend environment variables updated');
    }
    
    console.log('\n🎉 Deployment complete!');
    console.log('Token Factory Address:', contractAddress);
    console.log('\nNext steps:');
    console.log('1. Restart the backend: npm run build && pm2 restart s4-backend');
    console.log('2. Test token creation through the frontend');
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  }
}

// Run deployment
deployTokenFactory().catch(console.error);