const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('\n=== SC03: Logic Errors - Slither Static Analysis ===\n');

const contractPath = path.join(__dirname, '../../contracts/SC03_Logic_Errors/SC03_Logic_Errors_Victim.sol');

console.log('📋 Running Slither analysis on LogicErrorVault contract...\n');
console.log(`Contract: ${contractPath}\n`);

// Run Slither with detectors for logic errors
const slitherCommand = `slither ${contractPath} --detect incorrect-equality,divide-before-multiply,uninitialized-state,uninitialized-local --json -`;

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

  // Custom logic error analysis
  console.log('🎯 Logic Error Specific Analysis:\n');
  
  const contractCode = fs.readFileSync(contractPath, 'utf8');

  // Check 1: Incorrect conditional operators
  const wrongOperators = [
    { pattern: /if\s*\([^)]*==[^)]*\)/g, name: 'Equality checks (should use >= or <=?)', count: 0 },
    { pattern: /if\s*\([^)]*&&[^)]*\|\|[^)]*\)/g, name: 'Mixed AND/OR without parentheses', count: 0 }
  ];

  wrongOperators.forEach(check => {
    check.count = (contractCode.match(check.pattern) || []).length;
    if (check.count > 0) {
      console.log(`  ⚠️  ${check.name}: ${check.count}`);
    }
  });

  // Check 2: Order of operations issues
  const divideBeforeMultiply = /\/.*\*/g;
  const divMulIssues = (contractCode.match(divideBeforeMultiply) || []).length;
  console.log(`  ${divMulIssues > 0 ? '🔴' : '✓'} Divide before multiply: ${divMulIssues}`);

  // Check 3: Uninitialized variables
  const uninitializedPattern = /uint\s+\w+;/g;
  const uninitVars = (contractCode.match(uninitializedPattern) || []).length;
  console.log(`  ${uninitVars > 0 ? '🟡' : '✓'} Uninitialized variables: ${uninitVars}`);

  // Check 4: Off-by-one errors
  const loopPattern = /for\s*\([^;]*;\s*\w+\s*<\s*[^;]*\.length[^;]*;\s*\w+\+\+\)/g;
  const loops = (contractCode.match(loopPattern) || []).length;
  console.log(`  ℹ️  Array loops (check for off-by-one): ${loops}`);

  // Check 5: Missing return statements
  const functionPattern = /function\s+\w+\s*\([^)]*\)\s+\w+\s+returns\s*\([^)]*\)/g;
  const functionsWithReturns = (contractCode.match(functionPattern) || []).length;
  const returnStatements = (contractCode.match(/return\s+/g) || []).length;
  console.log(`  ℹ️  Functions with returns: ${functionsWithReturns}, Return statements: ${returnStatements}`);

  console.log('\n⚠️  Common Logic Errors:\n');
  console.log('  1. Incorrect comparison operators (== vs >=, <=)');
  console.log('  2. Off-by-one errors in loops and arrays');
  console.log('  3. Divide before multiply causing precision loss');
  console.log('  4. Missing initialization of state variables');
  console.log('  5. Incorrect boolean logic (AND/OR precedence)');

  console.log('\n🛡️  Recommendations:\n');
  console.log('  1. Use SafeMath or Solidity 0.8+ for arithmetic');
  console.log('  2. Add explicit initialization for all variables');
  console.log('  3. Write comprehensive unit tests for edge cases');
  console.log('  4. Use formal verification tools (Certora, etc.)');
  console.log('  5. Perform thorough code reviews');
  console.log('  6. Document expected behavior and invariants');

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
