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

### SC05: Reentrancy Attack

```bash
node static-analysis/SC05_Reentrancy_Attack.js
```

```bash
npx hardhat test dynamic-analysis/SC05_Reentrancy_Attack.js
```