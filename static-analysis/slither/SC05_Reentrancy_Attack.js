const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('\n=== SC05: Reentrancy Attack - Slither Static Analysis ===\n');

const contractPath = path.join(__dirname, '../../contracts/SC05_Reentrancy_Attack/SC05_Reentrancy_Victim.sol');

console.log('📋 Running Slither analysis on VulnerableBank contract...\n');
console.log(`Contract: ${contractPath}\n`);

// Run Slither with reentrancy-specific detectors
const slitherCommand = `slither ${contractPath} --detect reentrancy-eth,reentrancy-no-eth,reentrancy-benign,reentrancy-events --json -`;

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
      let totalReentrancy = 0;

      severities.forEach(severity => {
        const issues = analysis[severity];
        if (issues.length > 0) {
          const reentrancyIssues = issues.filter(i => i.check.includes('reentrancy'));
          totalReentrancy += reentrancyIssues.length;
          
          if (reentrancyIssues.length > 0) {
            console.log(`${getIcon(severity)} ${severity.toUpperCase()} Reentrancy Issues: ${reentrancyIssues.length}\n`);
            
            reentrancyIssues.forEach((issue, idx) => {
              console.log(`  ${idx + 1}. [${issue.check}] - Confidence: ${issue.confidence}`);
              console.log(`     ${issue.description}`);
              console.log('');
            });
          }
        }
      });

      if (totalReentrancy > 0) {
        console.log(`🔴 CRITICAL: ${totalReentrancy} reentrancy vulnerabilities detected!\n`);
      }

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

  // Custom reentrancy analysis
  console.log('🎯 Reentrancy Specific Analysis:\n');
  
  const contractCode = fs.readFileSync(contractPath, 'utf8');

  // Check 1: External calls
  const externalCalls = [
    { pattern: /\.call\{value:/g, name: 'Low-level call with value', severity: '🔴' },
    { pattern: /\.transfer\(/g, name: 'Transfer calls', severity: '🟢' },
    { pattern: /\.send\(/g, name: 'Send calls', severity: '🟡' }
  ];

  console.log('External Call Analysis:\n');
  externalCalls.forEach(check => {
    const matches = (contractCode.match(check.pattern) || []).length;
    if (matches > 0) {
      console.log(`  ${check.severity} ${check.name}: ${matches}`);
    }
  });

  // Check 2: State changes after external calls (CEI violation)
  const functions = contractCode.split(/(?=function\s+\w+)/);
  let ceiViolations = 0;

  functions.forEach(func => {
    const hasCall = /\.call\{value:/.test(func);
    if (hasCall) {
      const callIndex = func.indexOf('.call{value:');
      const afterCall = func.substring(callIndex);
      const hasStateChange = /\w+\s*=|\w+\s*\+=|\w+\s*-=|\w+\[/.test(afterCall.substring(afterCall.indexOf(';') + 1));
      if (hasStateChange) {
        ceiViolations++;
      }
    }
  });

  console.log(`\n  ${ceiViolations > 0 ? '🔴' : '✓'} CEI Pattern Violations: ${ceiViolations}`);
  console.log(`      (State changes after external calls)\n`);

  // Check 3: Reentrancy guards
  const hasReentrancyGuard = /nonReentrant|ReentrancyGuard|mutex|locked/.test(contractCode);
  console.log(`  ${hasReentrancyGuard ? '✓' : '🔴'} Reentrancy Guard: ${hasReentrancyGuard ? 'Present' : 'Missing'}`);

  // Check 4: State variables modified after calls
  const stateVarPattern = /balances\[|balance\s*=|total\s*=/g;
  const stateModifications = (contractCode.match(stateVarPattern) || []).length;
  console.log(`  ℹ️  State variable modifications: ${stateModifications}`);

  console.log('\n⚠️  Reentrancy Vulnerability Patterns:\n');
  
  if (!hasReentrancyGuard) {
    console.log('  🔴 CRITICAL: No reentrancy guard detected');
  }
  
  if (ceiViolations > 0) {
    console.log('  🔴 CRITICAL: Checks-Effects-Interactions pattern violated');
    console.log('     State changes occur AFTER external calls');
  }

  const callWithValue = (contractCode.match(/\.call\{value:/g) || []).length;
  if (callWithValue > 0) {
    console.log(`  🔴 HIGH: ${callWithValue} low-level call(s) with value transfer`);
    console.log('     These are prone to reentrancy attacks');
  }

  console.log('\n🛡️  Mitigation Strategies:\n');
  console.log('  1. ✅ Use ReentrancyGuard from OpenZeppelin');
  console.log('     import "@openzeppelin/contracts/security/ReentrancyGuard.sol";');
  console.log('');
  console.log('  2. ✅ Follow Checks-Effects-Interactions (CEI) Pattern:');
  console.log('     a) Checks: Validate conditions (require statements)');
  console.log('     b) Effects: Update state variables');
  console.log('     c) Interactions: Make external calls LAST');
  console.log('');
  console.log('  3. ✅ Use transfer() or send() instead of call():');
  console.log('     - transfer() and send() only forward 2300 gas');
  console.log('     - Prevents complex reentrancy attacks');
  console.log('');
  console.log('  4. ✅ Implement mutex locks:');
  console.log('     - Use boolean flag to prevent reentrant calls');
  console.log('     - Set flag before external call, reset after');

  console.log('\n📝 Secure Pattern Example:\n');
  console.log('  function withdraw(uint amount) external nonReentrant {');
  console.log('      require(balances[msg.sender] >= amount);  // Check');
  console.log('      balances[msg.sender] -= amount;           // Effect');
  console.log('      (bool success, ) = msg.sender.call{value: amount}("");  // Interaction');
  console.log('      require(success);');
  console.log('  }');

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
