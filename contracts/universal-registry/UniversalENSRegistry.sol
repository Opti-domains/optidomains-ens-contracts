//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "../registry/ENS.sol";
import "../resolvers/profiles/IAddrResolver.sol";
import "../resolvers/profiles/INameResolver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "hardhat/console.sol";

bytes32 constant lookup = 0x3031323334353637383961626364656600000000000000000000000000000000;
bytes32 constant ADDR_REVERSE_NODE = 0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2;
bytes32 constant SET_REGISTRY_MAPPING = keccak256(
    "UniversalENSRegistry.setRegistryMapping"
);
bytes32 constant SET_REVERSE_REGISTRY = keccak256(
    "UniversalENSRegistry.setReverseRegistry"
);

error InvalidSignature();
error NonceTooLow(uint256 nonce);
error InvalidReverseRegistry(address registry);
error ReverseRecordNotFound(address addr, address operator);

// Permissionless universal registry to resolve all ENS node regardless of the provider (ENS or Opti.Domains)
contract UniversalENSRegistry {
    using ECDSA for bytes32;

    mapping(address => address[]) public registryMapping;
    mapping(address => uint256) public currentNonce;
    mapping(address => uint256) public reverseNonce;
    mapping(address => ENS) public reverseRegistryMapping;

    function isContract(address _addr) internal view returns (bool) {
        return _addr.code.length > 0;
    }

    function ownsContract(address addr) internal view returns (bool) {
        try Ownable(addr).owner() returns (address owner) {
            return owner == msg.sender;
        } catch {
            return false;
        }
    }

    /**
     * @dev An optimised function to compute the sha3 of the lower-case
     *      hexadecimal representation of an Ethereum address.
     * @param addr The address to hash
     * @return ret The SHA3 hash of the lower-case hexadecimal encoding of the
     *         input address.
     */
    function sha3HexAddress(address addr) private pure returns (bytes32 ret) {
        assembly {
            for {
                let i := 40
            } gt(i, 0) {

            } {
                i := sub(i, 1)
                mstore8(i, byte(and(addr, 0xf), lookup))
                addr := div(addr, 0x10)
                i := sub(i, 1)
                mstore8(i, byte(and(addr, 0xf), lookup))
                addr := div(addr, 0x10)
            }

            ret := keccak256(0, 40)
        }
    }

    // ===================================================
    // UNIVERSAL REGISTRY RESOLVER
    // ===================================================

    event SetRegistryMapping(
        address indexed operator,
        uint256 indexed nonce,
        address[] registries
    );

    function setRegistryMapping(
        address operator,
        uint256 nonce,
        address[] memory registries,
        bytes calldata signature
    ) public {
        bytes32 digest = keccak256(
            abi.encodePacked(SET_REGISTRY_MAPPING, nonce, registries)
        ).toEthSignedMessageHash();

        if (nonce <= currentNonce[operator]) {
            revert NonceTooLow(nonce);
        }

        if (
            !SignatureChecker.isValidSignatureNow(operator, digest, signature)
        ) {
            // Try again with chain id requirement
            bytes32 digestWithChainId = keccak256(
                abi.encodePacked(
                    SET_REGISTRY_MAPPING,
                    block.chainid,
                    nonce,
                    registries
                )
            ).toEthSignedMessageHash();

            if (
                !SignatureChecker.isValidSignatureNow(
                    operator,
                    digestWithChainId,
                    signature
                )
            ) {
                revert InvalidSignature();
            }
        }

        currentNonce[operator] = nonce;
        registryMapping[operator] = registries;

        emit SetRegistryMapping(operator, nonce, registries);
    }

    // Will return the first registry on the chain the has a resolver set
    function getRegistry(
        address operator,
        bytes32 node
    ) public view returns (ENS registry) {
        unchecked {
            for (uint256 i; i < registryMapping[operator].length; ++i) {
                registry = ENS(registryMapping[operator][i]);
                if (isContract(address(registry))) {
                    if (registry.resolver(node) != address(0)) return registry;
                } else {
                    registry = getRegistry(address(registry), node);
                    if (address(registry) != address(0)) return registry;
                }
            }
        }

        registry = ENS(address(0));
    }

    function getResolver(
        address operator,
        bytes32 node
    ) public view returns (address) {
        return getRegistry(operator, node).resolver(node);
    }

    function getAddr(
        address operator,
        bytes32 node
    ) public view returns (address) {
        return IAddrResolver(getResolver(operator, node)).addr(node);
    }

    // ===================================================
    // REVERSE REGISTRAR
    // ===================================================

    event SetReverseRegistry(
        address indexed addr,
        address indexed registry,
        string name
    );

    function _getReverseNode(address addr) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(ADDR_REVERSE_NODE, sha3HexAddress(addr))
            );
    }

    function _setReverseRegistry(
        address addr,
        ENS registry,
        uint256 nonce
    ) internal {
        // Do basic checks
        if (nonce <= reverseNonce[addr]) {
            revert NonceTooLow(nonce);
        }

        bytes32 node = _getReverseNode(addr);

        if (!isContract(address(registry))) {
            revert InvalidReverseRegistry(address(registry));
        }

        address resolver = registry.resolver(node);
        string memory name = INameResolver(resolver).name(node);

        if (bytes(name).length == 0) {
            revert InvalidReverseRegistry(address(registry));
        }

        reverseRegistryMapping[addr] = registry;
        reverseNonce[addr] = nonce;

        emit SetReverseRegistry(addr, address(registry), name);
    }

    function setReverseRegistryForAddr(address addr, ENS registry) public {
        if (msg.sender != addr) {
            if (!ownsContract(addr)) {
                revert InvalidSignature();
            }
        }

        _setReverseRegistry(addr, registry, reverseNonce[addr] + 1);
    }

    function setReverseRegistry(ENS registry) public {
        setReverseRegistryForAddr(msg.sender, registry);
    }

    function setReverseRegistryWithSignature(
        address addr,
        ENS registry,
        uint256 nonce,
        uint256 expiry,
        bytes calldata signature
    ) public {
        if (expiry < block.timestamp) {
            revert InvalidSignature();
        }

        bytes32 digest = keccak256(
            abi.encodePacked(SET_REGISTRY_MAPPING, nonce, registry, expiry)
        ).toEthSignedMessageHash();

        if (!SignatureChecker.isValidSignatureNow(addr, digest, signature)) {
            // Try again with chain id requirement
            bytes32 digestWithChainId = keccak256(
                abi.encodePacked(
                    SET_REGISTRY_MAPPING,
                    block.chainid,
                    nonce,
                    registry,
                    expiry
                )
            ).toEthSignedMessageHash();

            if (
                !SignatureChecker.isValidSignatureNow(
                    addr,
                    digestWithChainId,
                    signature
                )
            ) {
                revert InvalidSignature();
            }
        }

        _setReverseRegistry(addr, registry, nonce);
    }

    function getName(
        address addr,
        address operator
    ) public view returns (string memory) {
        bytes32 node = _getReverseNode(addr);
        ENS registry = reverseRegistryMapping[addr];

        if (address(registry) != address(0) && isContract(address(registry))) {
            address resolver = registry.resolver(node);

            if (resolver != address(0) && isContract(resolver)) {
                try INameResolver(resolver).name(node) returns (
                    string memory name
                ) {
                    return name;
                } catch {}
            }
        }

        if (operator != address(0)) {
            address resolver = getResolver(operator, node);
            if (resolver != address(0) && isContract(resolver)) {
                try INameResolver(resolver).name(node) returns (
                    string memory name
                ) {
                    return name;
                } catch {}
            }
        }

        revert ReverseRecordNotFound(addr, operator);
    }
}
