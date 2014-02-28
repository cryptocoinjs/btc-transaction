var Address = require('btc-address');
var BigInteger = require('bigi');
var Script = require('btc-script');
var sha256 = require('crypto-hashing').sha256;
var binConv = require('binstring');
var Parser = require('crypto-binary').MessageParser;

/*****
 TODO: 1) review https://raw2.github.com/vbuterin/bitcoinjs-lib/master/src/transaction.js
       2) import changes that make sense, signing may not make sense
******/

var _defaultNetwork = 'mainnet';
Transaction.defaultNetwork = _defaultNetwork;

Object.defineProperty(Transaction, 'defaultNetwork', {
  set: function(val) {
    _defaultNetwork = val;
    Address.defaultNetwork = val;
    Script.defaultNetwork = val;
  },
  get: function() {
    return _defaultNetwork;
  }
})

module.exports.Transaction = Transaction;

var TransactionIn = require('./transaction-in');
var TransactionOut = require('./transaction-out');
module.exports.TransactionIn = TransactionIn;
module.exports.TransactionOut = TransactionOut;

function numToVarInt(num) {
  if (num < 253) return [num];
  else if (num < 65536) return [253].concat(numToBytes(num, 2));
  else if (num < 4294967296) return [254].concat(numToBytes(num, 4));
  else return [253].concat(numToBytes(num, 8));
}

// TODO(shtylman) crypto sha uses this also
// Convert a byte array to big-endian 32-bit words
var bytesToWords = function(bytes) {
  for (var words = [], i = 0, b = 0; i < bytes.length; i++, b += 8)
    words[b >>> 5] |= bytes[i] << (24 - b % 32);
  return words;
};

// Convert big-endian 32-bit words to a byte array
var wordsToBytes = function(words) {
  for (var bytes = [], b = 0; b < words.length * 32; b += 8)
    bytes.push((words[b >>> 5] >>> (24 - b % 32)) & 0xFF);
  return bytes;
};

function numToBytes(num, bytes) {
  if (bytes === undefined) bytes = 8;
  if (bytes == 0) return [];
  else return [num % 256].concat(numToBytes(Math.floor(num / 256), bytes - 1));
}

function Transaction(doc) {
  this.version = 1;
  this.lock_time = 0;
  this.ins = [];
  this.outs = [];
  this.timestamp = null;
  this.block = null;

  if (doc) {
    if (doc.hash) this.hash = doc.hash;
    if (doc.version !== null) this.version = doc.version;
    if (doc.lock_time) this.lock_time = doc.lock_time;
    if (doc.ins && doc.ins.length) {
      for (var i = 0; i < doc.ins.length; i++) {
        this.addInput(new TransactionIn(doc.ins[i]));
      }
    }
    if (doc.outs && doc.outs.length) {
      for (var i = 0; i < doc.outs.length; i++) {
        this.addOutput(new TransactionOut(doc.outs[i]));
      }
    }
    if (doc.timestamp) this.timestamp = doc.timestamp;
    if (doc.block) this.block = doc.block;
    // if we already have the original bytes; let's keep a copy
    // see comments at deserialize()
    if (doc.serialized) this.serialized = doc.serialized
  }
};

/**
 * Turn transaction data into Transaction objects.
 *
 * Takes an array of plain JavaScript objects containing transaction data and
 * returns an array of Transaction objects.
 */
Transaction.objectify = function(txs) {
  var objs = [];
  for (var i = 0; i < txs.length; i++) {
    objs.push(new Transaction(txs[i]));
  }
  return objs;
};

/**
 * Create a new txin.
 *
 * Can be called with an existing TransactionIn object to add it to the
 * transaction. Or it can be called with a Transaction object and an integer
 * output index, in which case a new TransactionIn object pointing to the
 * referenced output will be created.
 *
 * Note that this method does not sign the created input.
 */
Transaction.prototype.addInput = function(tx, outIndex) {
  if (arguments[0] instanceof TransactionIn) {
    this.ins.push(arguments[0]);
  } else {
    this.ins.push(new TransactionIn({
      outpoint: {
        hash: tx.hash,
        index: outIndex
      },
      script: new Script(),
      sequence: 4294967295
    }));
  }
};

/**
 * Create a new txout.
 *
 * Can be called with an existing TransactionOut object to add it to the
 * transaction. Or it can be called with an Address object and a BigInteger
 * for the amount, in which case a new TransactionOut object with those
 * values will be created.
 */
