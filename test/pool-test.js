const {expect} = require('chai');

describe('UniV1InSol', function () {
    it('Basic token and pool checks', async function () {
        const NikToken = await ethers.getContractFactory('NikToken');
        const token = await NikToken.deploy(ethers.utils.parseUnits('100000', 'ether'));
        await token.deployed();

        const UniswapV1 = await ethers.getContractFactory('UniswapV1');
        const exchange = await UniswapV1.deploy(token.address);
        await exchange.deployed();

        expect(await exchange.token()).to.equal(token.address);
    });
    it('Can add/remove liquidity', async function () {
        const ETH_RESERVE = ethers.utils.parseUnits('5', 'ether');
        const NIK_TOKEN_RESERVE = ethers.utils.parseUnits('10', 'ether');
        const DEADLINE = 1742680400;

        const [owner, addr1, addr2, addr3] = await ethers.getSigners();

        const NikToken = await ethers.getContractFactory('NikToken');
        const token = await NikToken.deploy(ethers.utils.parseUnits('100000', 'ether'));
        await token.deployed();

        const UniswapV1 = await ethers.getContractFactory('UniswapV1');
        const pool = await UniswapV1.deploy(token.address);
        await pool.deployed();

        // Add initial liquitidy
        await token.approve(pool.address, NIK_TOKEN_RESERVE);
        expect(pool.addLiquidity(0, NIK_TOKEN_RESERVE, DEADLINE, {value: ETH_RESERVE})).to.emit(pool, 'Transfer');

        // HAY_token.transfer(a1, 15*10**18, transact={})
        await token.transfer(addr1.address, ethers.utils.parseUnits('15', 'ether'));
        // HAY_token.approve(HAY_exchange.address, 15*10**18, transact={'from': a1})
        await token.connect(addr1).approve(pool.address, ethers.utils.parseUnits('15', 'ether'));
        // // assert HAY_token.balanceOf(a1) == 15*10**18
        expect(await token.balanceOf(addr1.address)).to.equal(ethers.utils.parseUnits('15', 'ether'));
        // # First liquidity provider (t.a0) adds liquidity
        // assert HAY_exchange.totalSupply() == ETH_RESERVE
        expect(await pool.totalSupply()).to.equal(ETH_RESERVE);
        // assert HAY_exchange.balanceOf(a0) == ETH_RESERVE
        expect(await pool.balanceOf(owner.address)).to.equal(ETH_RESERVE);
        // assert w3.eth.getBalance(HAY_exchange.address) == ETH_RESERVE
        expect(await ethers.provider.getBalance(pool.address)).to.equal(ETH_RESERVE);
        // assert HAY_token.balanceOf(HAY_exchange.address) == HAY_RESERVE
        expect(await token.balanceOf(pool.address)).to.equal(NIK_TOKEN_RESERVE);

        const ETH_ADDED = ethers.utils.parseUnits('2.5', 'ether');
        const HAY_ADDED = ethers.utils.parseUnits('5', 'ether');

        // Test fail cases

        // # min_liquidity == 0 (while totalSupply > 0)
        // assert_fail(lambda: HAY_exchange.addLiquidity(0, 15*10**18, DEADLINE, transact={'value': ETH_ADDED, 'from': a1}))
        await expect(pool.connect(addr1).addLiquidity(0, ethers.utils.parseUnits('15', 'ether'), DEADLINE, {value: ETH_ADDED}))
            .to.be.revertedWith('Min liquidity can\'t be 0');
        // # max_tokens < tokens needed
        // assert_fail(lambda: HAY_exchange.addLiquidity(1, HAY_ADDED - 1, DEADLINE, transact={'value': ETH_ADDED, 'from': a1}))
        await expect(pool.connect(addr1).addLiquidity(1, HAY_ADDED.sub(1), DEADLINE, {value: ETH_ADDED}))
            .to.be.revertedWith('Token amount can\'t exceed maxTokens');
        // # deadline < block.timestamp
        // assert_fail(lambda: HAY_exchange.addLiquidity(1, 15*10**18, 1, transact={'value': ETH_ADDED, 'from': a1}))
        await expect(pool.connect(addr1).addLiquidity(1, ethers.utils.parseUnits('15', 'ether'), 1, {value: ETH_ADDED}))
            .to.be.revertedWith('Deadline passed');


        // # Second liquidity provider (a1) adds liquidity
        // HAY_exchange.addLiquidity(1, 15*10**18, DEADLINE, transact={'value': ETH_ADDED, 'from': a1})
        await pool.connect(addr1).addLiquidity(1, ethers.utils.parseUnits('15', 'ether'), DEADLINE, {value: ETH_ADDED});
        // assert HAY_exchange.totalSupply() == ETH_RESERVE + ETH_ADDED
        expect(await pool.totalSupply()).to.equal(ETH_RESERVE.add(ETH_ADDED));
        // assert HAY_exchange.balanceOf(a0) == ETH_RESERVE
        expect(await pool.balanceOf(owner.address)).to.equal(ETH_RESERVE);
        // assert HAY_exchange.balanceOf(a1) == ETH_ADDED
        expect(await pool.balanceOf(addr1.address)).to.equal(ETH_ADDED);
        // assert w3.eth.getBalance(HAY_exchange.address) == ETH_RESERVE + ETH_ADDED
        expect(await ethers.provider.getBalance(pool.address)).to.equal(ETH_RESERVE.add(ETH_ADDED));
        // assert HAY_token.balanceOf(HAY_exchange.address) == HAY_RESERVE + HAY_ADDED + 1
        expect(await token.balanceOf(pool.address)).to.equal(NIK_TOKEN_RESERVE.add(HAY_ADDED).add(1));

        // # Can't transfer more liquidity than owned
        // assert_fail(lambda: HAY_exchange.transfer(a2, ETH_ADDED + 1, transact={'from': a1}))
        await expect(pool.connect(addr1).transfer(addr2.address, ETH_ADDED.add(1)))
            .to.be.revertedWith('ERC20: transfer amount exceeds balance');

        // # Second liquidity provider (a1) transfers liquidity to third liquidity provider (a2)
        // HAY_exchange.transfer(a2, 1*10**18, transact={'from': a1})
        const ONE_UNIT = ethers.utils.parseUnits('1', 'ether');
        await pool.connect(addr1).transfer(addr2.address, ONE_UNIT);
        // assert HAY_exchange.balanceOf(a0) == ETH_RESERVE
        expect(await pool.balanceOf(owner.address)).to.equal(ETH_RESERVE);
        // assert HAY_exchange.balanceOf(a1) == ETH_ADDED - 1*10**18
        expect(await pool.balanceOf(addr1.address)).to.equal(ETH_ADDED.sub(ONE_UNIT));
        // assert HAY_exchange.balanceOf(a2) == 1*10**18
        expect(await pool.balanceOf(addr2.address)).to.equal(ONE_UNIT);
        // assert w3.eth.getBalance(HAY_exchange.address) == ETH_RESERVE + ETH_ADDED
        expect(await ethers.provider.getBalance(pool.address)).to.equal(ETH_RESERVE.add(ETH_ADDED));
        // assert HAY_token.balanceOf(HAY_exchange.address) == HAY_RESERVE + HAY_ADDED + 1
        expect(await token.balanceOf(pool.address)).to.equal(NIK_TOKEN_RESERVE.add(HAY_ADDED).add(1));

        // Remove liquidity tests

        // # amount == 0
        // assert_fail(lambda: HAY_exchange.removeLiquidity(0, 1, 1, DEADLINE, transact={'from': a2}))
        await expect(pool.connect(addr2).removeLiquidity(0, 1, 1, DEADLINE))
            .to.be.revertedWith('Amount can\'t be 0');
        // # amount > owned (liquidity)
        // assert_fail(lambda: HAY_exchange.removeLiquidity(1*10**18 + 1, 1, 1, DEADLINE, transact={'from': a2}))
        await expect(pool.connect(addr2).removeLiquidity(ethers.utils.parseUnits('1', 'ether').add(1), 1, 1, DEADLINE))
            .to.be.revertedWith('ERC20: burn amount exceeds balance');
        // # min eth > eth divested
        // assert_fail(lambda: HAY_exchange.removeLiquidity(1*10**18, 1*10**18 + 1, 1, DEADLINE, transact={'from': a2}))
        await expect(pool.connect(addr2).removeLiquidity(ethers.utils.parseUnits('1', 'ether'), ethers.utils.parseUnits('1', 'ether').add(1), 1, DEADLINE))
            .to.be.revertedWith('ETH amount less than minEth');
        // # min tokens > tokens divested
        // assert_fail(lambda: HAY_exchange.removeLiquidity(1*10**18, 1, 2*10**18 + 1, DEADLINE, transact={'from': a2}))
        await expect(pool.connect(addr2).removeLiquidity(ethers.utils.parseUnits('1', 'ether'), 1, ethers.utils.parseUnits('2', 'ether').add(1), DEADLINE))
            .to.be.revertedWith('Token amount less than minTokens');
        // # deadline < block.timestamp
        // assert_fail(lambda: HAY_exchange.removeLiquidity(1*10**18, 1, 1, 1, transact={'from': a2}))
        await expect(pool.connect(addr2).removeLiquidity(ethers.utils.parseUnits('1', 'ether'), 1, 1, 1))
            .to.be.revertedWith('Deadline passed');

        // # First, second and third liquidity providers remove their remaining liquidity
        // HAY_exchange.removeLiquidity(ETH_RESERVE, 1, 1, DEADLINE, transact={})
        await pool.removeLiquidity(ETH_RESERVE, 1, 1, DEADLINE);
        // HAY_exchange.removeLiquidity(ETH_ADDED - 1*10**18, 1, 1, DEADLINE, transact={'from': a1})
        await pool.connect(addr1).removeLiquidity(ETH_ADDED.sub(ethers.utils.parseUnits('1', 'ether')), 1, 1, DEADLINE);
        // HAY_exchange.removeLiquidity(1*10**18, 1, 1, DEADLINE, transact={'from': a2})
        await pool.connect(addr2).removeLiquidity(ethers.utils.parseUnits('1', 'ether'), 1, 1, DEADLINE);
        // assert HAY_exchange.totalSupply() == 0
        expect(await pool.totalSupply()).to.equal(0);
        // assert HAY_exchange.balanceOf(a0) == 0
        expect(await pool.balanceOf(owner.address)).to.equal(0);
        // assert HAY_exchange.balanceOf(a1) == 0
        expect(await pool.balanceOf(addr1.address)).to.equal(0);
        // assert HAY_exchange.balanceOf(a2) == 0
        expect(await pool.balanceOf(addr2.address)).to.equal(0);
        // assert HAY_token.balanceOf(a1) == 13*10**18 - 1
        expect(await token.balanceOf(addr1.address)).to.equal(ethers.utils.parseUnits('13', 'ether').sub(1));
        // assert HAY_token.balanceOf(a2) == 2*10**18 + 1
        expect(await token.balanceOf(addr2.address)).to.equal(ethers.utils.parseUnits('2', 'ether').add(1));
        // assert w3.eth.getBalance(HAY_exchange.address) == 0
        expect(await ethers.provider.getBalance(pool.address)).to.equal(0);
        // assert HAY_token.balanceOf(HAY_exchange.address) == 0
        expect(await token.balanceOf(pool.address)).to.equal(0);
        // # Can add liquidity again after all liquidity is divested
        // HAY_token.approve(HAY_exchange.address, 100*10**18, transact={})
        await token.approve(pool.address, ethers.utils.parseUnits('100', 'ether'));
        // HAY_exchange.addLiquidity(0, HAY_RESERVE, DEADLINE, transact={'value': ETH_RESERVE})
        expect(pool.addLiquidity(0, NIK_TOKEN_RESERVE, DEADLINE, {value: ETH_RESERVE})).to.emit(pool, 'Transfer');
    });
});
