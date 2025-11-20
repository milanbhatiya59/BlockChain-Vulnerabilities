const fs = require('fs');
const path = require('path');

console.log('\n=== SC09: Insecure Randomness - Static Analysis ===\n');

// Paths to contract files
const contractsDir = path.join(__dirname, '../contracts/SC09_Insecure_Randomness');
const victimFile = path.join(contractsDir, 'SC09_Insecure_Randomness_Victim.sol');
const attackerFile = path.join(contractsDir, 'SC09_Insecure_Randomness_Attacker.sol');

// Read contract files
const victimCode = fs.readFileSync(victimFile, 'utf8');
const attackerCode = fs.readFileSync(attackerFile, 'utf8');

let issueCount = 0;

console.log('📋 Analyzing Victim Contract: SC09_Insecure_Randomness_Victim.sol\n');

// Analysis patterns for insecure randomness vulnerabilities
const vulnerabilityPatterns = [
    {
        name: 'block.timestamp in Random Generation',
        pattern: /keccak256\([^)]*block\.timestamp[^)]*\)/g,
        severity: 'HIGH',
        description: 'Using block.timestamp for randomness - miners can manipulate within ~15 seconds',
        recommendation: 'Use Chainlink VRF or commit-reveal schemes'
    },
    {
        name: 'block.number in Random Generation',
        pattern: /keccak256\([^)]*block\.number[^)]*\)/g,
        severity: 'HIGH',
        description: 'Using block.number for randomness - completely predictable',
        recommendation: 'Use Chainlink VRF or commit-reveal schemes'
    },
    {
        name: 'blockhash in Random Generation',
        pattern: /blockhash\(|keccak256\([^)]*blockhash[^)]*\)/g,
        severity: 'HIGH',
        description: 'Using blockhash for randomness - predictable for past blocks, manipulatable for future',
        recommendation: 'Use Chainlink VRF or commit-reveal schemes'
    },
    {
        name: 'msg.sender in Random Generation',
        pattern: /keccak256\([^)]*msg\.sender[^)]*\)/g,
        severity: 'CRITICAL',
        description: 'Using msg.sender for randomness - attacker knows their own address',
        recommendation: 'Never use msg.sender as entropy source'
    },
    {
        name: 'tx.origin in Random Generation',
        pattern: /keccak256\([^)]*tx\.origin[^)]*\)/g,
        severity: 'CRITICAL',
        description: 'Using tx.origin for randomness - attacker knows the origin address',
        recommendation: 'Never use tx.origin as entropy source'
    },
    {
        name: 'block.difficulty/prevrandao in Random Generation',
        pattern: /keccak256\([^)]*block\.(difficulty|prevrandao)[^)]*\)/g,
        severity: 'HIGH',
        description: 'Using block.difficulty/prevrandao for randomness - can be influenced by miners/validators',
        recommendation: 'Use Chainlink VRF or commit-reveal schemes'
    },
    {
        name: 'Weak Entropy Combination',
        pattern: /keccak256\(abi\.encodePacked\([^)]*block\.(timestamp|number)[^)]*msg\.sender[^)]*\)\)/g,
        severity: 'HIGH',
        description: 'Combining multiple weak entropy sources - still predictable',
        recommendation: 'Use proper random number generation (Chainlink VRF)'
    },
    {
        name: 'Direct Random Usage in Financial Logic',
        pattern: /if\s*\([^)]*random[^)]*\)\s*\{[^}]*transfer[^}]*\}/gs,
        severity: 'CRITICAL',
        description: 'Using weak randomness to determine financial outcomes',
        recommendation: 'Use cryptographically secure randomness for financial decisions'
    }
];

// Analyze victim contract
console.log('🔍 Scanning for Insecure Randomness Patterns:\n');

vulnerabilityPatterns.forEach(vuln => {
    const matches = victimCode.matchAll(vuln.pattern);
    const matchArray = Array.from(matches);
    
    if (matchArray.length > 0) {
        issueCount++;
        console.log(`❌ [${vuln.severity}] ${vuln.name}`);
        console.log(`   Description: ${vuln.description}`);
        console.log(`   Occurrences: ${matchArray.length}`);
        console.log(`   Recommendation: ${vuln.recommendation}`);
        
        // Show first few matches
        matchArray.slice(0, 2).forEach((match, idx) => {
            const preview = match[0].substring(0, 60);
            console.log(`   Example ${idx + 1}: ${preview}...`);
        });
        console.log('');
    }
});

