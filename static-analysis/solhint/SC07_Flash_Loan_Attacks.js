const fs = require("fs");
const { exec } = require("child_process");

// Path to the vulnerable contract
const contractPath = "contracts/SC07_Flash_Loan_Attacks/SC07_Flash_Loan_Attacks_Victim.sol";

// Solhint command
const command = `npx solhint ${contractPath}`;

exec(command, (error, stdout, stderr) => {
  if (error && !stdout) {
    console.error(`Error executing command: ${error.message}`);
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
    }
    return;
  }

  console.log("=".repeat(70));
  console.log("SC07: Static Analysis - Flash Loan Attack Vulnerabilities");
  console.log("=".repeat(70));
  console.log(`\nAnalyzing: ${contractPath}\n`);

  // Read the contract source code for manual pattern analysis
  try {
    const sourceCode = fs.readFileSync(contractPath, "utf8");
    
    const vulnerabilities = [];

    // Check for flash loan vulnerabilities

    // 1. Single-transaction state changes (governance)
    if (sourceCode.includes("votingPower") && sourceCode.includes("vote")) {
      const hasTimelock = sourceCode.includes("timelock") || sourceCode.includes("delay");
      const hasSnapshot = sourceCode.includes("snapshot") || sourceCode.includes("blockNumber");
      
      if (!hasTimelock && !hasSnapshot) {
        vulnerabilities.push({
          type: "Governance Flash Loan Vulnerability",
          description: "Voting power can be acquired and used in the same transaction without timelock or snapshot"
        });
      }
    }

    // 2. Instant price calculation without TWAP
    if (sourceCode.includes("getPrice") || sourceCode.includes("price")) {
      const hasTWAP = sourceCode.includes("TWAP") || sourceCode.includes("timeWeighted") || 
                      sourceCode.includes("oracle") && sourceCode.includes("Chainlink");
      const usesReserves = sourceCode.includes("Reserve") && sourceCode.includes("/");
      
      if (!hasTWAP && usesReserves) {
        vulnerabilities.push({
          type: "Price Oracle Manipulation",
          description: "Price calculated from instant reserves without time-weighted average (TWAP)"
        });
      }
    }

    // 3. Balance-based logic without protection
    if (sourceCode.includes("balanceOf") || sourceCode.includes("balance")) {
      const hasReentrancyGuard = sourceCode.includes("ReentrancyGuard") || 
                                  sourceCode.includes("nonReentrant");
      const hasFlashLoanProtection = sourceCode.includes("flashLoanLock") || 
                                     sourceCode.includes("flashLoanProtection");
      
      if (sourceCode.match(/function.*\{[\s\S]*?balance[\s\S]*?\}/g) && 
          !hasReentrancyGuard && !hasFlashLoanProtection) {
        vulnerabilities.push({
          type: "Balance-Based Logic Vulnerability",
          description: "Contract logic depends on balances without flash loan protection"
        });
      }
    }

    // 4. Same-block action vulnerability
    const hasDeposit = sourceCode.includes("deposit") || sourceCode.includes("Deposit");
    const hasAction = sourceCode.includes("vote") || sourceCode.includes("withdraw") || 
                     sourceCode.includes("claim");
    
    if (hasDeposit && hasAction) {
      const hasBlockCheck = sourceCode.includes("block.number") || 
                           sourceCode.includes("block.timestamp");
      
      if (!hasBlockCheck) {
        vulnerabilities.push({
          type: "Same-Block Action Vulnerability",
          description: "Users can deposit and take actions in the same transaction/block"
        });
      }
    }

    // 5. Missing flash loan checks
    const hasFlashLoan = sourceCode.includes("flashLoan") || sourceCode.includes("flash");
    
    if (hasFlashLoan) {
      const hasProperChecks = sourceCode.includes("require") && 
                             (sourceCode.includes("balanceBefore") || 
                              sourceCode.includes("balanceAfter"));
      
      if (hasProperChecks) {
        // Check if the repayment check is robust enough
        const hasFeeCheck = sourceCode.includes("fee") || sourceCode.includes("premium");
        
        if (!hasFeeCheck) {
          vulnerabilities.push({
            type: "Flash Loan Without Fee",
            description: "Flash loan implementation doesn't charge fees, enabling zero-cost attacks"
          });
        }
      }
    }

    // Display findings
    if (vulnerabilities.length > 0) {
      console.log("⚠️  FLASH LOAN ATTACK VULNERABILITIES DETECTED:\n");
      vulnerabilities.forEach((vuln, index) => {
        console.log(`${index + 1}. ${vuln.type}`);
        console.log(`   → ${vuln.description}\n`);
      });
      
      console.log("RECOMMENDATIONS:");
      console.log("• Implement timelock delays between deposit and voting");
      console.log("• Use snapshot-based voting (record balances at specific blocks)");
      console.log("• Use Chainlink or other decentralized oracles for price feeds");
      console.log("• Implement Time-Weighted Average Price (TWAP) for DEX prices");
      console.log("• Add flash loan protection mechanisms");
      console.log("• Charge fees on flash loans to make attacks expensive");
      console.log("• Implement reentrancy guards");
      console.log("• Track user actions across blocks to prevent same-block exploits\n");
      
      console.log(`Total flash loan vulnerabilities found: ${vulnerabilities.length}`);
    } else {
      console.log("✓ No obvious flash loan attack vulnerabilities detected");
      console.log("Note: This analysis is basic. Professional audit recommended.");
    }

  } catch (readError) {
    console.error(`Error reading contract file: ${readError.message}`);
  }

  // Also display solhint output if available
  if (stdout) {
    console.log("\n" + "=".repeat(70));
    console.log("SOLHINT OUTPUT:");
    console.log("=".repeat(70));
    console.log(stdout);
  }

  console.log("=".repeat(70));
});
