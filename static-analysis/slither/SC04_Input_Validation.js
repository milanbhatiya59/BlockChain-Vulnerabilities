const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('\n=== SC04: Input Validation - Slither Static Analysis ===\n');

const contractPath = path.join(__dirname, '../../contracts/SC04_Input_Validation/SC04_Input_Validation_Victim.sol');

console.log('📋 Running Slither analysis on InputValidationVulnerable contract...\n');
console.log(`Contract: ${contractPath}\n`);

// Run Slither with detectors for input validation issues
const slitherCommand = `slither ${contractPath} --detect unchecked-transfer,uninitialized-state,calls-loop --json -`;

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

  // Custom input validation analysis
  console.log('🎯 Input Validation Specific Analysis:\n');
  
  const contractCode = fs.readFileSync(contractPath, 'utf8');

  // Check 1: Functions with parameters
  const functionParams = contractCode.match(/function\s+\w+\s*\([^)]+\)/g) || [];
  console.log(`  ℹ️  Functions with parameters: ${functionParams.length}`);

  // Check 2: Missing require statements
  const requireStatements = (contractCode.match(/require\s*\(/g) || []).length;
  console.log(`  ℹ️  Total require statements: ${requireStatements}`);

  // Check 3: Address validation
  const addressValidation = /require\s*\([^)]*!=\s*address\(0\)/g;
  const addressChecks = (contractCode.match(addressValidation) || []).length;
  console.log(`  ${addressChecks > 0 ? '✓' : '🔴'} Address zero checks: ${addressChecks}`);

  // Check 4: Amount/value validation
  const amountValidation = /require\s*\([^)]*>\s*0/g;
  const amountChecks = (contractCode.match(amountValidation) || []).length;
  console.log(`  ${amountChecks > 0 ? '✓' : '🔴'} Amount validation checks: ${amountChecks}`);

  // Check 5: Array length validation
  const arrayLengthCheck = /require\s*\([^)]*\.length/g;
  const arrayChecks = (contractCode.match(arrayLengthCheck) || []).length;
  console.log(`  ${arrayChecks > 0 ? '✓' : '🟡'} Array length validation: ${arrayChecks}`);

  // Check 6: External calls without validation
  const externalCalls = (contractCode.match(/\.call\{|\.transfer\(|\.send\(/g) || []).length;
  console.log(`  ℹ️  External calls: ${externalCalls}`);

  // Check 7: Unchecked type casts
  const typeCasts = (contractCode.match(/address\(|uint\d*\(|int\d*\(/g) || []).length;
  console.log(`  ⚠️  Type casts (may need validation): ${typeCasts}`);

  console.log('\n⚠️  Missing Input Validations:\n');
  
  const issues = [];
  
  if (addressChecks < functionParams.length * 0.5) {
    issues.push('  🔴 Insufficient address validation');
  }
  
  if (amountChecks < externalCalls) {
    issues.push('  🔴 Missing amount/value validation before transfers');
  }
  
  if (requireStatements < functionParams.length) {
    issues.push('  🟠 Functions with parameters missing validation');
  }

  if (issues.length > 0) {
    issues.forEach(issue => console.log(issue));
  } else {
    console.log('  ✓ Basic validations appear present');
  }

  console.log('\n🛡️  Recommendations:\n');
  console.log('  1. Validate all address parameters != address(0)');
  console.log('  2. Check amounts/values > 0 before transfers');
  console.log('  3. Validate array lengths and indices');
  console.log('  4. Add bounds checking for numerical inputs');
  console.log('  5. Validate msg.value matches expected amount');
  console.log('  6. Check array bounds before access');
  console.log('  7. Validate external data before use');
  console.log('  8. Use custom errors for better validation messages');

  console.log('\n📝 Input Validation Checklist:\n');
  console.log('  [ ] Address parameters checked for zero address');
  console.log('  [ ] Numerical values within expected ranges');
  console.log('  [ ] Array lengths validated before loops');
  console.log('  [ ] msg.value checked when required');
  console.log('  [ ] String/bytes lengths validated');
  console.log('  [ ] Enum values within valid range');
  console.log('  [ ] External data sanitized before use');

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
