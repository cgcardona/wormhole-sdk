"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _FindBiggestUtxo = require("./FindBiggestUtxo");

var _FindBiggestUtxo2 = _interopRequireDefault(_FindBiggestUtxo);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var CreateManagedToken = function () {
  function CreateManagedToken(Wormhole) {
    _classCallCheck(this, CreateManagedToken);

    this.Wormhole = Wormhole;
  }

  _createClass(CreateManagedToken, [{
    key: "createManagedToken",
    value: async function createManagedToken(hdNode, ecosystem, precision, predecessor, category, subcategory, ticker, url, description) {
      try {
        var cashAddress = this.Wormhole.HDNode.toCashAddress(hdNode);

        // Create the managed token.
        var managed = await this.Wormhole.PayloadCreation.managed(ecosystem, precision, predecessor, category, subcategory, ticker, url, description);

        // Get a utxo to use for this transaction.
        var u = await this.Wormhole.Address.utxo([cashAddress]);
        var utxo = new _FindBiggestUtxo2.default(u[0]);

        // Create a rawTx using the largest utxo in the wallet.
        utxo.value = utxo.amount;
        var rawTx = await this.Wormhole.RawTransactions.create([utxo], {});

        // Add the token information as an op-return code to the tx.
        var opReturn = await this.Wormhole.RawTransactions.opReturn(rawTx, managed);

        // Set the destination/recieving address, with the actual amount of BCH set to a minimal amount.
        var ref = await this.Wormhole.RawTransactions.reference(opReturn, cashAddress);

        // Generate a change output.
        var changeHex = await this.Wormhole.RawTransactions.change(ref, // Raw transaction we're working with.
        [utxo], // Previous utxo
        cashAddress, // Destination address.
        0.000005 // Miner fee.
        );

        var tx = this.Wormhole.Transaction.fromHex(changeHex);
        var tb = this.Wormhole.Transaction.fromTransaction(tx);

        // Finalize and sign transaction.
        var keyPair = this.Wormhole.HDNode.toKeyPair(hdNode);
        var redeemScript = void 0;
        tb.sign(0, keyPair, redeemScript, 0x01, utxo.satoshis);
        var builtTx = tb.build();
        var txHex = builtTx.toHex();

        // sendRawTransaction to running BCH node
        var broadcast = await this.Wormhole.RawTransactions.sendRawTransaction(txHex);
        var transaction = await this.Wormhole.DataRetrieval.transaction(broadcast);
        return transaction;
      } catch (error) {
        console.log(error.message);
      }
    }
  }]);

  return CreateManagedToken;
}();

exports.default = CreateManagedToken;