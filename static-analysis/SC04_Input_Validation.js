const fs = require("fs");
const { exec } = require("child_process");

// Path to the vulnerable contract
const contractPath = "contracts/SC04_Input_Validation/SC04_Input_Validation_Victim.sol";

// Solhint command to detect input validation issues
const command = `npx solhint ${contractPath}`;

exec(command, (error, stdout, stderr) => {
  // Solhint returns a non-zero exit code when warnings are found.
  // We check for stdout to see if there are any warnings.
  if (error && !stdout) {
    console.error(`Error executing command: ${error.message}`);
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
    }
    return;
  }

  console.log("=".repeat(70));
  console.log("SC04: Static Analysis - Lack of Input Validation");
  console.log("=".repeat(70));
  console.log(`\nAnalyzing: ${contractPath}\n`);

  // Read the contract source code for manual pattern analysis
  try {
    const sourceCode = fs.readFileSync(contractPath, "utf8");
    
    const vulnerabilities = [];

    // Check for missing input validation patterns
    if (sourceCode.includes("function") && !sourceCode.includes("require(amount > 0")) {
      vulnerabilities.push({
        type: "Missing zero-value check",
        description: "Functions accepting amount parameters should validate amount > 0"
      });
    }

    if (sourceCode.includes("function") && !sourceCode.includes("require(to != address(0)")) {
      vulnerabilities.push({
        type: "Missing zero-address check",
        description: "Functions with address parameters should validate address != address(0)"
      });
    }

    if (sourceCode.includes("msg.value") && !sourceCode.includes("require(msg.value ==")) {
      vulnerabilities.push({
        type: "Missing payment validation",
        description: "Functions accepting payments should validate msg.value matches expected amount"
      });
    }

    if (sourceCode.includes("balances[msg.sender] -=") && !sourceCode.includes("require(balances[msg.sender] >=")) {
      vulnerabilities.push({
        type: "Missing balance check",
        description: "Functions decreasing balances should validate sufficient balance"
      });
    }

    if (sourceCode.includes("totalSupply") && !sourceCode.includes("require(soldTokens + amount <=")) {
      vulnerabilities.push({
        type: "Missing supply limit check",
        description: "Functions increasing sold tokens should validate against total supply"
      });
    }

    if (sourceCode.includes("function") && sourceCode.includes("owner") && !sourceCode.includes("require(msg.sender == owner")) {
      vulnerabilities.push({
        type: "Missing access control",
        description: "Privileged functions should validate msg.sender == owner"
      });
    }

    // Display findings
    if (vulnerabilities.length > 0) {
      console.log("⚠️  INPUT VALIDATION VULNERABILITIES DETECTED:\n");
      vulnerabilities.forEach((vuln, index) => {
        console.log(`${index + 1}. ${vuln.type}`);
        console.log(`   → ${vuln.description}\n`);
      });
      console.log(`Total vulnerabilities found: ${vulnerabilities.length}`);
    } else {
      console.log("✓ No obvious input validation issues detected");
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