// Check for Chainlink VRF usage
if (!victimCode.includes('VRFConsumer') && !victimCode.includes('requestRandomness')) {
    issueCount++;
    console.log(`⚠️  [HIGH] No Chainlink VRF Implementation`);
    console.log(`   Description: Contract does not use Chainlink VRF for secure randomness`);
    console.log(`   Recommendation: Integrate Chainlink VRF for verifiable random numbers`);
    console.log('');
}

// Check for commit-reveal pattern
if (!victimCode.includes('commit') && !victimCode.includes('reveal')) {
    console.log(`ℹ️  No Commit-Reveal Pattern Detected`);
    console.log(`   Note: Commit-reveal scheme could provide basic protection`);
    console.log('');
}

// Detect vulnerable functions
const vulnerableFunctions = [
    'playLotteryTimestamp',
    'playLotteryBlockNumber',
    'playLotteryBlockhash',
    'playLotterySender',
    'playLotteryCombined',
    'playLotteryDifficulty',
    'mintNFT',
    'selectRandomWinner',
    'flip'
];

console.log('🎯 Vulnerable Functions Detected:');
let vulnerableFunctionCount = 0;
vulnerableFunctions.forEach(funcName => {
    if (victimCode.includes(`function ${funcName}`)) {
        const funcMatch = victimCode.match(new RegExp(`function ${funcName}[^}]*random[^}]*`, 's'));
        if (funcMatch) {
            vulnerableFunctionCount++;
            console.log(`   - ${funcName}: ❌ Uses insecure randomness`);
        }
    }
});
console.log(`   Total: ${vulnerableFunctionCount} vulnerable functions\n`);

