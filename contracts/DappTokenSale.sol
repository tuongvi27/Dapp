//file DappTokenSale.sol                                                                                                                    // SPDX-License-Identifier: MIT
pragma solidity ^0.5.16;

import "./DappToken.sol";

contract DappTokenSale {
    address payable admin;
    DappToken public tokenContract;
    uint256 public tokenPrice;
    uint256 public tokenSold;

    event Sell(address _buyer, uint256 _amount);

    constructor(DappToken _tokenContract, uint256 _tokenPrice) public {
        admin = msg.sender;
        tokenContract = _tokenContract;
        tokenPrice = _tokenPrice;
    }

    function multiply(uint x, uint y) internal pure returns (uint z) {
        require(y == 0 || (z = x * y) / y == x, "Lỗi nhân số");
    }

    function buyTokens(uint256 _numberOfTokens) public payable {
        require(msg.value == multiply(_numberOfTokens, tokenPrice), "Số Ether không đúng");
        require(tokenContract.balanceOf(address(this)) >= _numberOfTokens, "Không đủ tokens để bán");
        require(tokenContract.transfer(msg.sender, _numberOfTokens), "Chuyển tokens không thành công");

        tokenSold += _numberOfTokens;

        emit Sell(msg.sender, _numberOfTokens);
    }

    function endSale() public {
        require(msg.sender == admin, "Người gọi không phải là admin");
        require(tokenContract.transfer(admin, tokenContract.balanceOf(address(this))), "Chuyển tokens không thành công");

        admin.transfer(address(this).balance);
    }
}
