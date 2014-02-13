var Script = require('btc-script');
var BigInteger = require('bigi');
var conv = require('binstring');

module.exports = TransactionOut;

function TransactionOut(data) {
  if (data.script instanceof Script) {
    this.script = data.script;
  } else {
    if (data.scriptPubKey) {
      this.script = Script.fromScriptSig(data.scriptPubKey);
    } else {
      this.script = new Script(data.script);
    }
  }

  if (Array.isArray(data.value)) {
    this.value = data.value;
  } else if ("string" == typeof data.value) {
    var valueHex = (new BigInteger(data.value, 10)).toString(16);
    while (valueHex.length < 16) valueHex = "0" + valueHex;
    this.value = conv(valueHex, {in: 'hex', out: 'bytes'}).reverse();
  }
};

TransactionOut.prototype.clone = function() {
  var newTxout = new TransactionOut({
    script: this.script.clone(),
    value: this.value.slice(0)
  });
  return newTxout;
};