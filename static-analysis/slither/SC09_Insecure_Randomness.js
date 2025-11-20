const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('\n=== SC09: Insecure Randomness - Slither Static Analysis ===\n');

const contractPath = path.join(__dirname, '../../contracts/SC09_Insecure_Randomness/SC09_Insecure_Randomness_Victim.sol');

console.log('📋 Running Slither analysis on InsecureRandomness contract...\n');
console.log(`Contract: ${contractPath}\n`);

// Run Slither with randomness-related detectors
const slitherCommand = `slither ${contractPath} --detect weak-prng,timestamp,block-timestamp --json -`;

exec(slitherCommand, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
  
  let analysis = {
    critical: [],
    high: [],
    medium: [],
    low: [],
    informational: []
  };

  if (stdout) {
    try {
      const results = JSON.parse(stdout);
      
      if (results.success && results.results && results.results.detectors) {
        results.results.detectors.forEach(issue => {
          const severity = issue.impact.toLowerCase();
          const finding = {
            check: issue.check,
            impact: issue.impact,
            confidence: issue.confidence,
            description: issue.description
          };

          if (analysis[severity]) {
            analysis[severity].push(finding);
          }
        });
      }

      console.log('🔍 Slither Analysis Results:\n');
      console.log('═══════════════════════════════════════════════════════════\n');

      const severities = ['critical', 'high', 'medium', 'low', 'informational'];
      
      severities.forEach(severity => {
        const issues = analysis[severity];
        if (issues.length > 0) {
          console.log(`${getIcon(severity)} ${severity.toUpperCase()} Severity Issues: ${issues.length}\n`);
          
          issues.forEach((issue, idx) => {
            console.log(`  ${idx + 1}. [${issue.check}] - Confidence: ${issue.confidence}`);
            console.log(`     ${issue.description}`);
            console.log('');
          });
        }
      });

      console.log('═══════════════════════════════════════════════════════════\n');

    } catch (parseError) {
      console.log('📊 Slither Raw Output:\n');
      console.log(stdout);
    }
  }

  if (stderr && !stderr.includes('Compilation warnings')) {
    console.log('⚠️  Slither Warnings/Errors:\n');
    console.log(stderr);
    console.log('');
  }

  // Custom randomness analysis
  console.log('🎯 Randomness Source Analysis:\n');
  
  const contractCode = fs.readFileSync(contractPath, 'utf8');

  // Check insecure randomness sources
  const insecureSources = [
    { pattern: /block\.timestamp/g, name: 'block.timestamp', severity: '🔴', risk: 'HIGH' },
    { pattern: /block\.number/g, name: 'block.number', severity: '🔴', risk: 'HIGH' },
    { pattern: /block\.difficulty|block\.prevrandao/g, name: 'block.difficulty/prevrandao', severity: '🟠', risk: 'MEDIUM' },
    { pattern: /blockhash\(/g, name: 'blockhash()', severity: '🟠', risk: 'MEDIUM' },
    { pattern: /tx\.origin/g, name: 'tx.origin', severity: '🔴', risk: 'HIGH' },
    { pattern: /msg\.sender/g, name: 'msg.sender', severity: '🟡', risk: 'LOW-MEDIUM' }
  ];

  console.log('Insecure Randomness Sources Detected:\n');
  let hasInsecureSources = false;

  insecureSources.forEach(source => {
    const matches = (contractCode.match(source.pattern) || []).length;
    if (matches > 0) {
      hasInsecureSources = true;
      console.log(`  ${source.severity} ${source.name}: ${matches} occurrence(s) [Risk: ${source.risk}]`);
    }
  });

  if (!hasInsecureSources) {
    console.log('  ✓ No obvious insecure randomness sources detected');
  }

  // Check for secure randomness sources
  console.log('\nSecure Randomness Sources:\n');
  const secureSources = [
    { pattern: /VRFCoordinator|ChainlinkVRF/i, name: 'Chainlink VRF' },
    { pattern: /commit.*reveal/i, name: 'Commit-Reveal Scheme' },
    { pattern: /oracle.*random/i, name: 'Oracle-based randomness' }
  ];

  let hasSecureSources = false;
  secureSources.forEach(source => {
    if (source.pattern.test(contractCode)) {
      hasSecureSources = true;
      console.log(`  ✅ ${source.name}: Detected`);
    }
  });

  if (!hasSecureSources) {
    console.log('  ❌ No secure randomness source detected');
  }

  // Check for keccak256 hash usage
  const keccakUsage = (contractCode.match(/keccak256\(/g) || []).length;
  console.log(`\n  ${keccakUsage > 0 ? '⚠️ ' : 'ℹ️ '} keccak256() usage: ${keccakUsage}`);
  if (keccakUsage > 0) {
    console.log('     Note: keccak256 is deterministic; depends on input sources');
  }

  console.log('\n⚠️  Vulnerability Assessment:\n');
  
  if (hasInsecureSources && !hasSecureSources) {
    console.log('  🔴 CRITICAL: Contract uses insecure randomness sources!');
    console.log('  Impact:');
    console.log('    - Miners can manipulate outcomes');
    console.log('    - Predictable random values');
    console.log('    - Front-running attacks possible');
    console.log('    - Lottery/gambling exploits');
  } else if (hasSecureSources) {
    console.log('  ✅ Contract uses secure randomness source');
  } else {
    console.log('  ℹ️  No randomness generation detected');
  }

  console.log('\n📚 Attack Vectors:\n');
  console.log('  1. Miner Manipulation:');
  console.log('     - Miners control block.timestamp (±15 seconds)');
  console.log('     - Miners can influence block.difficulty');
  console.log('     - Can choose to include/exclude transactions');
  console.log('');
  console.log('  2. Front-Running:');
  console.log('     - Attacker observes pending transactions');
  console.log('     - Calculates outcome with known block data');
  console.log('     - Submits transaction only if favorable');
  console.log('');
  console.log('  3. Block Hash Prediction:');
  console.log('     - blockhash() only available for last 256 blocks');
  console.log('     - Returns 0 for older blocks');
  console.log('     - Can be manipulated by miners');

  console.log('\n🛡️  Secure Randomness Solutions:\n');
  console.log('  1. ✅ Chainlink VRF (Verifiable Random Function):');
  console.log('     import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";');
  console.log('     ');
  console.log('     - Cryptographically provable randomness');
  console.log('     - Cannot be manipulated by miners or validators');
  console.log('     - Provides verifiable proof');
  console.log('     - Small fee per request');
  console.log('');
  console.log('  2. ✅ Commit-Reveal Scheme:');
  console.log('     Phase 1 (Commit):');
  console.log('       bytes32 commitment = keccak256(abi.encodePacked(secret, msg.sender));');
  console.log('       commitments[msg.sender] = commitment;');
  console.log('     ');
  console.log('     Phase 2 (Reveal - after multiple blocks):');
  console.log('       require(keccak256(abi.encodePacked(secret, msg.sender)) == commitment);');
  console.log('       randomValue = uint256(keccak256(abi.encodePacked(allSecrets)));');
  console.log('     ');
  console.log('     - Requires multiple participants');
  console.log('     - Time delay between phases');
  console.log('     - Penalty for non-reveal');
  console.log('');
  console.log('  3. ✅ Oracle-Based Randomness:');
  console.log('     - Use trusted off-chain randomness oracle');
  console.log('     - API3 QRNG (Quantum Random Number Generator)');
  console.log('     - Threshold signatures from multiple parties');
  console.log('');
  console.log('  4. ⚠️  Hybrid Approach (Better than pure on-chain):');
  console.log('     - Combine multiple unpredictable sources');
  console.log('     - Future block hash + user input + oracle');
  console.log('     - Still vulnerable but harder to exploit');

  console.log('\n📝 Chainlink VRF Implementation Example:\n');
  console.log('  contract SecureLottery is VRFConsumerBaseV2 {');
  console.log('      uint256 public randomResult;');
  console.log('      ');
  console.log('      function requestRandomness() external {');
  console.log('          requestId = COORDINATOR.requestRandomWords(');
  console.log('              keyHash, subId, minConfirmations, callbackGasLimit, numWords');
  console.log('          );');
  console.log('      }');
  console.log('      ');
  console.log('      function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {');
  console.log('          randomResult = randomWords[0];');
  console.log('          // Use randomResult for fair selection');
  console.log('      }');
  console.log('  }');

  console.log('\n🎲 Use Cases Requiring Secure Randomness:\n');
  console.log('  • Lotteries and gambling DApps');
  console.log('  • NFT trait generation');
  console.log('  • Gaming (item drops, matchmaking)');
  console.log('  • Fair leader selection');
  console.log('  • Randomized airdrops');
  console.log('  • Proof of Stake validator selection');

  console.log('\n⚖️  Security vs Cost Trade-offs:\n');
  console.log('  Solution              | Security | Cost    | Complexity');
  console.log('  ----------------------|----------|---------|------------');
  console.log('  block.timestamp       | 🔴 LOW   | Free    | Simple');
  console.log('  blockhash()           | 🟠 LOW   | Free    | Simple');
  console.log('  Commit-Reveal         | 🟡 MED   | Gas only| Complex');
  console.log('  Chainlink VRF         | 🟢 HIGH  | LINK fee| Medium');
  console.log('  API3 QRNG             | 🟢 HIGH  | Gas only| Medium');

  console.log('\n═══════════════════════════════════════════════════════════\n');
  
  if (error && !stdout) {
    console.error('❌ Error running Slither. Make sure Slither is installed:');
    console.error('   pip3 install slither-analyzer\n');
    process.exit(1);
  }
  
  process.exit(0);
});

function getIcon(severity) {
  const icons = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🔵',
    informational: 'ℹ️'
  };
  return icons[severity] || '⚪';
}
