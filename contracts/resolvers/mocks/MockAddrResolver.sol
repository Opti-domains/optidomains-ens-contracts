pragma solidity ^0.8.4;

import "../profiles/AddrResolver.sol";

contract MockAddrResolver is AddrResolver {
    function isAuthorised(
        bytes32 node
    ) internal view virtual override returns (bool) {
        return true;
    }
}
