//SPDX-License-Identifier: MIT
pragma solidity ~0.8.17;

import "./NameWrapper721.sol";
import "../ethregistrar/ITakeOverRegistrarController.sol";

error NotTakeOverRegistrarController();

contract BoredDomains is NameWrapper721 {
    string public constant name = "Bored Domains";
    string public constant symbol = ".bored";
    string public constant contractURI =
        "https://metadata.opti.domains/collection/domains/bored";

    ITakeOverRegistrarController private immutable takeOverRegistrar;

    constructor(
        ENS _ens,
        IBaseRegistrar _registrar,
        IMetadataService _metadataService,
        ITakeOverRegistrarController _takeOverRegistrar,
        string memory _ethNode
    ) NameWrapper721(_ens, _registrar, _metadataService, _ethNode) {
        takeOverRegistrar = _takeOverRegistrar;
    }

    function takeOver(uint256 tokenId, address newOwner) public {
        if (msg.sender != address(takeOverRegistrar)) {
            revert NotTakeOverRegistrarController();
        }

        (, uint32 fuses, uint64 expiry) = getData(tokenId);
        _setData(tokenId, newOwner, fuses, expiry);
    }
}
