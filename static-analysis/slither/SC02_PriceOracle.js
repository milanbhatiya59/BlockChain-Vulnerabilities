const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('\n=== SC02: Price Oracle Manipulation - Slither Static Analysis ===\n');

const contractPath = path.join(__dirname, '../../contracts/SC02_PriceOracle/SC02_PriceOracle_Victim.sol');

console.log('📋 Running Slither analysis on VulnerableDEX contract...\n');
console.log(`Contract: ${contractPath}\n`);

// Run Slither with detectors relevant to price oracle issues
const slitherCommand = `slither ${contractPath} --detect weak-prng,timestamp,block-timestamp --json -`;

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
      console.log('📊 Slither Raw Output:\n');
      console.log(stdout);
    }
  }

  if (stderr && !stderr.includes('Compilation warnings')) {
    console.log('⚠️  Slither Warnings/Errors:\n');
    console.log(stderr);
    console.log('');
  }

  // Custom analysis for price oracle vulnerabilities
  console.log('🎯 Price Oracle Specific Analysis:\n');
  
  const contractCode = fs.readFileSync(contractPath, 'utf8');

  // Check 1: Single price source
  const priceSourcePattern = /getPrice\s*\([^)]*\)/g;
  const priceSources = contractCode.match(priceSourcePattern) || [];
  console.log(`  ✓ Price fetching functions: ${priceSources.length}`);
  
  // Check 2: No price validation
  const requirePattern = /require\s*\([^)]*price[^)]*>/g;
  const priceValidations = contractCode.match(requirePattern) || [];
  console.log(`  ✓ Price validation checks: ${priceValidations.length}`);
  
  // Check 3: Time-based price updates
  const timestampPattern = /block\.timestamp|block\.number/g;
  const timestampUsage = contractCode.match(timestampPattern) || [];
  console.log(`  ✓ Timestamp/block number usage: ${timestampUsage.length}`);
  
  // Check 4: No TWAP implementation
  const twapPattern = /TWAP|timeWeighted|averagePrice/i;
  const hasTWAP = twapPattern.test(contractCode);
  console.log(`  ✓ TWAP implementation: ${hasTWAP ? 'Yes' : 'No'}`);
  
  // Check 5: External oracle calls
  const oraclePattern = /Chainlink|UniswapV2|UniswapV3|AggregatorV3/;
  const hasOracle = oraclePattern.test(contractCode);
  console.log(`  ✓ External oracle integration: ${hasOracle ? 'Yes' : 'No'}`);

  console.log('\n⚠️  Vulnerabilities Detected:\n');
  
  if (priceSources.length === 1 && !hasOracle) {
    console.log('  🔴 Single price source - vulnerable to manipulation');
  }
  
  if (priceValidations.length === 0) {
    console.log('  🔴 Missing price validation - no bounds checking');
  }
  
  if (!hasTWAP) {
    console.log('  🟠 No TWAP - vulnerable to flash loan attacks');
  }

  console.log('\n🛡️  Recommendations:\n');
  console.log('  1. Use Chainlink or other decentralized oracles');
  console.log('  2. Implement TWAP for DEX-based prices');
  console.log('  3. Add multiple price sources and median calculation');
  console.log('  4. Validate price bounds (min/max thresholds)');
  console.log('  5. Add circuit breakers for abnormal price movements');
  console.log('  6. Use historical price data for validation');

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
