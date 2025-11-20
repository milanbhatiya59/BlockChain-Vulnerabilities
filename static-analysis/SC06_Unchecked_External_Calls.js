const fs = require("fs");
const { exec } = require("child_process");

// Path to the vulnerable contract
const contractPath = "contracts/SC06_Unchecked_External_Calls/SC06_Unchecked_External_Calls_Victim.sol";

// Solhint command to detect unchecked external calls
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
  console.log("SC06: Static Analysis - Unchecked External Calls");
  console.log("=".repeat(70));
  console.log(`\nAnalyzing: ${contractPath}\n`);

  // Read the contract source code for manual pattern analysis
  try {
    const sourceCode = fs.readFileSync(contractPath, "utf8");
    
    const vulnerabilities = [];

    // Check for unchecked call patterns
    const callMatches = sourceCode.match(/\.call\{[^}]*\}\([^)]*\);?(?!\s*\n\s*require)/g);
    if (callMatches) {
      vulnerabilities.push({
        type: "Unchecked low-level call",
        count: callMatches.length,
        description: "Low-level .call() used without checking return value"
      });
    }

    // Check for unchecked send patterns
    const sendMatches = sourceCode.match(/\.send\([^)]*\);?(?!\s*\n\s*require)/g);
    if (sendMatches) {
      vulnerabilities.push({
        type: "Unchecked send()",
        count: sendMatches.length,
        description: "send() used without checking return value (returns false on failure)"
      });
    }

    // Check for unchecked delegatecall patterns
    const delegatecallMatches = sourceCode.match(/\.delegatecall\{[^}]*\}\([^)]*\);?(?!\s*\n\s*require)/g);
    if (delegatecallMatches) {
      vulnerabilities.push({
        type: "Unchecked delegatecall",
        count: delegatecallMatches.length,
        description: "delegatecall() used without checking return value"
      });
    }

    // Check for unchecked staticcall patterns
    const staticcallMatches = sourceCode.match(/\.staticcall\{[^}]*\}\([^)]*\);?(?!\s*\n\s*require)/g);
    if (staticcallMatches) {
      vulnerabilities.push({
        type: "Unchecked staticcall",
        count: staticcallMatches.length,
        description: "staticcall() used without checking return value"
      });
    }

    // Check if call result is assigned but not checked
    const assignedCallMatches = sourceCode.match(/\(\s*bool\s+\w+\s*,?\s*.*?\)\s*=\s*.*?\.call/g);
    if (assignedCallMatches) {
      // This is actually good practice, but we should verify it's being checked
      const linesWithAssignedCalls = assignedCallMatches.length;
      const linesWithRequire = (sourceCode.match(/require\s*\(/g) || []).length;
      
      if (linesWithAssignedCalls > linesWithRequire) {
        vulnerabilities.push({
          type: "Potentially unchecked call result",
          count: linesWithAssignedCalls - linesWithRequire,
          description: "Call result assigned to variable but may not be checked with require()"
        });
      }
    }

    // Display findings
    if (vulnerabilities.length > 0) {
      console.log("⚠️  UNCHECKED EXTERNAL CALL VULNERABILITIES DETECTED:\n");
      vulnerabilities.forEach((vuln, index) => {
        console.log(`${index + 1}. ${vuln.type} (${vuln.count} instance${vuln.count > 1 ? 's' : ''})`);
        console.log(`   → ${vuln.description}\n`);
      });
      
      console.log("RECOMMENDATIONS:");
      console.log("• Always check the return value of low-level calls");
      console.log("• Use require(success, \"Error message\") after .call()");
      console.log("• Consider using .transfer() for simple ETH transfers (reverts on failure)");
      console.log("• Or check the boolean return value of .send()");
      console.log("• For contract calls, prefer using the high-level interface\n");
      
      const totalIssues = vulnerabilities.reduce((sum, v) => sum + v.count, 0);
      console.log(`Total unchecked external calls found: ${totalIssues}`);
    } else {
      console.log("✓ No obvious unchecked external call issues detected");
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
