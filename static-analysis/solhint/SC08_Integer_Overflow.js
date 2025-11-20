const fs = require('fs');
const path = require('path');

console.log('\n=== SC08: Integer Overflow and Underflow - Static Analysis ===\n');

// Paths to contract files
const contractsDir = path.join(
  __dirname,
  "../../contracts/SC08_Integer_Overflow"
);
const victimFile = path.join(contractsDir, 'SC08_Integer_Overflow_Victim.sol');
const attackerFile = path.join(contractsDir, 'SC08_Integer_Overflow_Attacker.sol');

// Read contract files
const victimCode = fs.readFileSync(victimFile, 'utf8');
const attackerCode = fs.readFileSync(attackerFile, 'utf8');

let issueCount = 0;

console.log('📋 Analyzing Victim Contract: SC08_Integer_Overflow_Victim.sol\n');

// Analysis patterns for integer overflow/underflow vulnerabilities
const vulnerabilityPatterns = [
    {
        name: 'Unchecked Addition',
        pattern: /(\w+)\s*\+=\s*(\w+)/g,
        severity: 'HIGH',
        description: 'Addition operation without overflow check',
        recommendation: 'Use SafeMath library or Solidity 0.8.0+ with built-in checks'
    },
    {
        name: 'Unchecked Subtraction',
        pattern: /(\w+)\s*-=\s*(\w+)/g,
        severity: 'HIGH',
        description: 'Subtraction operation without underflow check',
        recommendation: 'Use SafeMath library or Solidity 0.8.0+ with built-in checks'
    },
    {
        name: 'Unchecked Multiplication',
        pattern: /(\w+)\s*=\s*(\w+)\s*\*\s*(\w+)/g,
        severity: 'HIGH',
        description: 'Multiplication operation without overflow check',
        recommendation: 'Use SafeMath.mul() or check for overflow manually'
    },
    {
        name: 'Array Length Multiplication',
        pattern: /\.length\s*\*\s*\w+/g,
        severity: 'HIGH',
        description: 'Multiplication with array length can overflow',
        recommendation: 'Check for overflow before multiplication'
    },
    {
        name: 'Timestamp Arithmetic',
        pattern: /block\.timestamp\s*\+\s*\w+/g,
        severity: 'MEDIUM',
        description: 'Timestamp addition can overflow with large values',
        recommendation: 'Validate input duration to prevent overflow'
    },
    {
        name: 'Small Integer Type',
        pattern: /uint8|uint16|uint32/g,
        severity: 'MEDIUM',
        description: 'Small integer types are more prone to overflow',
        recommendation: 'Use uint256 when possible or add overflow checks'
    },
    {
        name: 'Increment Without Check',
        pattern: /(\w+)\+\+/g,
        severity: 'MEDIUM',
        description: 'Increment operation without overflow check',
        recommendation: 'Check if value is at maximum before incrementing'
    },
    {
        name: 'Decrement Without Check',
        pattern: /(\w+)--/g,
        severity: 'MEDIUM',
        description: 'Decrement operation without underflow check',
        recommendation: 'Check if value is at minimum before decrementing'
    }
];

// Analyze victim contract
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
        matchArray.slice(0, 3).forEach((match, idx) => {
            console.log(`   Example ${idx + 1}: ${match[0]}`);
        });
        console.log('');
    }
});

// Check Solidity version
const versionMatch = victimCode.match(/pragma solidity \^?([\d.]+);/);
if (versionMatch) {
    const version = versionMatch[1];
    const majorMinor = version.split('.').slice(0, 2).join('.');
    
    if (parseFloat(majorMinor) < 0.8) {
        issueCount++;
        console.log(`⚠️  [CRITICAL] Outdated Solidity Version`);
        console.log(`   Current version: ${version}`);
        console.log(`   Description: Solidity versions before 0.8.0 do not have built-in overflow/underflow checks`);
        console.log(`   Recommendation: Upgrade to Solidity ^0.8.0 or use SafeMath library`);
        console.log('');
    }
}

// Check for SafeMath usage
if (!victimCode.includes('SafeMath') && !victimCode.includes('safeAdd') && parseFloat(versionMatch[1].split('.')[1]) < 8) {
    issueCount++;
    console.log(`❌ [HIGH] Missing SafeMath Library`);
    console.log(`   Description: Contract uses pre-0.8.0 Solidity without SafeMath protection`);
    console.log(`   Recommendation: Import and use OpenZeppelin's SafeMath library for all arithmetic`);
    console.log('');
}

// Check for require statements on arithmetic
const requireStatements = (victimCode.match(/require\s*\([^)]*[+\-*\/][^)]*\)/g) || []).length;
console.log(`ℹ️  Arithmetic Safety Checks: ${requireStatements} require statements with arithmetic`);
console.log('');

// Detect vulnerable functions
const vulnerableFunctions = [
    'vulnerableDeposit',
    'vulnerableWithdraw',
    'vulnerableMultiply',
    'vulnerableBatchTransfer',
    'vulnerableIncrementSmall',
    'vulnerableBuyTokens'
];

