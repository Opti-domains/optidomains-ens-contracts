//SPDX-License-Identifier: MIT
pragma solidity ~0.8.17;

import "./NameWrapper721.sol";

contract BoredDomains is NameWrapper721 {
    string public constant name = "Bored Domains";
    string public constant symbol = ".bored";
    string public constant contractURI =
        "https://metadata.opti.domains/collection/domains/bored";

    constructor(
        ENS _ens,
        IBaseRegistrar _registrar,
        IMetadataService _metadataService,
        string memory _ethNode
    ) NameWrapper721(_ens, _registrar, _metadataService, _ethNode) {}
}
