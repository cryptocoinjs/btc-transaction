var Script = require('btc-script');

module.exports = TransactionIn;

function TransactionIn(data) {
  // if prevout hash is null
  // then this is a coinbase transaction
  // Note: we can never have a null hash, this makes serilization of the transaction impossible
  if (!data.outpoint) {
    data.outpoint = {}
  }

  if (!data.outpoint.hash) {
    data.outpoint.hash = '0000000000000000000000000000000000000000000000000000000000000000'
    data.outpoint.index = -1
  }

  this.outpoint = data.outpoint;

  if (data.script instanceof Script) {
    this.script = data.script;
  } else {
    if (data.scriptSig) {
      this.script = Script.fromScriptSig(data.scriptSig);
    } else {
      this.script = new Script(data.script);
    }
  }
  this.sequence = data.sequence;
}

TransactionIn.prototype.clone = function() {
  var newTxin = new TransactionIn({
    outpoint: {
      hash: this.outpoint.hash,
      index: this.outpoint.index
    },
    script: this.script.clone(),
    sequence: this.sequence
  });
  return newTxin;
}