console.log('🎯 Vulnerable Functions Detected:');
vulnerableFunctions.forEach(funcName => {
    if (victimCode.includes(`function ${funcName}`)) {
        const funcMatch = victimCode.match(new RegExp(`function ${funcName}[^}]*}`, 's'));
        if (funcMatch) {
            const funcBody = funcMatch[0];
            const hasOverflowChecks = funcBody.includes('require') && (funcBody.includes('>=') || funcBody.includes('<='));
            
            console.log(`   - ${funcName}: ${hasOverflowChecks ? '⚠️  Has some checks' : '❌ No overflow protection'}`);
        }
    }
});
console.log('');

// Analyze attacker contract
console.log('📋 Analyzing Attacker Contract: SC08_Integer_Overflow_Attacker.sol\n');

const attackMethods = [
    'attackOverflowDeposit',
    'attackUnderflowWithdraw',
    'attackBatchTransferOverflow',
    'attackMultiplicationOverflow',
    'attackSmallTypeOverflow',
    'attackTokenSaleOverflow',
    'attackTimeLockOverflow'
];

console.log('🎯 Attack Methods Detected:');
attackMethods.forEach(method => {
    if (attackerCode.includes(`function ${method}`)) {
        console.log(`   ✓ ${method}`);
    }
});
console.log('');

// Check for exploit patterns
const exploitPatterns = [
    {
        name: 'Max Value Usage',
        pattern: /type\(uint256\)\.max|2\*\*256|maxUint/g,
        description: 'Uses maximum uint256 value to cause overflow'
    },
    {
        name: 'Large Value Multiplication',
        pattern: /2\*\*255|2\*\*128/g,
        description: 'Uses large values that will overflow when multiplied'
    },
    {
        name: 'Negative Amount Simulation',
        pattern: /balance\s*\+\s*1|withdraw.*\+\s*1/g,
        description: 'Attempts to withdraw more than balance to cause underflow'
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
        title: 'Upgrade to Solidity 0.8.0+',
        description: 'Solidity 0.8.0 and later versions have built-in overflow/underflow checks that automatically revert on arithmetic errors.'
    },
    {
        priority: 'HIGH',
        title: 'Use SafeMath Library',
        description: 'For pre-0.8.0 contracts, use OpenZeppelin SafeMath library for all arithmetic operations.'
    },
    {
        priority: 'HIGH',
        title: 'Validate Input Values',
        description: 'Always validate input values to ensure they won\'t cause overflow/underflow when used in calculations.'
    },
    {
        priority: 'MEDIUM',
        title: 'Use uint256 Over Smaller Types',
        description: 'Prefer uint256 over smaller integer types (uint8, uint16, etc.) to reduce overflow risk.'
    },
    {
        priority: 'MEDIUM',
        title: 'Validate Timestamp Calculations',
        description: 'When adding durations to block.timestamp, validate that the duration is reasonable (e.g., < 100 years).'
    },
    {
        priority: 'MEDIUM',
        title: 'Check Multiplication Results',
        description: 'For multiplication operations, verify: if (a != 0) require(c / a == b)'
    }
];

recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. [${rec.priority}] ${rec.title}`);
    console.log(`   ${rec.description}`);
    console.log('');
});

// Code examples
console.log('📝 Secure Code Examples:\n');

console.log('// ❌ VULNERABLE (Solidity 0.7.x):');
console.log('function deposit(uint256 amount) external {');
console.log('    balances[msg.sender] += amount;  // Can overflow!');
console.log('}');
console.log('');

console.log('// ✅ SAFE (Using SafeMath):');
console.log('using SafeMath for uint256;');
console.log('function deposit(uint256 amount) external {');
console.log('    balances[msg.sender] = balances[msg.sender].add(amount);');
console.log('}');
console.log('');

console.log('// ✅ SAFE (Solidity 0.8.0+):');
console.log('function deposit(uint256 amount) external {');
console.log('    balances[msg.sender] += amount;  // Automatically checked!');
console.log('}');
console.log('');

console.log('// ❌ VULNERABLE (Multiplication overflow):');
console.log('uint256 total = count * price;  // Can overflow!');
console.log('');

console.log('// ✅ SAFE (With overflow check):');
console.log('uint256 total = count * price;');
console.log('if (count != 0) require(total / count == price, "Overflow");');
console.log('');

// Summary
console.log('═══════════════════════════════════════════════════════════\n');
console.log(`📊 Analysis Summary:`);
console.log(`   Total Issues Found: ${issueCount}`);
console.log(`   Vulnerable Functions: ${vulnerableFunctions.length}`);
console.log(`   Attack Methods: ${attackMethods.filter(m => attackerCode.includes(m)).length}`);
console.log('');

if (issueCount > 0) {
    console.log('⚠️  WARNING: Contract contains integer overflow/underflow vulnerabilities!');
    console.log('   This contract is intentionally vulnerable for educational purposes.');
    console.log('   Never deploy contracts with these vulnerabilities in production!');
} else {
    console.log('✅ No obvious integer overflow/underflow vulnerabilities detected.');
}

console.log('\n═══════════════════════════════════════════════════════════\n');

process.exit(0);
