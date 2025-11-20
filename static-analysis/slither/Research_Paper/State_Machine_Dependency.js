const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('\n=== Research Paper: State Machine Dependency - Slither Static Analysis ===\n');

const contractPath = path.join(__dirname, '../../../contracts/Research_Paper/State_Machine_Dependency/State_Machine_Dependency_Victim.sol');

console.log('📋 Running Slither analysis...\n');
console.log(`Contract: ${contractPath}\n`);

const slitherCommand = `slither ${contractPath} --detect incorrect-modifier,unprotected-upgrade --json -`;

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

  console.log('🎯 State Machine Dependency Analysis:\n');
  console.log('📖 Concept: Contracts with state machines where transitions depend');
  console.log('   on external state, creating vulnerability to state manipulation.\n');
  
  const contractCode = fs.readFileSync(contractPath, 'utf8');

  // Check for state machine patterns
  const hasEnum = /enum\s+\w+/g.test(contractCode);
  const stateVars = (contractCode.match(/\w+State|\w+Status|\w+Phase/g) || []).length;
  const modifiers = (contractCode.match(/modifier\s+\w+/g) || []).length;
  
  console.log('State Machine Pattern Analysis:\n');
  console.log(`  ${hasEnum ? '✓' : '❌'} Enum-based state machine: ${hasEnum ? 'Yes' : 'No'}`);
  console.log(`  State tracking variables: ${stateVars}`);
  console.log(`  Modifiers (possibly for state checks): ${modifiers}`);

  // Check for external dependencies
  const externalCalls = (contractCode.match(/\w+\.\w+\(/g) || []).length;
  const blockDependency = (contractCode.match(/block\.\w+/g) || []).length;
  
  console.log('\nExternal Dependencies:\n');
  console.log(`  External contract calls: ${externalCalls}`);
  console.log(`  Block state dependencies: ${blockDependency}`);
  
  if (externalCalls > 0 && (hasEnum || stateVars > 0)) {
    console.log(`  🔴 RISK: State machine depends on external calls!`);
    console.log(`     External state can be manipulated to bypass transitions`);
  }

  // Check for state transitions
  const requireStatements = (contractCode.match(/require\s*\([^)]*state[^)]*\)/gi) || []).length;
  console.log(`\nState Validation:\n`);
  console.log(`  State-checking require statements: ${requireStatements}`);

  console.log('\n⚠️  State Machine Dependency Vulnerabilities:\n');
  console.log('  Risks when state depends on:');
  console.log('  1. External contract state (can be manipulated)');
  console.log('  2. Block properties (timestamp, number, etc.)');
  console.log('  3. User-controlled input without validation');
  console.log('  4. Balances that can change unexpectedly\n');

  console.log('  Example Vulnerable Pattern:');
  console.log('    enum State { Initial, Active, Complete }');
  console.log('    State public state = State.Initial;');
  console.log('    ');
  console.log('    function activate() external {');
  console.log('        require(externalContract.isReady());  // ❌ External dependency');
  console.log('        state = State.Active;');
  console.log('    }\n');

  console.log('🛡️  Mitigation:\n');
  console.log('  1. ✅ Minimize external state dependencies');
  console.log('  2. ✅ Use internal state for critical transitions');
  console.log('  3. ✅ Validate external state with multiple sources');
  console.log('  4. ✅ Add time-locks for critical state changes');
  console.log('  5. ✅ Implement state transition guards:');
  console.log('     modifier inState(State _state) {');
  console.log('         require(state == _state, "Invalid state");');
  console.log('         _;');
  console.log('     }');
  console.log('  6. ✅ Make state transitions atomic and irreversible');

  console.log('\n📊 Secure State Machine Pattern:\n');
  console.log('  enum State { Created, Active, Paused, Finalized }');
  console.log('  State private currentState;');
  console.log('  ');
  console.log('  modifier inState(State _state) {');
  console.log('      require(currentState == _state, "Invalid state");');
  console.log('      _;');
  console.log('  }');
  console.log('  ');
  console.log('  function transition(State _newState) private {');
  console.log('      require(isValidTransition(currentState, _newState));');
  console.log('      currentState = _newState;');
  console.log('      emit StateTransition(currentState, _newState);');
  console.log('  }');

  console.log('\n═══════════════════════════════════════════════════════════\n');
  
  if (error && !stdout) {
    console.error('❌ Error running Slither. Install: pip3 install slither-analyzer\n');
    process.exit(1);
  }
  process.exit(0);
});

function getIcon(s) { return {critical:'🔴',high:'🟠',medium:'🟡',low:'🔵',informational:'ℹ️'}[s]||'⚪'; }
