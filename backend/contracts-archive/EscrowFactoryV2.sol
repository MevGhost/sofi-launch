// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./EscrowFactory.sol";
import "./security/TimelockController.sol";
import "./security/MultiSigAdmin.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IEscrow.sol";

contract EscrowFactoryV2 is EscrowFactory {
    using Clones for address;
    using SafeERC20 for IERC20;
    // Security features
    bool public paused;
    bool public upgradesDisabled;
    uint256 public lastActionTime;
    uint256 public constant ACTION_COOLDOWN = 1 hours;
    
    address payable public timelockController;
    address payable public multiSigAdmin;
    
    // Rate limiting
    mapping(address => uint256) public lastUserAction;
    uint256 public constant USER_COOLDOWN = 5 minutes;
    
    // Events
    event Paused();
    event Unpaused();
    event UpgradesDisabled();
    event SecurityConfigured(address timelock, address multiSig);
    
    // Modifiers
    modifier whenNotPaused() {
        require(!paused, "Factory is paused");
        _;
    }
    
    modifier rateLimited() {
        require(
            block.timestamp >= lastUserAction[msg.sender] + USER_COOLDOWN,
            "Rate limit exceeded"
        );
        lastUserAction[msg.sender] = block.timestamp;
        _;
    }
    
    modifier adminActionCooldown() {
        require(
            block.timestamp >= lastActionTime + ACTION_COOLDOWN,
            "Admin action cooldown active"
        );
        lastActionTime = block.timestamp;
        _;
    }
    
    constructor(address _implementation) EscrowFactory(_implementation) {
        // Deploy timelock with 48 hour delay
        timelockController = payable(address(new TimelockController(address(this), 48 hours)));
        
        // Deploy multi-sig with current admin as sole signer initially
        address[] memory initialAdmins = new address[](1);
        initialAdmins[0] = msg.sender;
        multiSigAdmin = payable(address(new MultiSigAdmin(initialAdmins, 1)));
        
        emit SecurityConfigured(timelockController, multiSigAdmin);
    }
    
    // Override createEscrow to add security checks
    function createEscrow(
        address kol,
        address token,
        uint256 totalAmount,
        uint256[] calldata milestoneAmounts,
        uint256[] calldata releaseDates,
        address[] calldata verifiers,
        uint8 verificationThreshold
    ) external override whenNotPaused rateLimited nonReentrant returns (address escrow) {
        // Perform validation checks from parent
        if (kol == address(0) || token == address(0)) revert ZeroAddress();
        if (totalAmount == 0) revert InvalidParameters();
        if (milestoneAmounts.length == 0 || milestoneAmounts.length != releaseDates.length) {
            revert InvalidParameters();
        }
        if (verifiers.length > 0 && verificationThreshold == 0) {
            revert InvalidParameters();
        }
        if (verificationThreshold > verifiers.length) {
            revert InvalidParameters();
        }

        uint256 sum = 0;
        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            if (milestoneAmounts[i] == 0) revert InvalidParameters();
            if (i > 0 && releaseDates[i] <= releaseDates[i - 1]) {
                revert InvalidParameters();
            }
            sum += milestoneAmounts[i];
        }
        if (sum != totalAmount) revert InvalidParameters();

        uint256 platformFee = (totalAmount * feePercentage) / 10000;
        uint256 totalRequired = totalAmount + platformFee;

        IERC20 tokenContract = IERC20(token);
        uint256 allowance = tokenContract.allowance(msg.sender, address(this));
        if (allowance < totalRequired) revert InsufficientAllowance();

        escrow = implementation.clone();
        
        IEscrow(escrow).initialize(
            msg.sender,
            kol,
            token,
            totalAmount,
            milestoneAmounts,
            releaseDates,
            verifiers,
            verificationThreshold
        );

        tokenContract.safeTransferFrom(msg.sender, escrow, totalAmount);
        
        if (platformFee > 0) {
            tokenContract.safeTransferFrom(msg.sender, address(this), platformFee);
            collectedFees += platformFee;
        }

        isEscrow[escrow] = true;
        projectEscrows[msg.sender].push(escrow);
        kolEscrows[kol].push(escrow);
        allEscrows.push(escrow);

        emit EscrowCreated(escrow, msg.sender, kol, token, totalAmount);
    }
    
    // Override critical admin functions to use timelock
    function updateImplementation(address newImplementation) external override onlyAdmin {
        require(!upgradesDisabled, "Upgrades permanently disabled");
        
        // Queue through timelock
        bytes memory data = abi.encodeWithSignature(
            "updateImplementationDirect(address)", 
            newImplementation
        );
        
        TimelockController(timelockController).queueTransaction(
            address(this),
            0,
            data
        );
    }
    
    // Direct implementation update (only callable by timelock)
    function updateImplementationDirect(address newImplementation) external {
        require(msg.sender == timelockController, "Only timelock");
        require(!upgradesDisabled, "Upgrades permanently disabled");
        
        implementation = newImplementation;
        emit ImplementationUpdated(implementation, newImplementation);
    }
    
    // Override admin update to use multi-sig
    function updateAdmin(address newAdmin) external override onlyAdmin {
        // Must be called through multi-sig
        require(msg.sender == multiSigAdmin, "Only multi-sig");
        
        address oldAdmin = admin;
        admin = newAdmin;
        
        emit AdminChanged(oldAdmin, newAdmin);
    }
    
    // Security functions
    function pause() external onlyAdmin adminActionCooldown {
        paused = true;
        emit Paused();
    }
    
    function unpause() external onlyAdmin adminActionCooldown {
        paused = false;
        emit Unpaused();
    }
    
    function permanentlyDisableUpgrades() external onlyAdmin {
        require(msg.sender == multiSigAdmin, "Only multi-sig can disable upgrades");
        upgradesDisabled = true;
        emit UpgradesDisabled();
    }
    
    // Multi-sig management
    function configureMultiSig(address[] memory _admins, uint256 _threshold) external onlyAdmin {
        require(_admins.length >= 2, "Minimum 2 admins required");
        require(_threshold >= 2, "Minimum threshold is 2");
        
        // Add new admins to multi-sig
        for (uint256 i = 0; i < _admins.length; i++) {
            if (!MultiSigAdmin(multiSigAdmin).isAdmin(_admins[i])) {
                bytes memory data = abi.encodeWithSignature(
                    "addAdmin(address)", 
                    _admins[i]
                );
                MultiSigAdmin(multiSigAdmin).submitTransaction(
                    multiSigAdmin,
                    0,
                    data
                );
            }
        }
        
        // Update threshold
        bytes memory thresholdData = abi.encodeWithSignature(
            "updateThreshold(uint256)", 
            _threshold
        );
        MultiSigAdmin(multiSigAdmin).submitTransaction(
            multiSigAdmin,
            0,
            thresholdData
        );
    }
    
    // View functions
    function getSecurityConfig() external view returns (
        address _timelock,
        address _multiSig,
        bool _paused,
        bool _upgradesDisabled,
        uint256 _timelockDelay
    ) {
        return (
            timelockController,
            multiSigAdmin,
            paused,
            upgradesDisabled,
            TimelockController(timelockController).getDelay()
        );
    }
    
    // Allow receiving ETH for fee collection
    receive() external payable {}
}