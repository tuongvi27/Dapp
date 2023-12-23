                                                                                                                                   const { assign } = require("nodemailer/lib/shared");
var DappToken = artifacts.require("./DappToken.sol");

contract('DappToken', function(accounts) {
    var tokenInstance;

    beforeEach(async function() {
        tokenInstance = await DappToken.new(1000000);
    });

    it('initializes the contract with the correct values', async function() {
        const name = await tokenInstance.name();
        assert.equal(name, 'InSecLab Token', 'has the correct name');

        const symbol = await tokenInstance.symbol();
        assert.equal(symbol, 'ISL', 'has the correct symbol');

        const standard = await tokenInstance.standard();
        assert.equal(standard, 'InSecLab Token v1.0', 'has the correct standard');
    });

    it('allocates the initial supply upon deployment', async function() {
        const totalSupply = await tokenInstance.totalSupply();
        assert.equal(totalSupply.toNumber(), 1000000, 'sets the total supply to 1,000,000');

        const balance = await tokenInstance.balanceOf(accounts[0]);
        assert.equal(balance.toNumber(), 1000000, 'it allocates the initial supply to the admin account');
    });

    it('transfers token ownership', async function() {
        const receipt = await tokenInstance.transfer(accounts[1], 250000, { from: accounts[0] });
        assert.equal(receipt.logs.length, 1, 'triggers one event');
        assert.equal(receipt.logs[0].event, 'Transfer', 'should be the "Transfer" event');
        assert.equal(receipt.logs[0].args._from, accounts[0], 'logs the account the tokens are transferred from');
        assert.equal(receipt.logs[0].args._to, accounts[1], 'logs the account the tokens are transferred to');
        assert.equal(receipt.logs[0].args._value, 250000, 'logs the transfer amount');

        const balance1 = await tokenInstance.balanceOf(accounts[1]);
        assert.equal(balance1.toNumber(), 250000, 'adds the amount to the receiving account');

        const balance0 = await tokenInstance.balanceOf(accounts[0]);
        assert.equal(balance0.toNumber(), 750000, 'deducts the amount from the sending account');
    });

    it('approves tokens for delegated transfer', async function() {
        const success = await tokenInstance.approve.call(accounts[1], 100);
        assert.equal(success, true, 'it returns true');
    
        const receipt = await tokenInstance.approve(accounts[1], 100, {from: accounts[0] });
        assert.equal(receipt.logs.length, 1, 'triggers one event');
        assert.equal(receipt.logs[0].event, 'Approval', 'should be the "Approval" event');
        assert.equal(receipt.logs[0].args._from, accounts[0], 'logs the account the tokens are authorized by');
        assert.equal(receipt.logs[0].args._to, accounts[1], 'logs the account the tokens are authorized to');
        assert.equal(receipt.logs[0].args._value, 100, 'logs the transfer amount');
    
        const allowance = await tokenInstance.allowance(accounts[0], accounts[1]);
        assert.equal(allowance.toNumber(), 100, 'stores the allowance for delegated transfer');
    });
    it('handles delegated token transfer', function() {
        return DappToken.deployed().then(function(instance) {
            tokenInstance = instance;
            fromAccount = accounts[2];
            toAccount = accounts[3];
            spendingAccount = accounts[4];
            //Transfer some tokens to fromAccount
            return tokenInstance.transfer(fromAccount, 100, {from:  accounts[0] });
        }).then(function(receipt) {
            //Approve spendingAccount to spend 10 tokens from fromAccount
            return tokenInstance.approve(spendingAccount, 10, {from: fromAccount});
        }).then(function(receipt) {
            //try transferring something larger than the sender's balance
            return tokenInstance.transferFrom(fromAccount, toAccount, 9999, {from: spendingAccount });
        }).then(assert.fail).catch(function(error) {
            assert(error.message.indexOf('revert') >= 0, 'cannot transfer value larger than balance');
            //try transferring something larger than the approved amount
            return tokenInstance.transferFrom(fromAccount, toAccount, 20, {from: spendingAccount });
        }).then(assert.fail).catch(function(error) {
            assert(error.message.indexOf('revert') >= 0, 'cannot transfer value larger approved amount');
            return tokenInstance.transferFrom.call(fromAccount, toAccount, 10, {from: spendingAccount });
        }).then(function(success) {
            assert.equal(success, true);
            return tokenInstance.transferFrom(fromAccount, toAccount, 10, {from: spendingAccount });
        }).then(function(receipt) {
            assert.equal(receipt.logs.length, 1, 'triggers one event');
            assert.equal(receipt.logs[0].event, 'Transfer', 'should be the "Transfer" event');
            assert.equal(receipt.logs[0].args._from, fromAccount, 'logs the account the tokens are transferred from');
            assert.equal(receipt.logs[0].args._to, toAccount, 'logs the account the tokens are transferred to');
            assert.equal(receipt.logs[0].args._value, 10, 'logs the transfer amount');
            return tokenInstance.balanceOf(fromAccount);
        }).then(function(balance) {
            assert.equal(balance.toNumber(), 90, 'deducts the amount from the sending account');
            return tokenInstance.balanceOf(toAccount);
        }).then(function(balance) {
            assert.equal(balance.toNumber(), 10, 'adds the amount from the receiving account');
            return tokenInstance.allowance(fromAccount, spendingAccount);
        }).then(function(allowance) {
            assert.equal(allowance.toNumber(), 0, 'deducts the amount from the allowance');
        });
    });
});