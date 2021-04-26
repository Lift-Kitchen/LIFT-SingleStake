const contract = require('@truffle/contract');

const LIFT = "0xf9209d900f7ad1DC45376a2caA61c78f6dEA53B6";
const boardroom = "0x3223689b39Db8a897a9A9F0907C8a75d42268787";
const POOL_START_DATE     = 1619888400; // 05/01/2021 @ 1:00pm (EST)
// ============ Contracts ============

// Pools to deploy

const alUSDPool = artifacts.require('shortStakealUSDPool')
const BASv2Pool = artifacts.require('shortStakeBASv2Pool')
const iFARMPool = artifacts.require('shortStakeiFARMPool')
const KBTCPool = artifacts.require('shortStakeKBTCPool')
const PICKLEPool = artifacts.require('shortStakePICKLEPool')


// ============ Main Migration ============

const migration = async (deployer, network, accounts) => {
  await Promise.all([deployPool(deployer, network, accounts)])
}

module.exports = migration

// ============ Deploy Functions ============

async function deployPool(deployer, network, accounts) {
  const alUSD = "0xbc6da0fe9ad5f3b0d58160288917aa56653660e9";
  await deployer.deploy(alUSDPool, LIFT, alUSD, boardroom, POOL_START_DATE);

  const BASv2 = "0x106538cc16f938776c7c180186975bca23875287";
  await deployer.deploy(BASv2Pool, LIFT, BASv2, boardroom, POOL_START_DATE);

  const iFARM = "0x1571ed0bed4d987fe2b498ddbae7dfa19519f651";
  await deployer.deploy(iFARMPool, LIFT, iFARM, boardroom, POOL_START_DATE);

  const KBTC = "0xe6c3502997f97f9bde34cb165fbce191065e068f";
  await deployer.deploy(KBTCPool, LIFT, KBTC, boardroom, POOL_START_DATE);
  
  const PICKLE = "0x429881672B9AE42b8EbA0E26cD9C73711b891Ca5";
  await deployer.deploy(PICKLEPool, LIFT, PICKLE, boardroom, POOL_START_DATE);
}
