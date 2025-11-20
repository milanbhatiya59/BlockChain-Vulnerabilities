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

```bash
node static-analysis/SC01_AccessControl.js
```

```bash
npx hardhat test dynamic-analysis/SC01_AccessControl.js
```

### SC02: Price Oracle Manipulation

```bash
node static-analysis/SC02_PriceOracle.js
```

```bash
npx hardhat test dynamic-analysis/SC02_PriceOracle.js
```

### SC03: Logic Errors

```bash
node static-analysis/SC03_Logic_Errors.js
```

```bash
npx hardhat test dynamic-analysis/SC03_Logic_Errors.js
```

### SC04: Lack of Input Validation

```bash
node static-analysis/SC04_Input_Validation.js
```

```bash
npx hardhat test dynamic-analysis/SC04_Input_Validation.js
```

### SC05: Reentrancy Attack

```bash
node static-analysis/SC05_Reentrancy_Attack.js
```

```bash
npx hardhat test dynamic-analysis/SC05_Reentrancy_Attack.js
```

### SC06: Unchecked External Calls

```bash
node static-analysis/SC06_Unchecked_External_Calls.js
```

```bash
npx hardhat test dynamic-analysis/SC06_Unchecked_External_Calls.js
```

### SC07: Flash Loan Attacks

```bash
node static-analysis/SC07_Flash_Loan_Attacks.js
```

```bash
npx hardhat test dynamic-analysis/SC07_Flash_Loan_Attacks.js
```

### SC08: Integer Overflow and Underflow

```bash
node static-analysis/SC08_Integer_Overflow.js
```

```bash
npx hardhat test dynamic-analysis/SC08_Integer_Overflow.js
```

### SC09: Insecure Randomness

```bash
node static-analysis/SC09_Insecure_Randomness.js
```

```bash
npx hardhat test dynamic-analysis/SC09_Insecure_Randomness.js
```

## 3. Our Research

### Semantic State Drift

```bash
npx hardhat test dynamic-analysis/Our_Research/Semantic_State_Drift.js
```

### Event-State Mismatch

```bash
npx hardhat test dynamic-analysis/Our_Research/Event_State_Mismatch.js
```

## 4. Research Paper

### Exploit Chain Risk

```bash
npx hardhat test dynamic-analysis/Research_Paper/Exploit_Chain_Risk.js
```

### Inconsistent State Update

```bash
npx hardhat test dynamic-analysis/Research_Paper/Inconsistent_State_Update.js
```

### Semantic Level Bug

```bash
npx hardhat test dynamic-analysis/Research_Paper/Semantic_Level_Bug.js
```

### State Machine Dependency

```bash
npx hardhat test dynamic-analysis/Research_Paper/State_Machine_Dependency.js
```

