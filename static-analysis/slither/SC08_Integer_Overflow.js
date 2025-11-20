const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('\n=== SC08: Integer Overflow/Underflow - Slither Static Analysis ===\n');

const contractPath = path.join(__dirname, '../../contracts/SC08_Integer_Overflow/SC08_Integer_Overflow_Victim.sol');

console.log('📋 Running Slither analysis on IntegerOverflowVulnerable contract...\n');
console.log(`Contract: ${contractPath}\n`);

// Run Slither with overflow/underflow detectors
const slitherCommand = `slither ${contractPath} --detect integer-overflow,divide-before-multiply,uninitialized-state --json -`;

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

  // Custom integer overflow/underflow analysis
  console.log('🎯 Integer Overflow/Underflow Analysis:\n');
  
  const contractCode = fs.readFileSync(contractPath, 'utf8');

  // Check Solidity version
  const versionMatch = contractCode.match(/pragma solidity\s+\^?([\d.]+)/);
  const version = versionMatch ? versionMatch[1] : 'unknown';
  const majorMinor = version.split('.').slice(0, 2).join('.');
  const isModern = parseFloat(majorMinor) >= 0.8;

  console.log(`Solidity Version Analysis:\n`);
  console.log(`  Version: ${version}`);
  console.log(`  Built-in overflow protection: ${isModern ? '✅ Yes (0.8.0+)' : '❌ No (< 0.8.0)'}`);
  
  if (!isModern) {
    console.log(`  🔴 CRITICAL: Using vulnerable Solidity version!`);
    const hasSafeMath = /SafeMath|using.*for\s+uint/.test(contractCode);
    console.log(`  SafeMath library: ${hasSafeMath ? '✅ Used' : '❌ Not used'}`);
    
    if (!hasSafeMath) {
      console.log(`  🔴 CRITICAL: No overflow protection at all!`);
    }
  }

  console.log('\nArithmetic Operations Analysis:\n');

  // Check 1: Addition operations
  const additions = (contractCode.match(/\w+\s*\+=|\w+\s*=\s*\w+\s*\+\s*\w+/g) || []).length;
  console.log(`  ${additions > 0 ? (isModern ? '🟡' : '🔴') : '✓'} Addition operations: ${additions}`);

  // Check 2: Subtraction operations
  const subtractions = (contractCode.match(/\w+\s*-=|\w+\s*=\s*\w+\s*-\s*\w+/g) || []).length;
  console.log(`  ${subtractions > 0 ? (isModern ? '🟡' : '🔴') : '✓'} Subtraction operations: ${subtractions}`);

  // Check 3: Multiplication operations
  const multiplications = (contractCode.match(/\w+\s*\*=|\w+\s*=\s*\w+\s*\*\s*\w+/g) || []).length;
  console.log(`  ${multiplications > 0 ? (isModern ? '🟡' : '🔴') : '✓'} Multiplication operations: ${multiplications}`);

  // Check 4: Division operations
  const divisions = (contractCode.match(/\w+\s*\/=|\w+\s*=\s*\w+\s*\/\s*\w+/g) || []).length;
  console.log(`  ${divisions > 0 ? '🟡' : '✓'} Division operations: ${divisions}`);

  // Check 5: Small integer types
  const smallInts = (contractCode.match(/uint8|uint16|uint32|int8|int16|int32/g) || []).length;
  console.log(`  ${smallInts > 0 ? '🟠' : '✓'} Small integer types used: ${smallInts}`);

  // Check 6: Type casting
  const typeCasts = (contractCode.match(/uint8\(|uint16\(|uint32\(/g) || []).length;
  console.log(`  ${typeCasts > 0 ? '🟠' : '✓'} Downcasting operations: ${typeCasts}`);

  // Check 7: Array length operations
  const arrayLengthOps = (contractCode.match(/\.length\s*[\*\+\-]/g) || []).length;
  console.log(`  ${arrayLengthOps > 0 ? '🔴' : '✓'} Array length arithmetic: ${arrayLengthOps}`);

  // Check 8: Timestamp arithmetic
  const timestampOps = (contractCode.match(/block\.timestamp\s*[\+\-]/g) || []).length;
  console.log(`  ${timestampOps > 0 ? '🟡' : '✓'} Timestamp arithmetic: ${timestampOps}`);

  console.log('\n⚠️  Vulnerability Patterns:\n');
  
  const issues = [];
  
  if (!isModern) {
    issues.push('  🔴 CRITICAL: Solidity < 0.8.0 without overflow protection');
    
    const hasSafeMath = /SafeMath/.test(contractCode);
    if (!hasSafeMath) {
      issues.push('  🔴 CRITICAL: No SafeMath library used');
    }
  }
  
  if (smallInts > 0) {
    issues.push('  🟠 HIGH: Small integer types prone to overflow');
  }
  
  if (typeCasts > 0) {
    issues.push('  🟠 HIGH: Downcasting without bounds checking');
  }
  
  if (arrayLengthOps > 0) {
    issues.push('  🔴 HIGH: Array length in arithmetic (overflow risk)');
  }

  if (issues.length > 0) {
    issues.forEach(i => console.log(i));
  } else {
    console.log('  ✓ Basic overflow protections appear adequate');
  }

  console.log('\n🛡️  Mitigation Strategies:\n');
  console.log('  1. ✅ Upgrade to Solidity 0.8.0+:');
  console.log('     pragma solidity ^0.8.0;');
  console.log('     - Automatic overflow/underflow checks');
  console.log('     - Reverts on arithmetic errors');
  console.log('     - No gas cost increase in most cases');
  console.log('');
  console.log('  2. ✅ Use SafeMath (for Solidity < 0.8.0):');
  console.log('     import "@openzeppelin/contracts/utils/math/SafeMath.sol";');
  console.log('     using SafeMath for uint256;');
  console.log('     balance = balance.add(amount);  // Safe addition');
  console.log('     balance = balance.sub(amount);  // Safe subtraction');
  console.log('');
  console.log('  3. ✅ Prefer uint256 over smaller types:');
  console.log('     - uint256 is the most gas-efficient');
  console.log('     - Larger range reduces overflow risk');
  console.log('     - Only use smaller types when necessary');
  console.log('');
  console.log('  4. ✅ Validate inputs before arithmetic:');
  console.log('     require(a <= type(uint256).max - b, "Overflow");');
  console.log('     uint256 result = a + b;');
  console.log('');
  console.log('  5. ✅ Check multiplication overflow:');
  console.log('     if (a != 0) {');
  console.log('         require(c / a == b, "Multiplication overflow");');
  console.log('     }');
  console.log('');
  console.log('  6. ✅ Use unchecked {} when safe (Solidity 0.8+):');
  console.log('     unchecked {');
  console.log('         // Arithmetic that provably cannot overflow');
  console.log('         counter++;  // Saves gas if overflow is impossible');
  console.log('     }');

  console.log('\n📝 Safe vs Unsafe Examples:\n');
  console.log('  ❌ UNSAFE (Solidity < 0.8.0):');
  console.log('     uint8 small = 255;');
  console.log('     small = small + 1;  // Overflows to 0!');
  console.log('');
  console.log('  ✅ SAFE (Solidity 0.8.0+):');
  console.log('     uint8 small = 255;');
  console.log('     small = small + 1;  // Reverts with error');
  console.log('');
  console.log('  ✅ SAFE (SafeMath):');
  console.log('     using SafeMath for uint256;');
  console.log('     balance = balance.add(amount);  // Reverts on overflow');

  console.log('\n📊 Overflow Attack Examples:\n');
  console.log('  • BatchOverflow (BeautyChain): $1B market cap lost');
  console.log('  • ProxyOverflow (multiple tokens affected)');
  console.log('  • PoWHC Ponzi: Underflow allowed token generation');

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
