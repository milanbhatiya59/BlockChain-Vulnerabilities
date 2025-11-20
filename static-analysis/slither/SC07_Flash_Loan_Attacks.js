const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('\n=== SC07: Flash Loan Attacks - Slither Static Analysis ===\n');

const contractPath = path.join(__dirname, '../../contracts/SC07_Flash_Loan_Attacks/SC07_Flash_Loan_Victim.sol');

console.log('📋 Running Slither analysis on FlashLoanVulnerable contract...\n');
console.log(`Contract: ${contractPath}\n`);

// Run Slither with detectors relevant to flash loan vulnerabilities
const slitherCommand = `slither ${contractPath} --detect timestamp,weak-prng,reentrancy-eth --json -`;

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

  // Custom flash loan vulnerability analysis
  console.log('🎯 Flash Loan Attack Vector Analysis:\n');
  
  const contractCode = fs.readFileSync(contractPath, 'utf8');

  // Check 1: Price oracle dependency
  const priceOracles = [
    { pattern: /getPrice|price\s*=/g, name: 'Price oracle calls' },
    { pattern: /balanceOf|getReserves/g, name: 'Balance-based pricing' }
  ];

  console.log('Price Manipulation Vectors:\n');
  priceOracles.forEach(check => {
    const matches = (contractCode.match(check.pattern) || []).length;
    if (matches > 0) {
      console.log(`  ${matches > 0 ? '🔴' : '✓'} ${check.name}: ${matches}`);
    }
  });

  // Check 2: Single transaction atomic operations
  const atomicOperations = /function\s+\w+.*{[^}]*(deposit|withdraw|swap|borrow)[^}]*(withdraw|swap|deposit|repay)/gs;
  const hasAtomicOps = atomicOperations.test(contractCode);
  console.log(`\n  ${hasAtomicOps ? '🔴' : '✓'} Atomic operations in single tx: ${hasAtomicOps ? 'Yes' : 'No'}`);

  // Check 3: TWAP implementation
  const twapPattern = /TWAP|timeWeighted|cumulativePrice|observe/i;
  const hasTWAP = twapPattern.test(contractCode);
  console.log(`  ${hasTWAP ? '✓' : '🔴'} TWAP protection: ${hasTWAP ? 'Implemented' : 'Missing'}`);

  // Check 4: Flash loan checks
  const flashLoanChecks = /flashLoan|onFlashLoan|FLASH_LOAN/i;
  const hasFlashLoanLogic = flashLoanChecks.test(contractCode);
  console.log(`  ${hasFlashLoanLogic ? '🟡' : 'ℹ️ '} Flash loan logic: ${hasFlashLoanLogic ? 'Present' : 'Not present'}`);

  // Check 5: Balance snapshot before/after
  const balanceSnapshot = /balanceBefore|initialBalance|snapshot/i;
  const hasBalanceSnapshot = balanceSnapshot.test(contractCode);
  console.log(`  ${hasBalanceSnapshot ? '✓' : '🔴'} Balance snapshot validation: ${hasBalanceSnapshot ? 'Yes' : 'No'}`);

  // Check 6: Reentrancy guards
  const hasReentrancyGuard = /nonReentrant|ReentrancyGuard/i.test(contractCode);
  console.log(`  ${hasReentrancyGuard ? '✓' : '🟠'} Reentrancy protection: ${hasReentrancyGuard ? 'Yes' : 'No'}`);

  console.log('\n⚠️  Flash Loan Vulnerability Vectors:\n');
  
  const vulnerabilities = [];
  
  if (!hasTWAP) {
    vulnerabilities.push('  🔴 CRITICAL: No TWAP - vulnerable to price manipulation');
  }
  
  if (!hasBalanceSnapshot) {
    vulnerabilities.push('  🔴 HIGH: Missing balance validation before/after operations');
  }
  
  if (hasAtomicOps && !hasReentrancyGuard) {
    vulnerabilities.push('  🟠 MEDIUM: Atomic operations without reentrancy guard');
  }

  if (vulnerabilities.length > 0) {
    vulnerabilities.forEach(v => console.log(v));
  } else {
    console.log('  ✓ Basic flash loan protections appear present');
  }

  console.log('\n📚 Common Flash Loan Attack Patterns:\n');
  console.log('  1. Price Oracle Manipulation:');
  console.log('     - Attacker borrows large amount via flash loan');
  console.log('     - Manipulates DEX price by swapping');
  console.log('     - Exploits manipulated price in target protocol');
  console.log('     - Repays flash loan with profit');
  console.log('');
  console.log('  2. Governance Attack:');
  console.log('     - Flash loan tokens for voting power');
  console.log('     - Pass malicious governance proposal');
  console.log('     - Execute and profit');
  console.log('     - Return borrowed tokens');
  console.log('');
  console.log('  3. Collateral Manipulation:');
  console.log('     - Flash loan to inflate collateral value');
  console.log('     - Borrow maximum against inflated collateral');
  console.log('     - Deflate collateral value');
  console.log('     - Keep borrowed funds, return flash loan');

  console.log('\n🛡️  Mitigation Strategies:\n');
  console.log('  1. ✅ Use Time-Weighted Average Price (TWAP):');
  console.log('     - Uniswap V3 observe() function');
  console.log('     - Minimum time window (e.g., 10-30 minutes)');
  console.log('     - Cannot be manipulated in single transaction');
  console.log('');
  console.log('  2. ✅ Implement Chainlink Price Feeds:');
  console.log('     - Decentralized oracle network');
  console.log('     - Multiple data sources');
  console.log('     - Resistant to manipulation');
  console.log('');
  console.log('  3. ✅ Add Balance Validation:');
  console.log('     uint256 balanceBefore = token.balanceOf(address(this));');
  console.log('     // ... perform operations ...');
  console.log('     uint256 balanceAfter = token.balanceOf(address(this));');
  console.log('     require(balanceAfter >= balanceBefore + expected);');
  console.log('');
  console.log('  4. ✅ Rate Limiting:');
  console.log('     - Limit operations per block/time period');
  console.log('     - Prevent large atomic manipulations');
  console.log('');
  console.log('  5. ✅ Multi-Block Operations:');
  console.log('     - Require operations across multiple blocks');
  console.log('     - Use commit-reveal schemes');
  console.log('');
  console.log('  6. ✅ Flash Loan Detection:');
  console.log('     - Track balance changes within single transaction');
  console.log('     - Reject if balance increased then decreased');

  console.log('\n📊 Historical Flash Loan Attacks:\n');
  console.log('  • Harvest Finance: $34M (Oct 2020)');
  console.log('  • bZx Protocol: $8M (Feb 2020)');
  console.log('  • Cream Finance: $130M (Oct 2021)');
  console.log('  • Inverse Finance: $15M (Apr 2022)');

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