Transaction.prototype.addOutput = function(address, value, network) {
  if (arguments[0] instanceof TransactionOut) {
    this.outs.push(arguments[0]);
  } else {
    if ("string" == typeof address) {
      address = new Address(address, null, network || Transaction.defaultNetwork);
    }
    if ("number" == typeof value) {
      value = BigInteger(value.toString(), 10);
    }

    if ("string" == typeof value) {
      value = BigInteger(value, 10);
    }

    if (value instanceof BigInteger) {
      value = value.toByteArrayUnsigned().reverse();
      while (value.length < 8) value.push(0);
    } else if (Array.isArray(value)) {
      // Nothing to do
    }

    this.outs.push(new TransactionOut({
      value: value,
      script: Script.createOutputScript(address, network || Transaction.defaultNetwork)
    }));
  }
};

/**
 * Serialize this transaction.
 *
 * Returns the transaction as a byte array in the standard Bitcoin binary
 * format. This method is byte-perfect, i.e. the resulting byte array can
 * be hashed to get the transaction's standard Bitcoin hash.
 */
Transaction.prototype.serialize = function() {
  var buffer = [];
  buffer = buffer.concat(wordsToBytes([parseInt(this.version)]).reverse());
  buffer = buffer.concat(numToVarInt(this.ins.length));
  for (var i = 0; i < this.ins.length; i++) {
    var txin = this.ins[i];

    buffer = buffer.concat(binConv(txin.outpoint.hash, { in : 'hex',
      out: 'bytes'
    }).reverse());
    buffer = buffer.concat(wordsToBytes([parseInt(txin.outpoint.index)]).reverse());
    var scriptBytes = txin.script.buffer;
    buffer = buffer.concat(numToVarInt(scriptBytes.length));
    buffer = buffer.concat(scriptBytes);
    buffer = buffer.concat(wordsToBytes([parseInt(txin.sequence)]).reverse());
  }
  buffer = buffer.concat(numToVarInt(this.outs.length));
  for (var i = 0; i < this.outs.length; i++) {
    var txout = this.outs[i];
    buffer = buffer.concat(txout.value);
    var scriptBytes = txout.script.buffer;
    buffer = buffer.concat(numToVarInt(scriptBytes.length));
    buffer = buffer.concat(scriptBytes);
  }
  buffer = buffer.concat(wordsToBytes([parseInt(this.lock_time)]).reverse());

  return buffer;
};

var OP_CODESEPARATOR = 171;

var SIGHASH_ALL = 1;
var SIGHASH_NONE = 2;
var SIGHASH_SINGLE = 3;
var SIGHASH_ANYONECANPAY = 80;

/**
 * Hash transaction for signing a specific input.
 *
 * Bitcoin uses a different hash for each signed transaction input. This
 * method copies the transaction, makes the necessary changes based on the
 * hashType, serializes and finally hashes the result. This hash can then be
 * used to sign the transaction input in question.
 */
Transaction.prototype.hashTransactionForSignature = function(connectedScript, inIndex, hashType) {
  var txTmp = this.clone();

  // In case concatenating two scripts ends up with two codeseparators,
  // or an extra one at the end, this prevents all those possible
  // incompatibilities.
  /*scriptCode = scriptCode.filter(function (val) {
 return val !== OP_CODESEPARATOR;
 });*/

  // Blank out other inputs' signatures
  for (var i = 0; i < txTmp.ins.length; i++) {
    txTmp.ins[i].script = new Script();
  }

  txTmp.ins[inIndex].script = connectedScript;

  // Blank out some of the outputs
  if ((hashType & 0x1f) == SIGHASH_NONE) {
    txTmp.outs = [];

    // Let the others update at will
    for (var i = 0; i < txTmp.ins.length; i++)
      if (i != inIndex)
        txTmp.ins[i].sequence = 0;
  } else if ((hashType & 0x1f) == SIGHASH_SINGLE) {
    // TODO: Implement
  }

  // Blank out other inputs completely, not recommended for open transactions
  if (hashType & SIGHASH_ANYONECANPAY) {
    txTmp.ins = [txTmp.ins[inIndex]];
  }

  var buffer = txTmp.serialize();

  //todo: change to buffer
  buffer = buffer.concat(wordsToBytes([parseInt(hashType)]).reverse());
  return sha256.x2(buffer, { in : 'bytes',
    out: 'bytes'
  });
}

/**
 * Calculate and return the transaction's hash.
 */
