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

### SC05: Reentrancy Attack

```bash
node static-analysis/SC05_Reentrancy_Attack.js
```

```bash
npx hardhat test dynamic-analysis/SC05_Reentrancy_Attack.js
```