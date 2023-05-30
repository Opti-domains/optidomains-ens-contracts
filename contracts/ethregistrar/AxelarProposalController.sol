//SPDX-License-Identifier: MIT
pragma solidity ~0.8.17;

import {ENS} from "../registry/ENS.sol";
import {ITextResolver} from "../resolvers/profiles/ITextResolver.sol";

interface IProposalExecutable {
    function execute(bytes32 proposalId, bytes calldata data) external payable;
}

error InvalidRecord(string key, string value);
error ProposalExpired();

contract AxelarProposalController {
    ENS public immutable ens;

    struct ProposalCondition {
        bytes32 node;
        string key;
        string value;
    }

    struct ProposalAction {
        IProposalExecutable target;
        uint256 value;
        bytes data;
    }

    struct ProposalDetail {
        uint256 expiration;
        ProposalCondition[] conditions;
        ProposalAction[] actions;
    }

    constructor(ENS _ens) {
        ens = _ens;
    }

    function calculateProposalId(
        ProposalDetail calldata proposal
    ) public view returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    address(this),
                    block.chainid,
                    abi.encode(proposal)
                )
            );
    }

    event ExecuteProposal(
        bytes32 indexed proposalId,
        address indexed executor,
        uint256 value
    );

    function executeProposal(ProposalDetail calldata proposal) public payable {
        if (block.timestamp > proposal.expiration) {
            revert ProposalExpired();
        }

        unchecked {
            for (uint256 i; i < proposal.conditions.length; ++i) {
                ProposalCondition memory condition = proposal.conditions[i];
                ITextResolver resolver = ITextResolver(
                    ens.resolver(condition.node)
                );

                string memory value = resolver.text(
                    condition.node,
                    condition.key
                );

                if (
                    keccak256(bytes(value)) != keccak256(bytes(condition.value))
                ) {
                    revert InvalidRecord(condition.key, value);
                }
            }

            bytes32 proposalId = calculateProposalId(proposal);

            for (uint256 i; i < proposal.actions.length; ++i) {
                ProposalAction memory action = proposal.actions[i];
                action.target.execute{value: action.value}(
                    proposalId,
                    action.data
                );
            }

            emit ExecuteProposal(proposalId, msg.sender, msg.value);
        }
    }
}