Transaction.prototype.getHash = function() {
  // todo: migrate to buffer
  if (Array.isArray(this.serialized) && this.serialized.length > 0) {
    var buffer = this.serialized;
  } else {
    var buffer = this.serialize();
  }

  //todo: change to buffer
  return sha256.x2(buffer, { in : 'bytes',
    out: 'bytes'
  }).reverse();
};

Transaction.prototype.getSize = function() {
  // todo: migrate to buffer
  if (Array.isArray(this.serialized) && this.serialized.length > 0) {
    var buffer = this.serialized;
  } else {
    var buffer = this.serialize();
  }

  //todo: change to buffer
  return buffer.length;
}

/**
 * Create a copy of this transaction object.
 */
Transaction.prototype.clone = function() {
  var newTx = new Transaction();
  newTx.version = this.version;
  newTx.lock_time = this.lock_time;
  for (var i = 0; i < this.ins.length; i++) {
    var txin = this.ins[i].clone();
    newTx.addInput(txin);
  }
  for (var i = 0; i < this.outs.length; i++) {
    var txout = this.outs[i].clone();
    newTx.addOutput(txout);
  }
  return newTx;
};

/**
 * Analyze how this transaction affects a wallet.
 *
 * Returns an object with properties 'impact', 'type' and 'addr'.
 *
 * 'impact' is an object, see Transaction#calcImpact.
 *
 * 'type' can be one of the following:
 *
 * recv:
 *   This is an incoming transaction, the wallet received money.
 *   'addr' contains the first address in the wallet that receives money
 *   from this transaction.
 *
 * self:
 *   This is an internal transaction, money was sent within the wallet.
 *   'addr' is undefined.
 *
 * sent:
 *   This is an outgoing transaction, money was sent out from the wallet.
 *   'addr' contains the first external address, i.e. the recipient.
 *
 * other:
 *   This method was unable to detect what the transaction does. Either it
 */
/*Transaction.prototype.analyze = function(wallet) {
  var Wallet = require('./wallet');
  if (!(wallet instanceof Wallet)) return null;

  var allFromMe = true,
    allToMe = true,
    firstRecvHash = null,
    firstMeRecvHash = null,
    firstSendHash = null;

  for (var i = this.outs.length - 1; i >= 0; i--) {
    var txout = this.outs[i];
    var hash = txout.script.simpleOutPubKeyHash();
    if (!wallet.hasHash(hash)) {
      allToMe = false;
    } else {
      firstMeRecvHash = hash;
    }
    firstRecvHash = hash;
  }
  for (var i = this.ins.length - 1; i >= 0; i--) {
    var txin = this.ins[i];
    firstSendHash = txin.script.simpleInPubKeyHash();
    if (!wallet.hasHash(firstSendHash)) {
      allFromMe = false;
      break;
    }
  }

  var impact = this.calcImpact(wallet);

  var analysis = {};

  analysis.impact = impact;

  if (impact.sign > 0 && impact.value.compareTo(BigInteger.ZERO) > 0) {
    analysis.type = 'recv';
    analysis.addr = new Bitcoin.Address(firstMeRecvHash);
  } else if (allFromMe && allToMe) {
    analysis.type = 'self';
  } else if (allFromMe) {
    analysis.type = 'sent';
    // TODO: Right now, firstRecvHash is the first output, which - if the
    //       transaction was not generated by this library could be the
    //       change address.
    analysis.addr = new Bitcoin.Address(firstRecvHash);
  } else {
    analysis.type = "other";
  }

  return analysis;
};*/

/**
 * Get a human-readable version of the data returned by Transaction#analyze.
 *
 * This is merely a convenience function. Clients should consider implementing
 * this themselves based on their UI, I18N, etc.
 */
/*Transaction.prototype.getDescription = function(wallet) {
  var analysis = this.analyze(wallet);

  if (!analysis) return "";

  switch (analysis.type) {
    case 'recv':
      return "Received with " + analysis.addr;
      break;

    case 'sent':
      return "Payment to " + analysis.addr;
      break;

    case 'self':
      return "Payment to yourself";
      break;

    case 'other':
    default:
      return "";
  }
};*/

/**
 * Get the total amount of a transaction's outputs.
 */
Transaction.prototype.getTotalOutValue = function() {
  var totalValue = BigInteger.ZERO;
  for (var j = 0; j < this.outs.length; j++) {
    var txout = this.outs[j];
    totalValue = totalValue.add(BigInteger.fromByteArrayUnsigned(txout.value.reverse()));
  }
  return totalValue;
};

/**
 * Old name for Transaction#getTotalOutValue.
 *
 * @deprecated
 */
