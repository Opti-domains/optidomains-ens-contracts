//SPDX-License-Identifier: MIT
pragma solidity ~0.8.17;

import "./NameWrapper.sol";

contract NameWrapperERC721 is NameWrapper {
    constructor(
        ENS _ens,
        IBaseRegistrar _registrar,
        IMetadataService _metadataService,
        string memory _ethNode
    ) NameWrapper(_ens, _registrar, _metadataService, _ethNode) {}
}
