var Transaction = require('../').Transaction
var TransactionIn = require('../').TransactionIn
var TransactionOut = require('../').TransactionOut
var BigInteger = require('bigi')
var convBin = require('binstring')
var fs = require('fs')

require('terst')

describe('Transaction ', function() {
  describe(' - Transaction.deserialize()', function() {
    it(' > able to deserialize a correct buffer into a Transaction object', function() {
      // https://test.helloblock.io/v1/transactions/c68d98aaff4630ec37ca360b61a690796183e8a1b14cf123c00f0913eed6107f
      // testnet transaction
      var rawHex = '01000000010149c11ea99b6369dcd6cf9991fa0eb20a9501c7a348330e2db782e3884b9a2f000000008b483045022001c4c20a97cef3d2ff60bba1780409159e122a0b75eee99f87257a6ef3f5795e022100c5c0fd78408ebff9bc020a91e5f423994294efb18f50c2f496c4d35163acbb93014104e1934263e84e202ebffca95246b63c18c07cd369c4f02de76dbd1db89e6255dacb3ab1895af0422e24e1d1099e80f01b899cfcdf9b947575352dbc1af57466b5ffffffff01a0860100000000001976a914a5319d469e1ddd9558bd558a50e95f74b3da58c988ac00000000'
      var buf = convBin(rawHex, { in : 'hex',
        out: 'buffer'
      })
      var test = Transaction.deserialize(buf)
      T(test, 'this should return a transaction object')

      if (test) {
        T(test instanceof Transaction)
        EQ(test.version, 1)
        EQ(test.lock_time, 0)
        EQ(test.ins.length, 1)
        EQ(test.outs.length, 1)
      }

      // should be able to reserialize this into the original hex
      var hex = convBin(test.serialize(), { in : 'bytes',
        out: 'hex'
      })
      EQ(rawHex, hex)
    })

    it(' > should return false when encountering an incorrect buffer', function() {
      var rawHex = '01000000010149c11ea99b6369dcd6cf9991fa0eb20a9501c7a348330e2db7'
      var buf = convBin(rawHex, { in : 'hex',
        out: 'buffer'
      })

      var test = Transaction.deserialize(buf)
      F(test, 'this should return false')
    })

    it(' > able to parse multiple transcations', function() {
      // note: tx 1 b1fea52486ce0c62bb442b530a3f0132b826c74e473d1f2c220bfa78111c5082
      // note: tx 2 f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16

      var twoRawHex = '01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0704ffff001d0102ffffffff0100f2052a01000000434104d46c4968bde02899d2aa0963367c7a6ce34eec332b32e42e5f3407e052d64ac625da6f0718e7b302140434bd725706957c092db53805b821a85b23a7ac61725bac000000000100000001c997a5e56e104102fa209c6a852dd90660a20b2d9c352423edce25857fcd3704000000004847304402204e45e16932b8af514961a1d3a1a25fdf3f4f7732e9d624c6c61548ab5fb8cd410220181522ec8eca07de4860a4acdd12909d831cc56cbbac4622082221a8768d1d0901ffffffff0200ca9a3b00000000434104ae1a62fe09c5f51b13905f07f06b99a2f7159b2225f374cd378d71302fa28414e7aab37397f554a7df5f142c21c1b7303b8a0626f1baded5c72a704f7e6cd84cac00286bee0000000043410411db93e1dcdb8a016b49840f8c53bc1eb68a382e97b1482ecad7b148a6909a5cb2e0eaddfb84ccf9744464f82e160bfa9b8b64f9d4c03f999b8643f656b412a3ac00000000'

      var buf = convBin(twoRawHex, { in : 'hex',
        out: 'buffer'
      })
      var test = Transaction.deserialize(buf, 2)
      T(test, 'this should not return false')
      T(Array.isArray(test), 'this should return an Array of transaction objects')

      if (test) {
        EQ(test.length, 2)
        T(test[0] instanceof Transaction)
        T(test[1] instanceof Transaction)
        EQ(test[0].version, 1)
        EQ(test[1].version, 1)
        EQ(test[0].lock_time, 0)
        EQ(test[1].lock_time, 0)
        EQ(test[0].ins.length, 1)
        EQ(test[1].ins.length, 1)
        EQ(test[0].outs.length, 1)
        EQ(test[1].outs.length, 2)
      }
    })

    it(' > supports BIP34 coinbase transactions', function() {
      var coinbaseHex = '01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0d03d891000450a8eb0b4ed20100ffffffff0100f2052a010000001976a9148c91773ffc9541c8f871ba62d3e7df2c54eddd7488ac00000000'
      var buf = convBin(coinbaseHex, { in : 'hex',
        out: 'buffer'
      })
      var v2coinbaseTx = Transaction.deserialize(buf)
      T(v2coinbaseTx)
      EQ(v2coinbaseTx.ins[0].script.getBlockHeight(), 37336)
      EQ(v2coinbaseTx.ins[0].outpoint.index, -1)
    })

    it(' > parse transaction with version of 0', function() {
      // https://helloblock.io/testnet/transactions/f1ebaf4604158a8a385cb55d1c0ca5efde98ab2d6f92bc667a02485f258c064e
      var hex = '000000000100eb1d909b9f297fa7f72dc7d7298f19d5454c1cae28d7463f150a60aa2814d9010000006a47304402207413f23d980d48ba4855126ab8fc896fdeeb7752cd9c76a2054a696a5a6137cc02201a674d6cfd32668b9ac4c50ca853975a085f724cb92e95a189610e686e7f3204012103ac81c3203de55b31478da413d9bb68b99dc8e33176f9f48e5efcc0900bb41b4affffffff024e61bc00000000001976a914cdf39308e3b7ad69de09e1e4d99e036905a4289688aca2583905000000001976a914a2e4f051244a24e469d28f076fec1db4f79512b788ac00000000'
      var buf = convBin(hex, { in : 'hex',
        out: 'buffer'
      })
      var test = Transaction.deserialize(buf, 1)
      EQ(convBin(test.serialize(), { in : 'bytes',
        out: 'hex'
      }), hex)
    })

    it(' > caches the original bytes so that we dont need to serialize again to getHash() or getSize() ', function() {
      var fileBuf = fs.readFileSync('./test/fixtures/95ea61f319ed0d2b28e94cb0164396b4024bc6ad624fcb492c5c87a088592e81.bin')

      var tx = Transaction.deserialize(fileBuf)
      // note: serializing a large transaction (1000+ inputs) such as this can take up to 2 minutes. So we have to cache the original bytes when we deserialize it so that getHash() will be fast
      EQ(convBin(tx.getHash(), { in : 'bytes',
        out: 'hex'
      }), '95ea61f319ed0d2b28e94cb0164396b4024bc6ad624fcb492c5c87a088592e81')
      EQ(tx.getSize(), 389406)
    })

  })

  describe(' - Transaction.getTotalOutValue()', function() {
    it(' > should return the correct value (from LE byte array)', function() {
      Transaction.defaultNetwork = 'testnet'
      var test = new Transaction()
      test.addOutput('mvaRDyLUeF4CP7Lu9umbU3FxehyC5nUz3L', '10000000000')
      test.addOutput('mvaRDyLUeF4CP7Lu9umbU3FxehyC5nUz3L', '20000000000')

      T(test.getTotalOutValue().compareTo(BigInteger('30000000000', 10)) === 0)
    })
  })
})

