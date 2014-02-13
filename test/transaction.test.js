var Transaction = require('../').Transaction
var TransactionIn = require('../').TransactionIn
var TransactionOut = require('../').TransactionOut
var BigInteger = require('bigi')
var convBin = require('binstring')

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
  })

  describe(' - Transaction.getTotalOutValue()', function() {
    it(' > should return the correct value (from LE byte array)', function() {
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
