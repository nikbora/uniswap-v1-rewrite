An exercise in making a Solidity version of Uni V1, cuz why not

Approach is this:

1. Look at the Python unit tests and convert them line by line (e.g. https://github.com/Uniswap/uniswap-v1/blob/master/tests/exchange/test_liquidity_pool.py)
2. Make them pass by writing solidity contract functions
3. Start with add/remove liquidity, then move onto swapping etc


To run:

```
npm install
npx hardhat test
```

Things I learned so far:

* Vyper feels safer than Solidity (by design!) but lack of inheritance is annoying, esp with common things like ERC20 implementations
* Hardhat is awesome, if only it was easy to integrate into IDE for simpler debugging (need to find if someone did this)
* Its surprising how simple Uni V1 code actually is, expected it to be far more complicated. Hadn't realised that UNI token was essentially what is now the LP token.