describe('TransactionIn', function() {
  describe(' - new TransactionIn()', function() {
    it(' > Should be able to generate a coinbase TranscationIn', function() {
      Transaction.defaultNetwork = 'mainnet'
      // Genesis Coinbase Transaction
      // https://helloblock.io/mainnet/transactions/0e3e2357e806b6cdb1f70b54c3a3a17b6714ee1f0e68bebb44a74b1efd512098

      // scenario 1:
      // there is outpoint but there is no hash
      var coinbaseInput1 = new TransactionIn({
        outpoint: {
          hash: null,
          index: null
        },
        script: '04ffff001d0104'
      })

      EQ(coinbaseInput1.outpoint.hash, '0000000000000000000000000000000000000000000000000000000000000000')
      EQ(coinbaseInput1.outpoint.index, -1)

      // scenario 2:
      // there no outpoint
      var coinbaseInput2 = new TransactionIn({
        script: '04ffff001d0104'
      })

      EQ(coinbaseInput2.outpoint.hash, '0000000000000000000000000000000000000000000000000000000000000000')
      EQ(coinbaseInput2.outpoint.index, -1)
    })
  })
})

describe('TransactionOut', function() {
  describe(' - new TransactionOut()', function() {
    it(' > Should generate the consistent value bytes order (should be unsigned byte array padded with zero and reversed)', function() {
      Transaction.defaultNetwork = 'testnet'
      // https://test.helloblock.io/v1/transactions/c68d98aaff4630ec37ca360b61a690796183e8a1b14cf123c00f0913eed6107f
      // first output
      // {
      // n: 0,
      // value: 100000,
      // scriptPubKey: "76a914a5319d469e1ddd9558bd558a50e95f74b3da58c988ac",
      // spent: false,
      // address: "mvaRDyLUeF4CP7Lu9umbU3FxehyC5nUz3L",
      // }

      var testOutput = new TransactionOut({
        script: '76a914a5319d469e1ddd9558bd558a50e95f74b3da58c988ac',
        value: '100000'
      })

      T(testOutput.value.length == 8)

      // should be unsigned byte padded with zero and reversed
      var value = BigInteger.valueOf(100000)
      value = value.toByteArrayUnsigned().reverse();
      while (value.length < 8) value.push(0);
      for (i in testOutput.value) {
        EQ(value[i], testOutput.value[i])
      }

      // should be consistent with Transaction.addOutput()
      var test = new Transaction()
      test.addOutput('mvaRDyLUeF4CP7Lu9umbU3FxehyC5nUz3L', '100000')

      EQ(testOutput.value.length, test.outs[0].value.length)
      for (i in test.outs[0].value) {
        EQ(test.outs[0].value[i], testOutput.value[i])
      }

    })
  })
})
