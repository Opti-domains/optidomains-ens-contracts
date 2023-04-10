//SPDX-License-Identifier: MIT
pragma solidity ~0.8.17;

interface ITakeOverRegistrarController {
    function takeOver(
        string calldata name,
        address newOwner,
        bytes calldata signature
    ) external;
}
