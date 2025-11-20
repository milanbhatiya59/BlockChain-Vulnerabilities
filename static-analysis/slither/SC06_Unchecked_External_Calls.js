const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('\n=== SC06: Unchecked External Calls - Slither Static Analysis ===\n');

const contractPath = path.join(__dirname, '../../contracts/SC06_Unchecked_External_Calls/SC06_Unchecked_External_Calls_Victim.sol');

console.log('📋 Running Slither analysis on UncheckedCallsVictim contract...\n');
console.log(`Contract: ${contractPath}\n`);

// Run Slither with detectors for unchecked calls
const slitherCommand = `slither ${contractPath} --detect unchecked-lowlevel,unchecked-send,low-level-calls --json -`;

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

  // Custom analysis for unchecked external calls
  console.log('🎯 Unchecked External Calls Analysis:\n');
  
  const contractCode = fs.readFileSync(contractPath, 'utf8');

  // Check 1: call() without checking return value
  const uncheckedCall = /\.call\{[^}]*\}[^;]*;(?!\s*require)/g;
  const uncheckedCallMatches = (contractCode.match(uncheckedCall) || []).length;
  console.log(`  ${uncheckedCallMatches > 0 ? '🔴' : '✓'} Unchecked call(): ${uncheckedCallMatches}`);

  // Check 2: send() without checking return value
  const uncheckedSend = /\.send\([^)]*\)(?!\s*;?\s*require)/g;
  const uncheckedSendMatches = (contractCode.match(uncheckedSend) || []).length;
  console.log(`  ${uncheckedSendMatches > 0 ? '🟠' : '✓'} Unchecked send(): ${uncheckedSendMatches}`);

  // Check 3: delegatecall() without checking return value
  const uncheckedDelegatecall = /\.delegatecall\([^)]*\)(?!\s*;?\s*require)/g;
  const uncheckedDelegatecallMatches = (contractCode.match(uncheckedDelegatecall) || []).length;
  console.log(`  ${uncheckedDelegatecallMatches > 0 ? '🔴' : '✓'} Unchecked delegatecall(): ${uncheckedDelegatecallMatches}`);

  // Check 4: staticcall() without checking return value
  const uncheckedStaticcall = /\.staticcall\([^)]*\)(?!\s*;?\s*require)/g;
  const uncheckedStaticcallMatches = (contractCode.match(uncheckedStaticcall) || []).length;
  console.log(`  ${uncheckedStaticcallMatches > 0 ? '🟡' : '✓'} Unchecked staticcall(): ${uncheckedStaticcallMatches}`);

  // Check 5: External contract calls
  const externalCallPattern = /\w+\.\w+\(/g;
  const externalCalls = (contractCode.match(externalCallPattern) || []).length;
  console.log(`  ℹ️  Total external calls: ${externalCalls}`);

  // Check 6: Checked calls (good pattern)
  const checkedCallPattern = /\(bool\s+\w+,\s*\)\s*=.*\.call/g;
  const checkedCalls = (contractCode.match(checkedCallPattern) || []).length;
  console.log(`  ✓ Properly checked calls: ${checkedCalls}`);

  console.log('\n⚠️  Vulnerability Summary:\n');
  
  const totalUnchecked = uncheckedCallMatches + uncheckedSendMatches + 
                         uncheckedDelegatecallMatches + uncheckedStaticcallMatches;
  
  if (totalUnchecked > 0) {
    console.log(`  🔴 CRITICAL: ${totalUnchecked} unchecked external call(s) detected!`);
    console.log('     Failed external calls will silently continue execution');
    console.log('     This can lead to unexpected contract state and fund loss\n');
  } else {
    console.log('  ✓ No unchecked external calls detected\n');
  }

  console.log('🛡️  Mitigation Strategies:\n');
  console.log('  1. ✅ Always check return values of external calls:\n');
  console.log('     // BAD ❌');
  console.log('     target.call{value: amount}("");');
  console.log('');
  console.log('     // GOOD ✅');
  console.log('     (bool success, ) = target.call{value: amount}("");');
  console.log('     require(success, "Call failed");');
  console.log('');
  console.log('  2. ✅ Use transfer() for simple ETH transfers:');
  console.log('     - Automatically reverts on failure');
  console.log('     - Limited to 2300 gas');
  console.log('     payable(recipient).transfer(amount);');
  console.log('');
  console.log('  3. ✅ Handle both success and failure cases:');
  console.log('     if (success) {');
  console.log('         // Handle success');
  console.log('     } else {');
  console.log('         // Handle failure (refund, emit event, etc.)');
  console.log('     }');
  console.log('');
  console.log('  4. ✅ Be cautious with delegatecall():');
  console.log('     - Executes in caller\'s context');
  console.log('     - Can modify caller\'s storage');
  console.log('     - Always validate target address');
  console.log('     - Always check return value');

  console.log('\n📊 Risk Assessment:\n');
  console.log('  Call Type       | Risk Level | Reason');
  console.log('  ----------------|------------|--------------------------------');
  console.log('  delegatecall    | 🔴 CRITICAL | Executes in caller context');
  console.log('  call{value:}    | 🔴 HIGH     | Transfers funds');
  console.log('  send()          | 🟠 MEDIUM   | Silent failure possible');
  console.log('  staticcall      | 🟡 LOW      | Read-only, but can fail');
  console.log('  transfer()      | 🟢 SAFE     | Auto-reverts on failure');

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
