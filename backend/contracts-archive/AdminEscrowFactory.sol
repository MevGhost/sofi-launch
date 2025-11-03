// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AdminEscrow.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AdminEscrowFactory {
    address public admin;
    uint256 public feePercentage = 250; // 2.5%
    uint256 public constant MAX_FEE = 1000; // 10%
    
    mapping(address => bool) public isEscrow;
    mapping(address => address[]) public userEscrows;
    mapping(address => address[]) public kolEscrows;
    address[] public allEscrows;
    
    event EscrowCreated(
        address indexed escrow,
        address indexed project,
        address indexed kol,
        address token,
        uint256 totalAmount
    );
    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    
    error Unauthorized();
    error InvalidFee();
    error InvalidParameters();
    
    modifier onlyAdmin() {
        if (msg.sender != admin) revert Unauthorized();
        _;
    }
    
    constructor() {
        admin = msg.sender;
    }
    
    function createEscrow(
        address kol,
        address token,
        uint256 totalAmount,
        string[] memory titles,
        string[] memory descriptions,
        uint256[] memory amounts
    ) external returns (address escrow) {
        if (kol == address(0) || token == address(0)) revert InvalidParameters();
        if (totalAmount == 0) revert InvalidParameters();
        if (titles.length == 0 || titles.length != descriptions.length || titles.length != amounts.length) {
            revert InvalidParameters();
        }
        
        // Calculate platform fee
        uint256 platformFee = (totalAmount * feePercentage) / 10000;
        uint256 totalRequired = totalAmount + platformFee;
        
        // Check allowance
        IERC20 tokenContract = IERC20(token);
        require(tokenContract.allowance(msg.sender, address(this)) >= totalRequired, "Insufficient allowance");
        
        // Deploy new escrow
        escrow = address(new AdminEscrow(
            admin,
            msg.sender,
            kol,
            token,
            totalAmount,
            titles,
            descriptions,
            amounts
        ));
        
        // Transfer tokens from user to escrow
        tokenContract.transferFrom(msg.sender, escrow, totalAmount);
        
        // Transfer platform fee to factory
        if (platformFee > 0) {
            tokenContract.transferFrom(msg.sender, address(this), platformFee);
        }
        
        // Track escrow
        isEscrow[escrow] = true;
        userEscrows[msg.sender].push(escrow);
        kolEscrows[kol].push(escrow);
        allEscrows.push(escrow);
        
        emit EscrowCreated(escrow, msg.sender, kol, token, totalAmount);
    }
    
    function updateAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Invalid admin");
        address oldAdmin = admin;
        admin = newAdmin;
        emit AdminChanged(oldAdmin, newAdmin);
    }
    
    function updateFee(uint256 newFee) external onlyAdmin {
        if (newFee > MAX_FEE) revert InvalidFee();
        uint256 oldFee = feePercentage;
        feePercentage = newFee;
        emit FeeUpdated(oldFee, newFee);
    }
    
    function withdrawFees(address token) external onlyAdmin {
        IERC20(token).transfer(admin, IERC20(token).balanceOf(address(this)));
    }
    
    // View functions
    function getUserEscrows(address user) external view returns (address[] memory) {
        return userEscrows[user];
    }
    
    function getKOLEscrows(address kol) external view returns (address[] memory) {
        return kolEscrows[kol];
    }
    
    function getAllEscrows() external view returns (address[] memory) {
        return allEscrows;
    }
    
    function getEscrowCount() external view returns (uint256) {
        return allEscrows.length;
    }
}