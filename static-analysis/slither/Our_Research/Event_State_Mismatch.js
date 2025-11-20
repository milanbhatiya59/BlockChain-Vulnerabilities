const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('\n=== Our Research: Event-State Mismatch - Slither Static Analysis ===\n');

const contractPath = path.join(__dirname, '../../../contracts/Our_Research/Event_State_Mismatch/Event_State_Mismatch_Victim.sol');

console.log('📋 Running Slither analysis on EventStateMismatchVictim contract...\n');
console.log(`Contract: ${contractPath}\n`);

// Run Slither with event-related detectors
const slitherCommand = `slither ${contractPath} --detect events-maths,events-access,missing-events-arithmetic,missing-events-access --json -`;

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

  // Custom event-state mismatch analysis
  console.log('🎯 Event-State Mismatch Analysis:\n');
  console.log('📖 Concept: Events that report different values than actual state changes,');
  console.log('   leading to off-chain systems having incorrect information.\n');
  
  const contractCode = fs.readFileSync(contractPath, 'utf8');

  // Check 1: Identify events
  const events = contractCode.match(/event\s+\w+\s*\([^)]*\)/g) || [];
  console.log(`Event Analysis:`);
  console.log(`  Total events declared: ${events.length}`);
  if (events.length > 0) {
    console.log(`  Events found:`);
    events.forEach(e => {
      const eventName = e.match(/event\s+(\w+)/)[1];
      console.log(`    - ${eventName}`);
    });
  }

  // Check 2: Event emissions
  const emissions = contractCode.match(/emit\s+\w+\s*\([^)]*\)/g) || [];
  console.log(`\n  Event emissions: ${emissions.length}`);

  // Check 3: State changes before/after events
  const functions = contractCode.split(/(?=function\s+\w+)/);
  let mismatchRisks = 0;
  let stateChangesWithoutEvents = 0;

  console.log('\nFunction-by-Function Analysis:\n');

  functions.forEach(func => {
    const funcMatch = func.match(/function\s+(\w+)/);
    if (!funcMatch) return;
    
    const funcName = funcMatch[1];
    const hasStateChange = /\w+\s*=|\w+\[|\w+\s*\+=|\w+\s*-=/.test(func);
    const hasEmit = /emit\s+\w+/.test(func);
    const hasCalculation = /\*|\/|\+\s*\w+|\-\s*\w+/.test(func);
    
    if (hasStateChange && !hasEmit) {
      stateChangesWithoutEvents++;
      console.log(`  ⚠️  ${funcName}: State change without event`);
    } else if (hasStateChange && hasEmit && hasCalculation) {
      // Check if emit is after state change
      const emitIndex = func.indexOf('emit');
      const lastAssignment = func.lastIndexOf('=');
      
      if (emitIndex > 0 && lastAssignment > 0 && emitIndex < lastAssignment) {
        mismatchRisks++;
        console.log(`  🔴 ${funcName}: Event emitted BEFORE final state change!`);
      }
    }
  });

  if (stateChangesWithoutEvents === 0 && mismatchRisks === 0) {
    console.log('  ✓ No obvious mismatch patterns detected');
  }

  // Check 4: Event parameter patterns
  console.log('\nEvent Parameter Analysis:\n');
  
  const eventWithCalc = /emit\s+\w+\s*\([^)]*[\+\-\*\/][^)]*\)/g;
  const inlineCalcEvents = (contractCode.match(eventWithCalc) || []).length;
  console.log(`  ${inlineCalcEvents > 0 ? '🟠' : '✓'} Events with inline calculations: ${inlineCalcEvents}`);
  if (inlineCalcEvents > 0) {
    console.log(`     Risk: Calculation may differ from actual state change`);
  }

  // Check 5: Balance-related events
  const balanceEvents = /emit\s+\w*Transfer\w*|emit\s+\w*Deposit\w*|emit\s+\w*Withdraw\w*/gi;
  const hasBalanceEvents = balanceEvents.test(contractCode);
  console.log(`  ${hasBalanceEvents ? '✓' : '🟡'} Balance-related events: ${hasBalanceEvents ? 'Present' : 'None'}`);

  console.log('\n⚠️  Event-State Mismatch Vulnerability Pattern:\n');
  console.log('  The vulnerability occurs when:');
  console.log('  1. Events are emitted to inform external systems');
  console.log('  2. Event parameters calculated BEFORE actual state change');
  console.log('  3. State change calculation differs from event calculation');
  console.log('  4. External systems receive incorrect information');
  console.log('  5. UI, indexers, monitoring systems show wrong data\n');

  console.log('  Example Vulnerable Pattern:');
  console.log('    function transfer(address to, uint amount) {');
  console.log('        uint fee = calculateFee(amount);         // Calculate fee');
  console.log('        emit Transfer(msg.sender, to, amount);   // Event shows full amount ❌');
  console.log('        balances[msg.sender] -= amount;');
  console.log('        balances[to] += (amount - fee);          // Actual: amount minus fee');
  console.log('        // Event says "amount" but actual is "amount - fee"!');
  console.log('    }\n');

  console.log('  Correct Pattern:');
  console.log('    function transfer(address to, uint amount) {');
  console.log('        uint fee = calculateFee(amount);');
  console.log('        uint actualAmount = amount - fee;');
  console.log('        balances[msg.sender] -= amount;');
  console.log('        balances[to] += actualAmount;');
  console.log('        emit Transfer(msg.sender, to, actualAmount); // Matches actual ✅');
  console.log('    }\n');

  console.log('🛡️  Mitigation Strategies:\n');
  console.log('  1. ✅ Emit Events AFTER State Changes:');
  console.log('     function updateBalance(uint newAmount) {');
  console.log('         uint oldAmount = balance;');
  console.log('         balance = newAmount;              // Update state first');
  console.log('         emit BalanceUpdated(oldAmount, newAmount); // Then emit');
  console.log('     }\n');

  console.log('  2. ✅ Use Actual State Values in Events:');
  console.log('     // BAD ❌');
  console.log('     uint calculated = getAmount();');
  console.log('     balance += calculated;');
  console.log('     emit Updated(calculated);  // May differ from actual');
  console.log('     ');
  console.log('     // GOOD ✅');
  console.log('     uint oldBalance = balance;');
  console.log('     balance += calculated;');
  console.log('     emit Updated(balance - oldBalance);  // Actual change\n');

  console.log('  3. ✅ Include Before/After Values:');
  console.log('     event StateChanged(');
  console.log('         address indexed user,');
  console.log('         uint256 oldValue,');
  console.log('         uint256 newValue,');
  console.log('         uint256 actualDelta');
  console.log('     );\n');

  console.log('  4. ✅ Separate Fee Events:');
  console.log('     emit Transfer(sender, recipient, amountWithoutFee);');
  console.log('     emit FeeCollected(sender, feeAmount);\n');

  console.log('  5. ✅ Add Validation Functions:');
  console.log('     function verifyEventIntegrity() external view returns (bool) {');
  console.log('         // Check that emitted events match on-chain state');
  console.log('         // Used by monitoring systems');
  console.log('     }\n');

  console.log('  6. ✅ Use Indexed Parameters Carefully:');
  console.log('     - Indexed parameters help filtering');
  console.log('     - Ensure indexed values are accurate');
  console.log('     - Maximum 3 indexed parameters per event\n');

  console.log('📊 Impact of Event-State Mismatch:\n');
  console.log('  • Off-chain systems display incorrect data');
  console.log('  • User interfaces show wrong balances');
  console.log('  • Analytics and monitoring provide false metrics');
  console.log('  • Audit trails become unreliable');
  console.log('  • Indexers (The Graph, etc.) index wrong data');
  console.log('  • Trading bots make decisions on false info');
  console.log('  • Regulatory compliance issues');

  console.log('\n🔬 Detection Strategy:\n');
  console.log('  Static Analysis:');
  console.log('    ✓ Verify emit statements come after state changes');
  console.log('    ✓ Check event parameters match actual state changes');
  console.log('    ✓ Flag inline calculations in event parameters');
  console.log('    ✓ Ensure critical state changes have events');
  console.log('  ');
  console.log('  Dynamic Analysis:');
  console.log('    ✓ Compare emitted event values with actual state');
  console.log('    ✓ Track state before/after each function');
  console.log('    ✓ Verify event logs match state transitions');

  console.log('\n💡 Best Practices:\n');
  console.log('  ✓ Always emit events AFTER state changes');
  console.log('  ✓ Use actual state values, not calculated estimates');
  console.log('  ✓ Include comprehensive information in events');
  console.log('  ✓ Document event semantics clearly');
  console.log('  ✓ Test event emissions in unit tests');
  console.log('  ✓ Monitor event-state consistency in production');

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
