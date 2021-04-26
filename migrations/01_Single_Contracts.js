const Artifactor = require('@truffle/artifactor');
const artifactor = new Artifactor(`${__dirname}/../build/contracts`);

const Migrations = artifacts.require('Migrations')

module.exports = async function (deployer) {
  await deployer.deploy(Migrations)
}
