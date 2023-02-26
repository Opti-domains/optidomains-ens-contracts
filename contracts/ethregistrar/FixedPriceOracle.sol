//SPDX-License-Identifier: MIT
pragma solidity ~0.8.17;

import "./IPriceOracle.sol";
import "./StringUtils.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

interface AggregatorInterface {
    function latestAnswer() external view returns (int256);
}

error NameTooShort();

// StablePriceOracle sets a price in USD, based on an oracle.
contract FixedPriceOracle is IPriceOracle {
    using StringUtils for *;

    // Rent in base price units by length
    uint256 public immutable rentPrice;

    event RentPriceChanged(uint256[] prices);

    constructor(uint256 _rentPrices) {
        rentPrice = _rentPrices;
    }

    function price(
        string calldata name,
        uint256 expires,
        uint256 duration
    ) external view override returns (IPriceOracle.Price memory) {
        uint256 len = name.strlen();
        uint256 basePrice = rentPrice;

        if (len < 3) revert NameTooShort();

        return
            IPriceOracle.Price({
                base: attoUSDToWei(basePrice),
                premium: attoUSDToWei(_premium(name, expires, duration))
            });
    }

    /**
     * @dev Returns the pricing premium in wei.
     */
    function premium(
        string calldata name,
        uint256 expires,
        uint256 duration
    ) external view returns (uint256) {
        return attoUSDToWei(_premium(name, expires, duration));
    }

    /**
     * @dev Returns the pricing premium in internal base units.
     */
    function _premium(
        string memory name,
        uint256 expires,
        uint256 duration
    ) internal view virtual returns (uint256) {
        return 0;
    }

    function attoUSDToWei(uint256 amount) internal view returns (uint256) {
        return amount;
    }

    function weiToAttoUSD(uint256 amount) internal view returns (uint256) {
        return amount;
    }

    function supportsInterface(
        bytes4 interfaceID
    ) public view virtual returns (bool) {
        return
            interfaceID == type(IERC165).interfaceId ||
            interfaceID == type(IPriceOracle).interfaceId;
    }
}
