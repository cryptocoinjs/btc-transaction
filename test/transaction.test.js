var Transaction = require('../').Transaction
var convBin = require('binstring')

require('terst')

describe('Transaction ', function() {
  describe(' - Transaction.deserialize()', function() {
    it(' > able to deserialize a buffer into a Transaction object', function() {
      var rawHex = '01000000010149c11ea99b6369dcd6cf9991fa0eb20a9501c7a348330e2db782e3884b9a2f000000008b483045022001c4c20a97cef3d2ff60bba1780409159e122a0b75eee99f87257a6ef3f5795e022100c5c0fd78408ebff9bc020a91e5f423994294efb18f50c2f496c4d35163acbb93014104e1934263e84e202ebffca95246b63c18c07cd369c4f02de76dbd1db89e6255dacb3ab1895af0422e24e1d1099e80f01b899cfcdf9b947575352dbc1af57466b5ffffffff01a0860100000000001976a914a5319d469e1ddd9558bd558a50e95f74b3da58c988ac00000000'
      var buf = convBin(rawHex, {in: 'hex', out: 'buffer'})
      var test = Transaction.deserialize(buf)
      T (test instanceof Transaction)
      EQ (test.version, 1)
      EQ (test.lock_time, 0)
      EQ (test.ins.length, 1)
      EQ (test.outs.length, 1)
    })
  })
})
