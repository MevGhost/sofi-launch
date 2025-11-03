// Test encoding of createToken parameters
const Web3 = require('web3');
const web3 = new Web3();

// Function signature
const functionSig = 'createToken(string,string,string,string,string,string,string,string,uint256)';
const selector = web3.utils.keccak256(functionSig).slice(0, 10);
console.log('Function selector:', selector);

// Parameters
const params = [
  'thisisunclebaoawesome',  // name
  'UNCLE',                   // symbol
  'Token for Uncle Bao',     // description  
  'https://example.com/image.png', // imageUrl
  '',                        // twitter
  '',                        // telegram
  '',                        // website
  '',                        // category (empty 8th param)
  '0x2386f26fc10000'        // 0.01 ETH in wei (hex)
];

// Encode parameters
const types = ['string', 'string', 'string', 'string', 'string', 'string', 'string', 'string', 'uint256'];
const encoded = web3.eth.abi.encodeParameters(types, params);

console.log('\nEncoded parameters (first 200 chars):');
console.log(encoded.slice(0, 200));

console.log('\nFull calldata (selector + params):');
const fullCalldata = selector + encoded.slice(2); // Remove 0x from encoded
console.log('Length:', fullCalldata.length);
console.log('First 100 chars:', fullCalldata.slice(0, 100));