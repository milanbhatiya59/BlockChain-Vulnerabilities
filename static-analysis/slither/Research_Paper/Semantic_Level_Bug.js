const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('\n=== Research Paper: Semantic Level Bug - Slither Static Analysis ===\n');

const contractPath = path.join(__dirname, '../../../contracts/Research_Paper/Semantic_Level_Bug/Semantic_Level_Bug_Victim.sol');

console.log('📋 Running Slither analysis...\n');
console.log(`Contract: ${contractPath}\n`);

const slitherCommand = `slither ${contractPath} --detect incorrect-equality,divide-before-multiply,weak-prng --json -`;

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

  console.log('🎯 Semantic Level Bug Analysis:\n');
  console.log('📖 Concept: Bugs in the business logic that don\'t violate syntax');
  console.log('   or type rules but violate the intended semantics/behavior.\n');
  
  const contractCode = fs.readFileSync(contractPath, 'utf8');

  // Check for semantic issues
  const comparisonOps = (contractCode.match(/[<>]=?|==|!=/g) || []).length;
  const arithmeticOps = (contractCode.match(/[+\-*\/]/g) || []).length;
  const logicalOps = (contractCode.match(/&&|\|\||!/g) || []).length;

  console.log('Logic Complexity Analysis:\n');
  console.log(`  Comparison operations: ${comparisonOps}`);
  console.log(`  Arithmetic operations: ${arithmeticOps}`);
  console.log(`  Logical operations: ${logicalOps}`);
  
  if (comparisonOps + logicalOps > 20) {
    console.log(`  🟠 High complexity: ${comparisonOps + logicalOps} logic operations`);
    console.log(`     Complex logic increases risk of semantic errors`);
  }

  // Check for potential semantic errors
  const semanticRisks = [
    { pattern: /if\s*\([^)]*==/, name: 'Equality checks (strict comparison)', count: 0 },
    { pattern: /\w+\s*\/\s*\w+\s*\*/, name: 'Divide before multiply', count: 0 },
    { pattern: /&&.*\|\||\|\|.*&&/, name: 'Mixed AND/OR logic', count: 0 }
  ];

  console.log('\nSemantic Risk Patterns:\n');
  semanticRisks.forEach(risk => {
    risk.count = (contractCode.match(risk.pattern) || []).length;
    if (risk.count > 0) {
      console.log(`  🟡 ${risk.name}: ${risk.count}`);
    }
  });

  console.log('\n⚠️  Semantic Level Bug Patterns:\n');
  console.log('  Examples of semantic bugs:');
  console.log('  1. Using == instead of >= for balance checks');
  console.log('  2. Incorrect order of operations in calculations');
  console.log('  3. Wrong boolean logic (AND instead of OR)');
  console.log('  4. Off-by-one errors in loops');
  console.log('  5. Misunderstanding of operator precedence\n');

  console.log('  Example:');
  console.log('    // Intended: User can withdraw if balance >= amount');
  console.log('    require(balance == amount);  // BUG: Only exact amount! ❌');
  console.log('    require(balance >= amount);  // CORRECT ✅\n');

  console.log('🛡️  Mitigation:\n');
  console.log('  1. ✅ Comprehensive unit tests with edge cases');
  console.log('  2. ✅ Formal specification of intended behavior');
  console.log('  3. ✅ Code review by domain experts');
  console.log('  4. ✅ Property-based testing (fuzzing)');
  console.log('  5. ✅ Formal verification tools');
  console.log('  6. ✅ Clear documentation of business logic');

  console.log('\n═══════════════════════════════════════════════════════════\n');
  
  if (error && !stdout) {
    console.error('❌ Error running Slither. Install: pip3 install slither-analyzer\n');
    process.exit(1);
  }
  process.exit(0);
});

function getIcon(s) { return {critical:'🔴',high:'🟠',medium:'🟡',low:'🔵',informational:'ℹ️'}[s]||'⚪'; }
