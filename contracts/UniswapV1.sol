// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract UniswapV1 is ERC20 {
    // Note: not worrying about SafeMath for the purposes of this exercise, but one should in real life :)

    event AddLiquidity(address indexed provider, uint256 ethAmount, uint256 tokenAmount);

    address public token;                     // address of the ERC20 token traded on this contract

    constructor(address _token) ERC20("Uniswap Nik V1", "UNI-NIK-V1-SOL") {
        token = _token;
    }

    // @notice Deposit ETH and Tokens (self.token) at current ratio to mint UNI tokens.
    // @dev min_liquidity does nothing when total UNI supply is 0.
    // @param min_liquidity Minimum number of UNI sender will mint if total UNI supply is greater than 0.
    // @param max_tokens Maximum number of tokens deposited. Deposits max amount if total UNI supply is 0.
    // @param deadline Time after which this transaction can no longer be executed.
    // @return The amount of UNI minted.
    function addLiquidity(uint256 _minLiquidity, uint256 _maxTokens, uint256 _deadline) public payable returns (uint256) {
        require(_deadline >block.timestamp, "Deadline passed" );
        require(_maxTokens > 0, "Max tokens must be bigger than 0");
        require(msg.value > 0, "Must send some ETH");

        uint256 totalLiquidity = totalSupply();

        if (totalLiquidity > 0) {
            // assert min_liquidity > 0
            require(_minLiquidity > 0, "Min liquidity can't be 0");
            // eth_reserve: uint256(wei) = self.balance - msg.value
            uint256 ethReserve = address(this).balance - msg.value;
            // token_reserve: uint256 = self.token.balanceOf(self)
            uint256 tokenReserve = IERC20(token).balanceOf(address(this));
            // token_amount: uint256 = msg.value * token_reserve / eth_reserve + 1
            uint256 tokenAmount = msg.value * tokenReserve / ethReserve + 1;
            // liquidity_minted: uint256 = msg.value * total_liquidity / eth_reserve
            uint256 liquidityMinted = msg.value * totalLiquidity / ethReserve;
            //  assert max_tokens >= token_amount and liquidity_minted >= min_liquidity
            require(_maxTokens >= tokenAmount, "Token amount can't exceed maxTokens");
            require(liquidityMinted >= _minLiquidity, "Minted liquidity can't be less than minLiquidity");
            // self.balances[msg.sender] += liquidity_minted
            // self.totalSupply = total_liquidity + liquidity_minted
            _mint(msg.sender, liquidityMinted);
            // assert self.token.transferFrom(msg.sender, self, token_amount)
            require(IERC20(token).transferFrom(msg.sender, address(this), tokenAmount));
            // log.AddLiquidity(msg.sender, msg.value, token_amount)
            emit AddLiquidity(msg.sender, msg.value, tokenAmount);
            // log.Transfer(ZERO_ADDRESS, msg.sender, liquidity_minted)
            emit Transfer(address(0), msg.sender, liquidityMinted);
            // return liquidity_minted
            return liquidityMinted;
        } else {
            // assert (self.factory != ZERO_ADDRESS and self.token != ZERO_ADDRESS) and msg.value >= 1000000000
            require(token != address(0));
            require(msg.value >= 1000000000, "1 gwei minimum value");
            // token_amount: uint256 = max_tokens
            uint256 tokenAmount = _maxTokens;
            // initial_liquidity: uint256 = as_unitless_number(self.balance)
            uint256 initialLiquidity = address(this).balance;
            // self.totalSupply = initial_liquidity
            // self.balances[msg.sender] = initial_liquidity
            _mint(msg.sender, initialLiquidity);
            // assert self.token.transferFrom(msg.sender, self, token_amount)
            require(IERC20(token).transferFrom(msg.sender, address(this), tokenAmount));
            // log.AddLiquidity(msg.sender, msg.value, token_amount)
            emit AddLiquidity(msg.sender, msg.value, tokenAmount);
            // log.Transfer(ZERO_ADDRESS, msg.sender, initial_liquidity)
            emit Transfer(address(0), msg.sender, initialLiquidity);
            return initialLiquidity;
        }
    }

    function removeLiquidity() public {
        // TODO
    }

}



