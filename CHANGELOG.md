0.1.1 / 2014-02-14
------------------
* Bugfix - serialize() used a removed dependency

0.1.0 / 2014-02-13
------------------
* if there is no `outpoint` default to coinbase `transactionIn`, 32 zero bytes, i.e. `0` as tx hash, `-1` as txIndex
* added `Transaction.defaultNetwork`, defaults to `mainnet` 
* commented out `analyze()` 
* commented out `getDescription()` 
* refactored `TransactionIn` and `TransactionOut` into separate files
* changed dep from `sha256` to `crypto-hashing`
* changed dep from `convert-hex` to `binstring`

0.0.3 / 2014-02-12
------------------
* Bugfix - reversing value bytes and removing bigInteger.valueOf as it does not work for numbers greater than 32 bits
* Feature- Added support to deserialize multiple transcation hex

0.0.2 / 2014-02-04
------------------
* added support for deserializing transaction hex

0.0.1 / 2014-01-13
------------------
* initial release

