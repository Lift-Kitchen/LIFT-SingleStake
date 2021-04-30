const fs = require('fs');
const path = require('path');
const util = require('util');

const writeFile = util.promisify(fs.writeFile);

// Deployment and ABI will be generated for contracts listed on here.
// The deployment thus can be used on lift.kitchen-frontend.
const exportedContracts = [
'shortStakealUSDPool',
'shortStakeBASv2Pool',
'shortStakeiFARMPool',
'shortStakeKBTCPool',
'shortStakePICKLEPool',
'Oracle',
'HedgeFund'
];

module.exports = async (deployer, network, accounts) => {
  const deployments = {};

  for (const name of exportedContracts) {
    const contract = artifacts.require(name);
    deployments[name] = {
      address: contract.address,
      abi: contract.abi,
    };
  }
  const deploymentPath = path.resolve(__dirname, `../build/deployments.${network}.json`);
  await writeFile(deploymentPath, JSON.stringify(deployments, null, 2));

  console.log(`Exported deployments into ${deploymentPath}`);
};