Transaction.prototype.getTotalValue = Transaction.prototype.getTotalOutValue;

// TODO: Make pull request in cypto-binary
Parser.prototype.readVarRaw = function readVarRaw() {
  if (this.hasFailed || this.pointerCheck() === false) return false;
  var flagRaw = this.raw(1);
  if (flagRaw) {
    var flag = flagRaw.readUInt8(0)
  } else {
    return false
  }

  if (flag < 0xfd) {
    return flagRaw;
  } else
  if (flag == 0xfd) {
    return Buffer.concat([flagRaw, this.raw(2)]);
  } else if (flag == 0xfe) {
    return Buffer.concat([flagRaw, this.raw(4)]);
  } else {
    return Buffer.concat([flagRaw, this.raw(8)]);
  }
};

// Second argument txCount is optional; It indicates
// the number of the transactions that you expect to
// parse. The default number is 1
Transaction.deserialize = function(buf, txCount) {
  if (!Buffer.isBuffer(buf)) {
    buf = binConv(buf, {
      out: 'buffer'
    });
  }

  var s = new Parser(buf)

  if (!txCount) {
    txCount = 1;
  }

  var transactions = []
  for (var y = 0; y < txCount; y++) {
    var doc = {};

    // note: serializing a large transaction (1000+ inputs) such as testnet tx ('95ea61f319ed0d2b28e94cb0164396b4024bc6ad624fcb492c5c87a088592e81') can take up to 2 minutes. So we have to cache the original bytes when we deserialize it so that getHash() will be fast

    // this will be concatenated into a buffer in the end
    doc.serialized = []
    var verB = s.raw(4)
    doc.serialized.push(verB)
    doc.version = new Parser(verB).readUInt32LE()

    doc.ins = []
    doc.outs = []

    var inB = s.readVarRaw()
    doc.serialized.push(inB)
    var inputCount = new Parser(inB).readVarInt()
    for (var i = 0; i < inputCount; i++) {
      var data = {}
      data.outpoint = {}

      var txHash = s.raw(32)
      if (txHash === false) {
        return false
      }
      doc.serialized.push(txHash)

      // TODO: change this to buffer in the transition to buffer
      data.outpoint.hash = binConv(binConv(txHash, {
        out: 'bytes'
      }).reverse(), {
        out: 'hex'
      })

      isCoinbase = (data.outpoint.hash === '0000000000000000000000000000000000000000000000000000000000000000')

      var indexB = s.raw(4)
      doc.serialized.push(indexB)
      data.outpoint.index = new Parser(indexB).readUInt32LE()
      // 0xFFFFFFFF (4294967295) is -1 when trying to read it as UInt32
      if (data.outpoint.index === 4294967295) {
        data.outpoint.index = -1
      }

      var sLenB = s.readVarRaw()
      doc.serialized.push(sLenB)
      var scriptLength = new Parser(sLenB).readVarInt()

      var sB = s.raw(scriptLength)
      doc.serialized.push(sB)
      data.script = new Script(sB.toString('hex'), isCoinbase)

      var seqB = s.raw(4)
      doc.serialized.push(seqB)
      data.sequence = new Parser(seqB).readUInt32LE()

      doc.ins.push(data)
    }

    var outB = s.readVarRaw()
    doc.serialized.push(outB)
    var outputCount = new Parser(outB).readVarInt()
    for (var i = 0; i < outputCount; i++) {
      var data = {}
      var value = s.raw(8)
      if (value === false) {
        return false
      }
      doc.serialized.push(value)

      data.value = binConv(value, {
        out: 'bytes'
      })

      var sLenB = s.readVarRaw()
      doc.serialized.push(sLenB)
      var scriptLength = new Parser(sLenB).readVarInt()

      var sB = s.raw(scriptLength)
      doc.serialized.push(sB)
      data.script = new Script(sB.toString('hex'))

      doc.outs.push(data)
    }

    var lockB = s.raw(4)
    doc.serialized.push(lockB)
    doc.lock_time = new Parser(lockB).readUInt32LE()

    // now we turn serialized into a buffer
    doc.serialized = binConv(Buffer.concat(doc.serialized), { in : 'buffer',
      out: 'bytes'
    })

    if (s.hasFailed) {
      return false
    } else {
      transactions.push(new Transaction(doc))
    }
  }

  if (s.hasFailed) {
    return false
  }

  if (txCount === 1) {
    return transactions[0]
  } else {
    return transactions
  }
}