var Transaction = require('../').Transaction
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
