const { exec } = require('child_process');
const path = require('path');

console.log('\n=== SC01: Access Control Vulnerabilities - Slither Static Analysis ===\n');

const contractPath = path.join(__dirname, '../../contracts/SC01_AccessControl/SC01_AccessControl_Victim.sol');

console.log('📋 Running Slither analysis on VulnerableWallet contract...\n');
console.log(`Contract: ${contractPath}\n`);

// Run Slither with specific detectors for access control issues
const slitherCommand = `slither ${contractPath} --detect unprotected-upgrade,suicidal,arbitrary-send-eth,controlled-delegatecall --json -`;

exec(slitherCommand, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
  
  // Parse Slither output
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
            description: issue.description,
            elements: issue.elements
          };

          if (analysis[severity]) {
            analysis[severity].push(finding);
          }
        });
      }

      console.log('🔍 Slither Analysis Results:\n');
      console.log('═══════════════════════════════════════════════════════════\n');

      // Display findings by severity
      const severities = ['critical', 'high', 'medium', 'low', 'informational'];
      let totalIssues = 0;

      severities.forEach(severity => {
        const issues = analysis[severity];
        if (issues.length > 0) {
          totalIssues += issues.length;
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
      // If JSON parsing fails, show raw output
      console.log('📊 Slither Raw Output:\n');
      console.log(stdout);
    }
  }

  if (stderr && !stderr.includes('Compilation warnings')) {
    console.log('⚠️  Slither Warnings/Errors:\n');
    console.log(stderr);
    console.log('');
  }

  // Additional custom checks for access control
  console.log('🎯 Access Control Specific Analysis:\n');
  console.log('Checking for common access control vulnerabilities:\n');
  
  const fs = require('fs');
  const contractCode = fs.readFileSync(contractPath, 'utf8');

  // Check 1: Functions without access modifiers
  const publicFunctions = contractCode.match(/function\s+\w+\s*\([^)]*\)\s+public(?!\s+view|\s+pure)/g) || [];
  console.log(`  ✓ Public state-changing functions: ${publicFunctions.length}`);
  
  // Check 2: Missing onlyOwner modifiers
  const ownerPattern = /function\s+(\w+)\s*\([^)]*\)\s+public\s*{[^}]*owner[^}]*}/gs;
  const ownerFunctions = contractCode.match(ownerPattern) || [];
  console.log(`  ✓ Functions modifying owner without modifier: ${ownerFunctions.length}`);
  
  // Check 3: Unprotected selfdestruct
  const selfdestructPattern = /selfdestruct\s*\(/g;
  const selfdestructs = contractCode.match(selfdestructPattern) || [];
  console.log(`  ✓ Selfdestruct calls: ${selfdestructs.length}`);
  
  // Check 4: Unprotected ETH transfers
  const ethTransferPattern = /\.call\{value:/g;
  const ethTransfers = contractCode.match(ethTransferPattern) || [];
  console.log(`  ✓ ETH transfer operations: ${ethTransfers.length}`);

  console.log('\n🛡️  Recommendations:\n');
  console.log('  1. Add onlyOwner modifier to administrative functions');
  console.log('  2. Use OpenZeppelin Ownable or AccessControl');
  console.log('  3. Implement multi-sig for critical operations');
  console.log('  4. Add event emissions for state changes');
  console.log('  5. Consider timelock for sensitive functions');

  console.log('\n═══════════════════════════════════════════════════════════\n');
  
  if (error && !stdout) {
    console.error('❌ Error running Slither. Make sure Slither is installed:');
    console.error('   pip3 install slither-analyzer');
    console.error('   or');
    console.error('   pip install slither-analyzer\n');
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
