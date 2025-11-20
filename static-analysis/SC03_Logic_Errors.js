const fs = require("fs");
const { exec } = require("child_process");

// Path to the vulnerable contract
const contractPath = "contracts/SC03_Logic_Errors/SC03_Logic_Errors_Victim.sol";

// Solhint command to detect logic errors
const command = `npx solhint ${contractPath} -c .solhint.json`;

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

  // Check for specific logic error warnings from our custom rules if we had any,
  // or general warnings that indicate logical flaws.
  // For this case, we'll just check if there is any output from solhint.
  if (stdout) {
    console.log("Static analysis found issues:");
    console.log(stdout);
  } else {
    console.log("No static analysis issues detected.");
  }
});
