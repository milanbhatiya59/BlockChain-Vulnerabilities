const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('\n=== Research Paper: Inconsistent State Update - Slither Static Analysis ===\n');

const contractPath = path.join(__dirname, '../../../contracts/Research_Paper/Inconsistent_State_Update/Inconsistent_State_Update_Victim.sol');

console.log('📋 Running Slither analysis...\n');
console.log(`Contract: ${contractPath}\n`);

const slitherCommand = `slither ${contractPath} --detect uninitialized-state,incorrect-equality,events-maths --json -`;

exec(slitherCommand, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
  
  let analysis = { critical: [], high: [], medium: [], low: [], informational: [] };

  if (stdout) {
    try {
      const results = JSON.parse(stdout);
      if (results.success && results.results && results.results.detectors) {
        results.results.detectors.forEach(issue => {
          const severity = issue.impact.toLowerCase();
          if (analysis[severity]) analysis[severity].push({
            check: issue.check, impact: issue.impact,
            confidence: issue.confidence, description: issue.description
          });
        });
      }
      console.log('🔍 Slither Analysis Results:\n═══════════════════════════════════════════════════════════\n');
      ['critical', 'high', 'medium', 'low', 'informational'].forEach(severity => {
        if (analysis[severity].length > 0) {
          console.log(`${getIcon(severity)} ${severity.toUpperCase()}: ${analysis[severity].length}\n`);
          analysis[severity].forEach((issue, idx) => {
            console.log(`  ${idx + 1}. [${issue.check}] - ${issue.confidence}`);
            console.log(`     ${issue.description}\n`);
          });
        }
      });
      console.log('═══════════════════════════════════════════════════════════\n');
    } catch (e) { console.log('📊 Slither Raw Output:\n' + stdout); }
  }

  if (stderr && !stderr.includes('Compilation warnings')) console.log('⚠️  Warnings:\n' + stderr + '\n');

  console.log('🎯 Inconsistent State Update Analysis:\n');
  console.log('📖 Concept: State variables updated in inconsistent order or with');
  console.log('   missing synchronization, leading to invalid contract states.\n');
  
  const contractCode = fs.readFileSync(contractPath, 'utf8');

  // Check for state update patterns
  const stateUpdates = (contractCode.match(/\w+\s*[+\-*/]?=/g) || []).length;
  const multiVarFunctions = contractCode.split(/function\s+\w+/).filter(f => 
    (f.match(/\w+\s*=/g) || []).length >= 2
  ).length;

  console.log('State Update Pattern Analysis:\n');
  console.log(`  Total state modifications: ${stateUpdates}`);
  console.log(`  Functions with multiple state changes: ${multiVarFunctions}`);
  
  if (multiVarFunctions > 0) {
    console.log(`  🟠 Risk: ${multiVarFunctions} functions modify multiple states`);
    console.log(`     These require careful ordering and validation`);
  }

  // Check for critical invariants
  const hasRequires = (contractCode.match(/require\(/g) || []).length;
  const hasAsserts = (contractCode.match(/assert\(/g) || []).length;
  console.log(`\n  Validation checks: require(${hasRequires}), assert(${hasAsserts})`);

  console.log('\n⚠️  Inconsistent State Update Patterns:\n');
  console.log('  Common issues:');
  console.log('  1. Order Dependency: State A must be updated before State B');
  console.log('  2. Atomic Updates: Related states not updated atomically');
  console.log('  3. Missing Validation: No checks after multi-step updates');
  console.log('  4. Partial Updates: Some states updated, others left stale\n');

  console.log('🛡️  Mitigation:\n');
  console.log('  1. ✅ Use State Machines with explicit transitions');
  console.log('  2. ✅ Update related states in single atomic operation');
  console.log('  3. ✅ Add invariant checks after state modifications');
  console.log('  4. ✅ Use internal functions to ensure consistent updates');
  console.log('  5. ✅ Document update order requirements');

  console.log('\n═══════════════════════════════════════════════════════════\n');
  
  if (error && !stdout) {
    console.error('❌ Error running Slither. Install: pip3 install slither-analyzer\n');
    process.exit(1);
  }
  process.exit(0);
});

function getIcon(s) { return {critical:'🔴',high:'🟠',medium:'🟡',low:'🔵',informational:'ℹ️'}[s]||'⚪'; }
