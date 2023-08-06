// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// address constant OP_TOKEN = 0x4200000000000000000000000000000000000042;

contract OptiTownRetroToken is ERC20, Ownable {
    using SafeERC20 for IERC20;

    address public immutable OP_TOKEN;

    mapping(address => bool) public operators;
    mapping(uint256 => uint256) public allocationIndexAmount;
    mapping(uint256 => address) public allocationIndexOwner;
    mapping(uint256 => bool) public redeemed;
    uint256 public allowedRedeemIndex = 0;

    constructor(
        address op
    ) ERC20(".town RetroDrop OP Ticket", "OPTI_TOWNRETRO") {
        _transferOwnership(0x8b6c27ec466923fad66Ada94c78AA320eA876969);
        OP_TOKEN = op;
    }

    modifier onlyOperator() {
        require(operators[msg.sender], "Not an operator");
        _;
    }

    function mint(
        address to,
        uint256 amount,
        uint256 allocationIndex
    ) public onlyOperator {
        require(allocationIndexAmount[allocationIndex] == 0, "Allocated");
        require(amount > 0, "Zero amount");
        _mint(to, amount);

        allocationIndexAmount[allocationIndex] = amount;
        allocationIndexOwner[allocationIndex] = to;
    }

    function setOperator(address operator, bool enabled) public onlyOwner {
        operators[operator] = enabled;
    }

    function _transfer(address, address, uint256) internal virtual override {
        require(false, "Soulbound");
    }

    event Redeem(
        address indexed redeemer,
        address indexed pool,
        uint256 amount
    );

    function redeemFrom(address pool, uint256 allocationIndex) public {
        require(allowedRedeemIndex > allocationIndex, "Locked");
        require(!redeemed[allocationIndex], "Already Redeemed");
        require(
            msg.sender == allocationIndexOwner[allocationIndex],
            "Impersonated"
        );

        uint256 amount = allocationIndexAmount[allocationIndex];

        _burn(msg.sender, amount);
        redeemed[allocationIndex] = true;

        IERC20(OP_TOKEN).safeTransferFrom(pool, msg.sender, amount);

        emit Redeem(msg.sender, pool, amount);
    }

    // Recovery module
    function recoverETH() public onlyOwner {
        address a = owner();
        (bool success, ) = a.call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }

    function recoverERC20(IERC20 token) public onlyOwner {
        token.safeTransfer(owner(), token.balanceOf(address(this)));
    }
}