// Check for financial impact
const financialPatterns = [
    { pattern: /jackpot/gi, name: 'Jackpot/Prize Pool' },
    { pattern: /transfer\(/g, name: 'ETH Transfers' },
    { pattern: /rare|rarity/gi, name: 'Rarity/Valuable Items' },
    { pattern: /winner/gi, name: 'Winner Selection' }
];

console.log('💰 Financial Impact Analysis:');
financialPatterns.forEach(fp => {
    const matches = (victimCode.match(fp.pattern) || []).length;
    if (matches > 0) {
        console.log(`   - ${fp.name}: ${matches} occurrence(s)`);
    }
});
console.log('');

// Analyze attacker contract
console.log('📋 Analyzing Attacker Contract: SC09_Insecure_Randomness_Attacker.sol\n');

const attackMethods = [
    'attackTimestampLottery',
    'attackBlockNumberLottery',
    'attackBlockhashLottery',
    'attackSenderLottery',
    'attackCombinedLottery',
    'attackDifficultyLottery',
    'attackMint',
    'bruteForceRareMint',
    'attackFlip',
    'becomeChampion'
];

console.log('🎯 Attack Methods Detected:');
let attackMethodCount = 0;
attackMethods.forEach(method => {
    if (attackerCode.includes(`function ${method}`)) {
        attackMethodCount++;
        console.log(`   ✓ ${method}`);
    }
});
console.log(`   Total: ${attackMethodCount} attack methods\n`);

// Check for exploit patterns
const exploitPatterns = [
    {
        name: 'Pre-computation of Random Values',
        pattern: /predictedRandom\s*=\s*uint256\(keccak256/g,
        description: 'Calculates random values before calling victim'
    },
    {
        name: 'Conditional Execution',
        pattern: /if\s*\(predictedRandom[^}]*\)\s*\{[^}]*victim\./gs,
        description: 'Only calls victim contract when prediction is favorable'
    },
    {
        name: 'Same-Block Calculation',
        pattern: /block\.(timestamp|number|prevrandao)/g,
        description: 'Uses same block variables as victim in same transaction'
    },
    {
        name: 'Brute Force Approach',
        pattern: /revert.*try again|wait.*block/gi,
        description: 'Reverts and retries until favorable outcome'
    }
];

console.log('🔍 Exploit Techniques Used:');
exploitPatterns.forEach(pattern => {
    const matches = (attackerCode.match(pattern.pattern) || []).length;
    if (matches > 0) {
        console.log(`   - ${pattern.name}: ${matches} occurrence(s)`);
        console.log(`     ${pattern.description}`);
    }
});
console.log('');

// Security recommendations
console.log('🛡️  Security Recommendations:\n');

const recommendations = [
    {
        priority: 'CRITICAL',
        title: 'Use Chainlink VRF for Randomness',
        description: 'Chainlink VRF provides verifiable random numbers that cannot be predicted or manipulated. This is the gold standard for blockchain randomness.',
        implementation: 'import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol"'
    },
    {
        priority: 'HIGH',
        title: 'Implement Commit-Reveal Scheme',
        description: 'For simpler use cases, a commit-reveal scheme can prevent prediction. Users commit to a value, then reveal it later.',
        implementation: 'Store hash of random seed, reveal after commitment period'
    },
    {
        priority: 'HIGH',
        title: 'Never Use Block Variables Alone',
        description: 'block.timestamp, block.number, blockhash, and block.prevrandao should never be sole sources of randomness.',
        implementation: 'Combine with external oracle or commit-reveal'
    },
    {
        priority: 'CRITICAL',
        title: 'Never Use msg.sender/tx.origin for Randomness',
        description: 'Attacker always knows their own address and can compute the outcome before calling.',
        implementation: 'Remove all uses of msg.sender/tx.origin in random generation'
    },
    {
        priority: 'MEDIUM',
        title: 'Use Block Delay for Blockhash',
        description: 'If using blockhash, reference future blocks that don\'t exist yet at transaction time.',
        implementation: 'Store request, fulfill using blockhash of future block'
    },
    {
        priority: 'HIGH',
        title: 'Separate Randomness Request from Usage',
        description: 'Request randomness in one transaction, use it in another after it\'s been generated.',
        implementation: 'Two-step process with cooldown period'
    }
];

recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. [${rec.priority}] ${rec.title}`);
    console.log(`   ${rec.description}`);
    console.log(`   Implementation: ${rec.implementation}`);
    console.log('');
});

// Code examples
console.log('📝 Secure Code Examples:\n');

console.log('// ❌ VULNERABLE (Using block.timestamp):');
console.log('uint256 random = uint256(keccak256(abi.encodePacked(block.timestamp))) % 100;');
console.log('if (random < 10) { payable(msg.sender).transfer(jackpot); }');
console.log('');

console.log('// ✅ SAFE (Using Chainlink VRF):');
console.log('contract SecureLottery is VRFConsumerBase {');
console.log('    bytes32 internal keyHash;');
console.log('    uint256 internal fee;');
console.log('    ');
console.log('    function playLottery() external payable {');
console.log('        require(LINK.balanceOf(address(this)) >= fee, "Not enough LINK");');
console.log('        requestRandomness(keyHash, fee);  // Request random number');
console.log('    }');
console.log('    ');
console.log('    function fulfillRandomness(bytes32 requestId, uint256 randomness) internal override {');
console.log('        uint256 random = randomness % 100;');
console.log('        if (random < 10) { /* winner logic */ }');
console.log('    }');
console.log('}');
console.log('');

console.log('// ✅ SAFE (Using Commit-Reveal):');
console.log('mapping(address => bytes32) public commitments;');
console.log('mapping(address => uint256) public commitTime;');
console.log('');
console.log('function commit(bytes32 commitment) external {');
console.log('    commitments[msg.sender] = commitment;');
console.log('    commitTime[msg.sender] = block.timestamp;');
console.log('}');
console.log('');
console.log('function reveal(uint256 secret) external {');
console.log('    require(block.timestamp >= commitTime[msg.sender] + 1 minutes);');
console.log('    require(keccak256(abi.encodePacked(secret)) == commitments[msg.sender]);');
console.log('    uint256 random = secret % 100;  // Use revealed secret');
console.log('    // ... game logic');
console.log('}');
console.log('');

// Summary
console.log('═══════════════════════════════════════════════════════════\n');
console.log(`📊 Analysis Summary:`);
console.log(`   Total Issues Found: ${issueCount}`);
console.log(`   Vulnerable Functions: ${vulnerableFunctionCount}`);
console.log(`   Attack Methods: ${attackMethodCount}`);
console.log(`   Severity: CRITICAL - Financial loss, unfair games, NFT manipulation`);
console.log('');

console.log('⚠️  CRITICAL VULNERABILITIES DETECTED!');
console.log('');
console.log('Impact:');
console.log('   • Lottery/gambling outcomes can be predicted');
console.log('   • Rare NFT minting can be manipulated');
console.log('   • Winner selection can be influenced');
console.log('   • Jackpots can be stolen with 100% success rate');
console.log('');
console.log('Exploitation:');
console.log('   • Attacker calculates outcome before calling contract');
console.log('   • Only participates when outcome is favorable');
console.log('   • Can guarantee wins in games of chance');
console.log('   • Can mint only rare/valuable NFTs');
console.log('');

if (issueCount > 0) {
    console.log('🚨 This contract is intentionally vulnerable for educational purposes.');
    console.log('   NEVER use block variables for randomness in production!');
    console.log('   ALWAYS use Chainlink VRF or proper commit-reveal schemes!');
}

console.log('\n═══════════════════════════════════════════════════════════\n');

process.exit(0);
