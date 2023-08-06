//SPDX-License-Identifier: MIT
pragma solidity >=0.8.17 <0.9.0;

import "@ethereum-attestation-service/eas-contracts/contracts/resolver/SchemaResolver.sol";
import "@ethereum-attestation-service/eas-contracts/contracts/Common.sol";
import "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../ethregistrar/ISupporterPlan.sol";
import "./OptiTownRetroToken.sol";
import "../wrapper/INameWrapper.sol";

bytes32 constant TOWN_BASE_NODE = 0x4e64474f406bfb88babba9d48fc501844ea2246343195cdcfe2fb6b54571b71b;

address constant TOWN_REGISTRAR = 0xB02EDc247246ACD78294c62F403B3e64D5917031;
address constant TOWN_NAMEWRAPPER = 0xB02ED980693e14E082F0A3A33060046Ae8495EB2;

contract TownSupporterPlan is ISupporterPlan, SchemaResolver, Ownable {
    using SafeERC20 for IERC20;

    OptiTownRetroToken public immutable opti;
    mapping(bytes32 => uint256) public nodeRegistered;
    mapping(address => uint256) public walletRegistered;
    uint256 public mintIndex = 0;

    bytes32 public MINT_SCHEMA;
    bytes32 public MINT_FIRST_10000_SCHEMA;
    bytes32 public MINT_FIRST_2500_SCHEMA;

    constructor(IEAS _eas, OptiTownRetroToken _opti) SchemaResolver(_eas) {
        opti = _opti;
        _transferOwnership(0x8b6c27ec466923fad66Ada94c78AA320eA876969);
    }

    // Access control
    function setSchema(
        bytes32 mintSchema,
        bytes32 first10000,
        bytes32 first2500
    ) public onlyOwner {
        MINT_SCHEMA = mintSchema;
        MINT_FIRST_10000_SCHEMA = first10000;
        MINT_FIRST_2500_SCHEMA = first2500;
    }

    // EAS Resolver module

    /// @notice A resolver callback that should be implemented by child contracts.
    /// @param attestation The new attestation.
    /// @return Whether the attestation is valid.
    function onAttest(
        Attestation calldata attestation,
        uint256
    ) internal virtual override returns (bool) {
        return attestation.attester == address(this);
    }

    /// @notice Processes an attestation revocation and verifies if it can be revoked.
    /// @return Whether the attestation can be revoked.
    function onRevoke(
        Attestation calldata,
        uint256
    ) internal virtual override returns (bool) {
        return false;
    }

    // Supporter Plan module
    function buy(string memory name) external payable {
        // require(msg.sender == TOWN_REGISTRAR, "Forbidden");

        bytes32 labelHash = keccak256(bytes(name));
        bytes32 node = keccak256(abi.encodePacked(TOWN_BASE_NODE, labelHash));
        address owner = INameWrapper(TOWN_NAMEWRAPPER).ownerOf(uint256(node));

        if (
            owner != address(0) &&
            nodeRegistered[node] == 0 &&
            walletRegistered[owner] == 0
        ) {
            nodeRegistered[node] = ++mintIndex;
            walletRegistered[owner] = mintIndex;

            // Airdrop to early minter
            if (mintIndex <= 2500) {
                opti.mint(owner, 4 ether, mintIndex);
            }

            if (MINT_FIRST_2500_SCHEMA != bytes32(0)) {
                if (mintIndex <= 2500) {
                    _eas.attest(
                        AttestationRequest({
                            schema: MINT_FIRST_2500_SCHEMA,
                            data: AttestationRequestData({
                                recipient: owner,
                                expirationTime: 0,
                                revocable: false,
                                refUID: bytes32(0),
                                data: abi.encode(mintIndex),
                                value: 0
                            })
                        })
                    );
                }
            }

            if (MINT_FIRST_10000_SCHEMA != bytes32(0)) {
                if (mintIndex <= 10000) {
                    _eas.attest(
                        AttestationRequest({
                            schema: MINT_FIRST_10000_SCHEMA,
                            data: AttestationRequestData({
                                recipient: owner,
                                expirationTime: 0,
                                revocable: false,
                                refUID: bytes32(0),
                                data: abi.encode(mintIndex),
                                value: 0
                            })
                        })
                    );
                }
            }

            if (MINT_SCHEMA != bytes32(0)) {
                _eas.attest(
                    AttestationRequest({
                        schema: MINT_SCHEMA,
                        data: AttestationRequestData({
                            recipient: owner,
                            expirationTime: 0,
                            revocable: false,
                            refUID: bytes32(0),
                            data: abi.encode(mintIndex),
                            value: 0
                        })
                    })
                );
            }
        }
    }

    // Withdraw module
    function withdrawETH() public onlyOwner {
        address a = owner();
        (bool success, ) = a.call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }

    function withdrawERC20(IERC20 token) public onlyOwner {
        token.safeTransfer(owner(), token.balanceOf(address(this)));
    }
}
