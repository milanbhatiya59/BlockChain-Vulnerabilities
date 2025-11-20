const { exec } = require('child_process');

console.log("Running static analysis with solhint...");
console.log("Target: Inconsistent State Update Vulnerability\n");

exec(
  'npx solhint "contracts/Research_Paper/Inconsistent_State_Update/Inconsistent_State_Update_Victim.sol"',
  (error, stdout, stderr) => {
    if (stdout) {
      console.log(`solhint output:\n${stdout}`);
    }
    if (stderr) {
      console.error(`solhint stderr:\n${stderr}`);
    }
    if (error && !stdout && !stderr) {
      console.error(`Error executing solhint: ${error}`);
    }
  }
);
