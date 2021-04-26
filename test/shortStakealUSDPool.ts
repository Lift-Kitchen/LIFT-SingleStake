import chai, { expect } from 'chai';
import { ethers } from 'hardhat';
import { solidity } from 'ethereum-waffle';
import { Contract, ContractFactory, BigNumber, utils } from 'ethers';
import UniswapV2Factory from '@uniswap/v2-core/build/UniswapV2Factory.json';
import UniswapV2Router from '@uniswap/v2-periphery/build/UniswapV2Router02.json';
import { Provider } from '@ethersproject/providers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import { advanceTimeAndBlock } from './shared/utilities';

chai.use(solidity);

const DAY = 86400;
const ZERO_ADDR = '0x0000000000000000000000000000000000000000';
const ETH = utils.parseEther('1');

async function latestBlocktime(provider: Provider): Promise<number> {
    const { timestamp } = await provider.getBlock('latest');
    return timestamp;
}

describe('shortStakealUSDPool', () => {
    const { provider } = ethers;
    const startTime = 0;
    const period = 0;

    let shortStakeFactory: ContractFactory;
    let boardroomFactory: ContractFactory;
    let mockLIFT: ContractFactory;
    let mockSINGLE: ContractFactory;

    let shortStake: Contract;
    let boardroom: Contract;
    let mockLIFTToken: Contract;
    let mockSINGLEToken: Contract;

    let operator: SignerWithAddress;
    let addr1: SignerWithAddress;

    before(async () => {
        [operator, addr1] = await ethers.getSigners();

        shortStakeFactory = await ethers.getContractFactory('shortStakealUSDPool');
        boardroomFactory = await ethers.getContractFactory('Boardroom');
        mockLIFT = await ethers.getContractFactory('MockERC20');
        mockSINGLE = await ethers.getContractFactory('MockERC20');
    });

    beforeEach(async () => {
        boardroom = await boardroomFactory.deploy();
        mockLIFTToken = await mockLIFT.deploy();
        mockSINGLEToken = await mockSINGLE.deploy();

        shortStake = await shortStakeFactory.deploy(
            mockLIFTToken.address,
            mockSINGLEToken.address,
            boardroom.address,
            startTime
        );
    });

    describe('Deployment', async () => {
        describe('lfBTCLIFTLPTokenSharePool', async () => {
            it('should not allow staking 0 lpt', async () => {
                await expect(lfBTCLIFTLPTokenSharePool.stake(0))
                .to.be.revertedWith(
                    "VM Exception while processing transaction: revert lfBTCLIFTLPTokenSharePool: Cannot stake 0"
                );
            });

            it('should allow staking lpt', async () => {
                const amountToStake = ETH.mul(10);

                await lfBTCToken.mint(addr1.address, amountToStake);
                await lfBTCToken.connect(addr1).approve(uniswapRouter.address, amountToStake);

                await liftToken.mint(addr1.address, amountToStake);
                await liftToken.connect(addr1).approve(uniswapRouter.address, amountToStake);

                //adding liquidity with the lpToken from the oracle.pairFor() returns an address, but the address
                //isn't recognized as a contract for some reason during unit tests (But works fine on rinkeby) so
                //for now, mocking the lpToken and just minting directly for test
                //await addLiquidity(provider, addr1, uniswapRouter, lfBTCToken, liftToken, amountToStake);

                await mockLPToken.connect(operator).mint(addr1.address, amountToStake);
                await mockLPToken.connect(addr1).approve(lfBTCLIFTLPTokenSharePool.address, amountToStake);

                await expect(lfBTCLIFTLPTokenSharePool.connect(addr1).stake(amountToStake))
                     .to.emit(lfBTCLIFTLPTokenSharePool, "Staked")
                     .withArgs(addr1.address, amountToStake);

                expect(await mockLPToken.balanceOf(lfBTCLIFTLPTokenSharePool.address)).to.be.eq(amountToStake);
            });

            it('should allow staking lpt on behalf of a staker (used by GenesisVault)', async () => {
                const amountToStake = ETH.mul(10);

                await lfBTCToken.mint(operator.address, amountToStake);
                await lfBTCToken.approve(uniswapRouter.address, amountToStake);

                await liftToken.mint(operator.address, amountToStake);
                await liftToken.approve(uniswapRouter.address, amountToStake);

                await mockLPToken.mint(operator.address, amountToStake);
                await mockLPToken.approve(lfBTCLIFTLPTokenSharePool.address, amountToStake);

                await expect(lfBTCLIFTLPTokenSharePool.stakeLP(addr1.address, operator.address, amountToStake, 2))
                     .to.emit(lfBTCLIFTLPTokenSharePool, "Staked")
                     .withArgs(addr1.address, amountToStake);

                expect(await mockLPToken.balanceOf(lfBTCLIFTLPTokenSharePool.address)).to.be.eq(amountToStake);
            });

            it('should not allow staking lpt on behalf of a staker with an invalid lockout period', async () => {
                const amountToStake = ETH.mul(10);

                await lfBTCToken.mint(operator.address, amountToStake);
                await lfBTCToken.approve(uniswapRouter.address, amountToStake);

                await liftToken.mint(operator.address, amountToStake);
                await liftToken.approve(uniswapRouter.address, amountToStake);

                await mockLPToken.mint(operator.address, amountToStake);
                await mockLPToken.approve(lfBTCLIFTLPTokenSharePool.address, amountToStake);

                await expect(lfBTCLIFTLPTokenSharePool.stakeLP(addr1.address, operator.address, amountToStake, 0))
                    .to.be.revertedWith(
                    "VM Exception while processing transaction: revert lfBTCLIFTLPTokenSharePool: invalid term specified"
                );

                await expect(lfBTCLIFTLPTokenSharePool.stakeLP(addr1.address, operator.address, amountToStake, 5))
                    .to.be.revertedWith(
                    "VM Exception while processing transaction: revert lfBTCLIFTLPTokenSharePool: invalid term specified"
                );
            });

            it('should not allow withdrawing more lpt than staked ', async () => {
                const amountToStake = ETH.mul(10);

                await lfBTCToken.mint(addr1.address, amountToStake);
                await lfBTCToken.connect(addr1).approve(uniswapRouter.address, amountToStake);

                await liftToken.mint(addr1.address, amountToStake);
                await liftToken.connect(addr1).approve(uniswapRouter.address, amountToStake);

                await mockLPToken.connect(operator).mint(addr1.address, amountToStake);
                await mockLPToken.connect(addr1).approve(lfBTCLIFTLPTokenSharePool.address, amountToStake);

                await lfBTCLIFTLPTokenSharePool.connect(addr1).stake(amountToStake);

                await expect(lfBTCLIFTLPTokenSharePool.connect(addr1).withdraw(amountToStake.mul(2)))
                     .to.emit(lfBTCLIFTLPTokenSharePool, "Withdrawn")
                     .withArgs(addr1.address, amountToStake);
            });

            it('should allow withdrawing lpt', async () => {
                const amountToStake = ETH.mul(10);

                await lfBTCToken.mint(addr1.address, amountToStake);
                await lfBTCToken.connect(addr1).approve(uniswapRouter.address, amountToStake);

                await liftToken.mint(addr1.address, amountToStake);
                await liftToken.connect(addr1).approve(uniswapRouter.address, amountToStake);

                await mockLPToken.connect(operator).mint(addr1.address, amountToStake);
                await mockLPToken.connect(addr1).approve(lfBTCLIFTLPTokenSharePool.address, amountToStake);

                await lfBTCLIFTLPTokenSharePool.connect(addr1).stake(amountToStake);

                await expect(lfBTCLIFTLPTokenSharePool.connect(addr1).withdraw(amountToStake))
                     .to.emit(lfBTCLIFTLPTokenSharePool, "Withdrawn")
                     .withArgs(addr1.address, amountToStake);
            });

            it('should not allow withdrawing staked lpt on behalf of a staker during lockout', async () => {
                const amountToStake = ETH.mul(10);

                await lfBTCToken.mint(operator.address, amountToStake);
                await lfBTCToken.approve(uniswapRouter.address, amountToStake);

                await liftToken.mint(operator.address, amountToStake);
                await liftToken.approve(uniswapRouter.address, amountToStake);

                await mockLPToken.mint(operator.address, amountToStake);
                await mockLPToken.approve(lfBTCLIFTLPTokenSharePool.address, amountToStake);

                await lfBTCLIFTLPTokenSharePool.stakeLP(addr1.address, operator.address, amountToStake, term4);

                const daysToWait = (lockoutPeriod * term4) - 1;
                await advanceTimeAndBlock(
                    provider,
                    BigNumber.from(DAY * daysToWait).toNumber()
                );
                
                await expect(lfBTCLIFTLPTokenSharePool.connect(addr1).withdraw(amountToStake))
                     .to.not.emit(lfBTCLIFTLPTokenSharePool, "Withdrawn");
            });

            it('should return daysElapsed since staking', async () => {
                const amountToStake = ETH.mul(10);

                await lfBTCToken.mint(operator.address, amountToStake);
                await lfBTCToken.approve(uniswapRouter.address, amountToStake);

                await liftToken.mint(operator.address, amountToStake);
                await liftToken.approve(uniswapRouter.address, amountToStake);

                await mockLPToken.mint(operator.address, amountToStake);
                await mockLPToken.approve(lfBTCLIFTLPTokenSharePool.address, amountToStake);

                await lfBTCLIFTLPTokenSharePool.stakeLP(addr1.address, operator.address, amountToStake, term4);

                const daysToWait = 7;
                await advanceTimeAndBlock(
                    provider,
                    BigNumber.from(DAY * daysToWait).toNumber()
                );
                
                const daysElapsed = await lfBTCLIFTLPTokenSharePool.connect(addr1).daysElapsed();
                expect(daysElapsed).to.be.eq(daysToWait);
            });

            it('should allow withdrawing staked lpt on behalf of a staker after lockoutPeriod has passed', async () => {
                const amountToStake = ETH.mul(10);

                await lfBTCToken.mint(operator.address, amountToStake);
                await lfBTCToken.approve(uniswapRouter.address, amountToStake);

                await liftToken.mint(operator.address, amountToStake);
                await liftToken.approve(uniswapRouter.address, amountToStake);

                await mockLPToken.mint(operator.address, amountToStake);
                await mockLPToken.approve(lfBTCLIFTLPTokenSharePool.address, amountToStake);

                await lfBTCLIFTLPTokenSharePool.stakeLP(addr1.address, operator.address, amountToStake, term4);

                const daysToWait = lockoutPeriod * term4;
                await advanceTimeAndBlock(
                    provider,
                    BigNumber.from(DAY * daysToWait).toNumber()
                );

                await expect(lfBTCLIFTLPTokenSharePool.connect(addr1).withdraw(amountToStake))
                    .to.emit(lfBTCLIFTLPTokenSharePool, "Withdrawn")
                    .withArgs(addr1.address, amountToStake);
            });

            it('should not allow withdrawing staked lpt on behalf of a staker after lockoutPeriod has passed if no timelocked stake', async () => {
                const amountToStake = ETH.mul(10);

                const daysToWait = lockoutPeriod * term4;
                await advanceTimeAndBlock(
                    provider,
                    BigNumber.from(DAY * daysToWait).toNumber()
                );

                await expect(lfBTCLIFTLPTokenSharePool.connect(addr1).withdraw(amountToStake))
                    .to.be.revertedWith(
                    "VM Exception while processing transaction: revert lfBTCLIFTLPTokenSharePool: no tokens eligible for withdrawl due to lockout period"
                );
            });
        });
    });
});