//const { default: Web3 } = require("web3");

var DappToken = artifacts.require('./DappToken.sol');
var DappTokenSale = artifacts.require('./DappTokenSale.sol');

contract ('DappTokenSale', function(accounts) {

    var tokenInstance;
    var tokenSaleInstance;
    var admin = accounts[0];
    var buyer = accounts[1];
    var tokenPrice = 1000000000000000; //in wei
    var tokenAvailable = 750000;
    var numberOfTokens;
    

    it ('initializes the contract with the correct values', async function() {
        return DappTokenSale.deployed().then(function(instance) {
            tokenSaleInstance = instance;
            return tokenSaleInstance.address
        }).then(function(address) {
            assert.notEqual(address, 0x0, 'has contract address');
            return tokenSaleInstance.tokenContract();
        }).then(function(address) {
            assert.notEqual(address, 0x0, 'has token contract address');
            return tokenSaleInstance.tokenPrice();
        }).then(function(price) {
            assert.equal(price, tokenPrice, 'token price is correct');
        });
    });
    
    it('facilitates token buying', async function() {
        return DappToken.deployed().then(function(instance) {
            tokenInstance = instance;
            return DappTokenSale.deployed();
        }).then(function(instance) {
            tokenSaleInstance = instance;
            return tokenInstance.transfer(tokenSaleInstance.address, tokenAvailable, { from: admin });
        }).then(function(receipt) {
            numberOfTokens = 10;
            var value = numberOfTokens * tokenPrice;
            return tokenSaleInstance.buyTokens(numberOfTokens, { from: buyer, value: value });
        }).then(function(receipt) {
            assert.equal(receipt.logs.length, 1, 'triggers one event');
            assert.equal(receipt.logs[0].event, 'Sell', 'should be the "Sell" event');
            assert.equal(receipt.logs[0].args._buyer, buyer, 'logs the account that purchased the tokens');
            assert.equal(receipt.logs[0].args._amount, numberOfTokens, 'logs the number of tokens purchased');
            return tokenSaleInstance.tokenSold();
        }).then(function(amount) {
            assert.equal(amount.toNumber(), numberOfTokens, 'increments the number of tokens sold');
            return tokenInstance.balanceOf(buyer);
        }).then(function(balance) {
            assert.equal(balance.toNumber(), numberOfTokens, 'buyer balance incremented');
            return tokenInstance.balanceOf(tokenSaleInstance.address);
        }).then(function(balance) {
            assert.equal(balance.toNumber(), tokenAvailable - numberOfTokens, 'seller balance decremented');
            // Try to buy tokens different from the ether value
            return tokenSaleInstance.buyTokens(numberOfTokens, { from: buyer, value: 1 });
        }).then(assert.fail).catch(function(error) {
assert(error.message.indexOf('revert') >= 0, 'msg.value must equal number of tokens in wei');
            return tokenSaleInstance.buyTokens(800000, { from: buyer, value: 800000 * tokenPrice });
        }).then(assert.fail).catch(function(error) {
            assert(error.message.indexOf('revert') >= 0, 'cannot purchase more tokens than available');
        });
    });
    it ('ends token sale', async function() {
        return DappToken.deployed().then(function(instance) {
            //Grab token instance first
            tokenInstance = instance;
            return DappTokenSale.deployed();
        }).then(function(instance) {
            //Then grab token sale  instance
            tokenSaleInstance = instance;
            //Try to end sale from account other than the admin
            return tokenSaleInstance.endSale ({from: buyer  });
        }).then(assert.fail).catch(function(error) {
            assert (error.message.indexOf('revert' >=0, 'must be admin to end sales'));
            //end sale as admin
            return tokenSaleInstance.endSale ({from: admin});
        }).then(function(receipt) {
            return tokenInstance.balanceOf(admin);
        }).then(function(balance) {
            assert.equal(balance.toNumber(), 999990, 'returns all unsold dapp tokens to admin');
            //check that the contract has no balance
            return web3.eth.getBalance(tokenSaleInstance.address);
        }).then(function(balance) {
             assert.equal(parseInt(balance), 0);
        });
    });
});

