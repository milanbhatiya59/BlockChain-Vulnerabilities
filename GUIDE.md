# Project Execution Guide

## 1. Setup and Deployment

```bash
npm install
```

```bash
npx hardhat compile
```

```bash
npx hardhat node
```

```bash
npx hardhat run scripts/deploy.js --network localhost
```


## 2. Vulnerabilities

### SC01: Access Control Vulnerabilities

**Solhint Static Analysis:**
```bash
node static-analysis/solhint/SC01_AccessControl.js
```

**Slither Static Analysis:**
```bash
node static-analysis/slither/SC01_AccessControl.js
```

**Dynamic Analysis:**
```bash
npx hardhat test dynamic-analysis/SC01_AccessControl.js
```

### SC02: Price Oracle Manipulation

**Solhint Static Analysis:**
```bash
node static-analysis/solhint/SC02_PriceOracle.js
```

**Slither Static Analysis:**
```bash
node static-analysis/slither/SC02_PriceOracle.js
```

**Dynamic Analysis:**
```bash
npx hardhat test dynamic-analysis/SC02_PriceOracle.js
```

### SC03: Logic Errors

**Solhint Static Analysis:**
```bash
node static-analysis/solhint/SC03_Logic_Errors.js
```

**Slither Static Analysis:**
```bash
node static-analysis/slither/SC03_Logic_Errors.js
```

**Dynamic Analysis:**
```bash
npx hardhat test dynamic-analysis/SC03_Logic_Errors.js
```

### SC04: Lack of Input Validation

**Solhint Static Analysis:**
```bash
node static-analysis/solhint/SC04_Input_Validation.js
```

**Slither Static Analysis:**
```bash
node static-analysis/slither/SC04_Input_Validation.js
```

**Dynamic Analysis:**
```bash
npx hardhat test dynamic-analysis/SC04_Input_Validation.js
```

### SC05: Reentrancy Attack

**Solhint Static Analysis:**
```bash
node static-analysis/solhint/SC05_Reentrancy_Attack.js
```

**Slither Static Analysis:**
```bash
node static-analysis/slither/SC05_Reentrancy_Attack.js
```

**Dynamic Analysis:**
```bash
npx hardhat test dynamic-analysis/SC05_Reentrancy_Attack.js
```

### SC06: Unchecked External Calls

**Solhint Static Analysis:**
```bash
node static-analysis/solhint/SC06_Unchecked_External_Calls.js
```

**Slither Static Analysis:**
```bash
node static-analysis/slither/SC06_Unchecked_External_Calls.js
```

**Dynamic Analysis:**
```bash
npx hardhat test dynamic-analysis/SC06_Unchecked_External_Calls.js
```

### SC07: Flash Loan Attacks

**Solhint Static Analysis:**
```bash
node static-analysis/solhint/SC07_Flash_Loan_Attacks.js
```

**Slither Static Analysis:**
```bash
node static-analysis/slither/SC07_Flash_Loan_Attacks.js
```

**Dynamic Analysis:**
```bash
npx hardhat test dynamic-analysis/SC07_Flash_Loan_Attacks.js
```

### SC08: Integer Overflow and Underflow

**Solhint Static Analysis:**
```bash
node static-analysis/solhint/SC08_Integer_Overflow.js
```

**Slither Static Analysis:**
```bash
node static-analysis/slither/SC08_Integer_Overflow.js
```

**Dynamic Analysis:**
```bash
npx hardhat test dynamic-analysis/SC08_Integer_Overflow.js
```

### SC09: Insecure Randomness

**Solhint Static Analysis:**
```bash
node static-analysis/solhint/SC09_Insecure_Randomness.js
```

**Slither Static Analysis:**
```bash
node static-analysis/slither/SC09_Insecure_Randomness.js
```

**Dynamic Analysis:**
```bash
npx hardhat test dynamic-analysis/SC09_Insecure_Randomness.js
```

## 3. Our Research

### Semantic State Drift

**Solhint Static Analysis:**
```bash
node static-analysis/solhint/Our_Research/Semantic_State_Drift.js
```

**Slither Static Analysis:**
```bash
node static-analysis/slither/Our_Research/Semantic_State_Drift.js
```

**Dynamic Analysis:**
```bash
npx hardhat test dynamic-analysis/Our_Research/Semantic_State_Drift.js
```

### Event-State Mismatch

**Solhint Static Analysis:**
```bash
node static-analysis/solhint/Our_Research/Event_State_Mismatch.js
```

**Slither Static Analysis:**
```bash
node static-analysis/slither/Our_Research/Event_State_Mismatch.js
```

**Dynamic Analysis:**
```bash
npx hardhat test dynamic-analysis/Our_Research/Event_State_Mismatch.js
```

## 4. Research Paper

### Exploit Chain Risk

**Solhint Static Analysis:**
```bash
node static-analysis/solhint/Research_Paper/Exploit_Chain_Risk.js
```

**Slither Static Analysis:**
```bash
node static-analysis/slither/Research_Paper/Exploit_Chain_Risk.js
```

**Dynamic Analysis:**
```bash
npx hardhat test dynamic-analysis/Research_Paper/Exploit_Chain_Risk.js
```

### Inconsistent State Update

**Solhint Static Analysis:**
```bash
node static-analysis/solhint/Research_Paper/Inconsistent_State_Update.js
```

**Slither Static Analysis:**
```bash
node static-analysis/slither/Research_Paper/Inconsistent_State_Update.js
```

**Dynamic Analysis:**
```bash
npx hardhat test dynamic-analysis/Research_Paper/Inconsistent_State_Update.js
```

### Semantic Level Bug

**Solhint Static Analysis:**
```bash
node static-analysis/solhint/Research_Paper/Semantic_Level_Bug.js
```

**Slither Static Analysis:**
```bash
node static-analysis/slither/Research_Paper/Semantic_Level_Bug.js
```

**Dynamic Analysis:**
```bash
npx hardhat test dynamic-analysis/Research_Paper/Semantic_Level_Bug.js
```

### State Machine Dependency

**Solhint Static Analysis:**
```bash
node static-analysis/solhint/Research_Paper/State_Machine_Dependency.js
```

**Slither Static Analysis:**
```bash
node static-analysis/slither/Research_Paper/State_Machine_Dependency.js
```

**Dynamic Analysis:**
```bash
npx hardhat test dynamic-analysis/Research_Paper/State_Machine_Dependency.js
```

