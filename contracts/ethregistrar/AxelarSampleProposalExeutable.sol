//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {IProposalExecutable} from "./AxelarProposalController.sol";

error ConditionsNotFulfilled();

contract AxelarSampleProposalExecutable is IProposalExecutable {
    function transfer1MAXL() internal {
        // Do something here
    }

    function execute(
        bytes32 proposalId,
        bytes32 conditionHash,
        bytes calldata data
    ) external payable {
        // Check if chomtana.axl, optidomains.axl, flipside.axl using conditionHash
        if (
            conditionHash !=
            0x730b6865379ae0ed5f9667f5255c42811c117016b53cf2f31210ac108c8e38bc
        ) {
            revert ConditionsNotFulfilled();
        }

        transfer1MAXL();
    }
}
