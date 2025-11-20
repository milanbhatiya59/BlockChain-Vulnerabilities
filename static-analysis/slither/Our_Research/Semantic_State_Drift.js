const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('\n=== Our Research: Semantic State Drift - Slither Static Analysis ===\n');

const contractPath = path.join(__dirname, '../../../contracts/Our_Research/Semantic_State_Drift/Semantic_State_Drift_Victim.sol');

console.log('📋 Running Slither analysis on SemanticStateDriftVictim contract...\n');
console.log(`Contract: ${contractPath}\n`);

// Run Slither with state consistency detectors
const slitherCommand = `slither ${contractPath} --detect incorrect-equality,uninitialized-state,events-maths --json -`;

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

  // Custom semantic state drift analysis
  console.log('🎯 Semantic State Drift Analysis:\n');
  console.log('📖 Concept: State variables that should maintain invariant relationships');
  console.log('   but drift apart due to inconsistent update patterns.\n');
  
  const contractCode = fs.readFileSync(contractPath, 'utf8');

  // Check 1: Identify state variables
  const stateVars = contractCode.match(/(?:public|private|internal)\s+(?:mapping|uint256|uint|address)\s+\w+/g) || [];
  console.log(`State Variables Analysis:`);
  console.log(`  Total state variables: ${stateVars.length}`);

  // Check 2: Functions that modify state
  const stateMutatingFunctions = contractCode.match(/function\s+\w+[^{]*{[^}]*(?:\w+\s*=|\w+\[)/gs) || [];
  console.log(`  State-mutating functions: ${stateMutatingFunctions.length}\n`);

  // Check 3: Invariant tracking variables
  const totalPattern = /total\w*/gi;
  const hasTotalTracking = totalPattern.test(contractCode);
  console.log(`Invariant Tracking:`);
  console.log(`  ${hasTotalTracking ? '✓' : '❌'} Total/aggregate variables: ${hasTotalTracking ? 'Found' : 'Not found'}`);

  // Check 4: Check for synchronization issues
  const balanceUpdates = (contractCode.match(/balances\[/g) || []).length;
  const totalUpdates = (contractCode.match(/totalDeposits\s*[+=\-]/g) || []).length;
  console.log(`  Balance updates: ${balanceUpdates}`);
  console.log(`  Total tracking updates: ${totalUpdates}`);
  
  if (balanceUpdates > totalUpdates + 2) {
    console.log(`  🔴 DRIFT RISK: More balance updates than total updates!`);
  }

  // Check 5: Fee deductions
  const feePattern = /fee|Fee|charge/i;
  const hasFees = feePattern.test(contractCode);
  console.log(`\n  ${hasFees ? '🟠' : '✓'} Fee mechanisms: ${hasFees ? 'Present (drift risk!)' : 'Not detected'}`);

  // Check 6: Transfer functions
  const transferFunctions = contractCode.match(/function\s+transfer\w*/gi) || [];
  console.log(`  Transfer functions: ${transferFunctions.length}`);

  console.log('\n⚠️  Semantic State Drift Vulnerability Pattern:\n');
  console.log('  The vulnerability occurs when:');
  console.log('  1. Contract maintains aggregate state (e.g., totalDeposits)');
  console.log('  2. Contract maintains individual states (e.g., balances[])');
  console.log('  3. Invariant should hold: totalDeposits == sum(all balances)');
  console.log('  4. Some operations update balances[] but NOT totalDeposits');
  console.log('  5. This creates "drift" between expected and actual values\n');

  console.log('  Example Vulnerable Pattern:');
  console.log('    function transferWithFee(address to, uint amount, uint fee) {');
  console.log('        balances[msg.sender] -= (amount + fee);  // Balance updated');
  console.log('        balances[to] += amount;                   // Balance updated');
  console.log('        // totalDeposits NOT updated! ❌');
  console.log('        // Drift = fee amount');
  console.log('    }\n');

  // Check 7: Invariant validation functions
  const invariantCheck = /require\s*\([^)]*total[^)]*==/gi;
  const hasInvariantChecks = invariantCheck.test(contractCode);
  console.log(`Invariant Validation:`);
  console.log(`  ${hasInvariantChecks ? '✓' : '🔴'} Explicit invariant checks: ${hasInvariantChecks ? 'Present' : 'Missing'}`);

  // Check 8: View functions for verification
  const verificationFunctions = /function\s+\w*(verify|check|validate|compute)\w*.*view/gi;
  const hasVerification = verificationFunctions.test(contractCode);
  console.log(`  ${hasVerification ? '✓' : '🟡'} Verification functions: ${hasVerification ? 'Present' : 'Missing'}`);

  console.log('\n🛡️  Mitigation Strategies:\n');
  console.log('  1. ✅ Maintain Strict Update Discipline:');
  console.log('     - ALWAYS update aggregate when updating individual states');
  console.log('     - Use internal functions to ensure consistency\n');
  console.log('     function _updateBalance(address user, uint delta, bool isAdd) internal {');
  console.log('         if (isAdd) {');
  console.log('             balances[user] += delta;');
  console.log('             totalDeposits += delta;  // Keep in sync');
  console.log('         } else {');
  console.log('             balances[user] -= delta;');
  console.log('             totalDeposits -= delta;  // Keep in sync');
  console.log('         }');
  console.log('     }\n');

  console.log('  2. ✅ Implement Invariant Checks:');
  console.log('     modifier checkInvariant() {');
  console.log('         _;');
  console.log('         assert(verifyInvariant());');
  console.log('     }');
  console.log('     ');
  console.log('     function verifyInvariant() internal view returns (bool) {');
  console.log('         uint sum = 0;');
  console.log('         for (uint i = 0; i < users.length; i++) {');
  console.log('             sum += balances[users[i]];');
  console.log('         }');
  console.log('         return sum == totalDeposits;');
  console.log('     }\n');

  console.log('  3. ✅ Avoid Direct State Modification:');
  console.log('     - Use helper functions for all state changes');
  console.log('     - Make raw state variables private');
  console.log('     - Expose only through controlled getters/setters\n');

  console.log('  4. ✅ Fee Handling:');
  console.log('     - If fees are deducted, decide: should they affect total?');
  console.log('     - Option A: Include fees in total (track separately)');
  console.log('     - Option B: Adjust total when fees are deducted');
  console.log('     - Be CONSISTENT across all operations\n');

  console.log('  5. ✅ Regular Audits:');
  console.log('     - Add view functions to check invariants');
  console.log('     - Monitor on-chain state periodically');
  console.log('     - Alert on drift detection\n');

  console.log('📊 Impact of Semantic State Drift:\n');
  console.log('  • Incorrect accounting and financial calculations');
  console.log('  • Protocol insolvency (thinks it has more than it does)');
  console.log('  • Inability to withdraw funds');
  console.log('  • Audit failures and trust loss');
  console.log('  • Potential for exploitation');

  console.log('\n🔬 Detection Strategy:\n');
  console.log('  Static Analysis:');
  console.log('    ✓ Identify aggregate and individual state variables');
  console.log('    ✓ Track all functions that modify state');
  console.log('    ✓ Verify every modification updates both');
  console.log('    ✓ Flag asymmetric update patterns');
  console.log('  ');
  console.log('  Dynamic Analysis:');
  console.log('    ✓ Test invariants before/after each operation');
  console.log('    ✓ Fuzz test with various operation sequences');
  console.log('    ✓ Monitor for drift accumulation');

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
