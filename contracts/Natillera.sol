// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Natillera is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Frequency { Weekly, Biweekly, Monthly }
    enum Status { Pending, Active, Completed, Cancelled }

    struct Member {
        address addr;
        bool hasReceivedPayout;
        uint256 collateralDeposited;
        uint256 payoutRound;
    }

    string public name;
    IERC20 public cUSD;
    uint256 public contributionAmount;
    Frequency public frequency;
    uint256 public maxMembers;
    address public creator;
    Status public status;

    Member[] public members;
    mapping(address => uint256) public memberIndex;
    mapping(address => bool) public isMember;

    uint256 public currentRound;
    uint256 public totalRounds;
    uint256 public roundStartTime;
    uint256 public roundDeadline;

    mapping(uint256 => mapping(address => bool)) public hasContributed;
    mapping(uint256 => uint256) public roundContributions;
    uint256[] public payoutOrder;

    event MemberJoined(address indexed member, uint256 memberCount);
    event NatilleraStarted(uint256 startTime);
    event ContributionMade(address indexed member, uint256 round, uint256 amount);
    event PayoutSent(address indexed recipient, uint256 round, uint256 amount);
    event PenaltyApplied(address indexed member, uint256 round, uint256 collateralLost);
    event NatilleraCompleted();
    event CollateralReturned(address indexed member, uint256 amount);

    modifier onlyMember() {
        require(isMember[msg.sender], "Not a member");
        _;
    }

    modifier onlyCreator() {
        require(msg.sender == creator, "Not the creator");
        _;
    }

    constructor(
        string memory _name,
        address _cUSD,
        uint256 _contributionAmount,
        Frequency _frequency,
        uint256 _maxMembers,
        address _creator
    ) {
        require(_contributionAmount > 0, "Amount must be > 0");
        require(_maxMembers >= 2, "Need at least 2 members");
        require(_cUSD != address(0), "Invalid cUSD address");

        name = _name;
        cUSD = IERC20(_cUSD);
        contributionAmount = _contributionAmount;
        frequency = _frequency;
        maxMembers = _maxMembers;
        creator = _creator;
        status = Status.Pending;
        totalRounds = _maxMembers;
    }

    function join() external nonReentrant {
        require(status == Status.Pending, "Not accepting members");
        require(!isMember[msg.sender], "Already a member");
        require(members.length < maxMembers, "Group is full");

        cUSD.safeTransferFrom(msg.sender, address(this), contributionAmount);

        memberIndex[msg.sender] = members.length;
        members.push(Member({
            addr: msg.sender,
            hasReceivedPayout: false,
            collateralDeposited: contributionAmount,
            payoutRound: 0
        }));
        isMember[msg.sender] = true;

        emit MemberJoined(msg.sender, members.length);

        if (members.length == maxMembers) {
            _startNatillera();
        }
    }

    function contribute() external nonReentrant onlyMember {
        require(status == Status.Active, "Not active");
        require(!hasContributed[currentRound][msg.sender], "Already contributed");
        require(block.timestamp <= roundDeadline, "Round deadline passed");

        cUSD.safeTransferFrom(msg.sender, address(this), contributionAmount);

        hasContributed[currentRound][msg.sender] = true;
        roundContributions[currentRound]++;

        emit ContributionMade(msg.sender, currentRound, contributionAmount);

        if (roundContributions[currentRound] == members.length) {
            _distributePayout();
        }
    }

    function forceAdvanceRound() external onlyCreator {
        require(status == Status.Active, "Not active");
        require(block.timestamp > roundDeadline, "Deadline not passed");

        _applyPenalties();
        _distributePayout();
    }

    function _startNatillera() internal {
        status = Status.Active;
        currentRound = 0;
        _generatePayoutOrder();
        _startNewRound();
        emit NatilleraStarted(block.timestamp);
    }

    function _generatePayoutOrder() internal {
        payoutOrder = new uint256[](members.length);
        for (uint256 i = 0; i < members.length; i++) {
            payoutOrder[i] = i;
        }

        // Shuffle using blockhash-based randomness
        for (uint256 i = members.length - 1; i > 0; i--) {
            uint256 j = uint256(keccak256(abi.encodePacked(
                block.timestamp,
                block.prevrandao,
                i
            ))) % (i + 1);
            (payoutOrder[i], payoutOrder[j]) = (payoutOrder[j], payoutOrder[i]);
        }

        for (uint256 i = 0; i < payoutOrder.length; i++) {
            members[payoutOrder[i]].payoutRound = i;
        }
    }

    function _startNewRound() internal {
        roundStartTime = block.timestamp;
        roundDeadline = block.timestamp + _frequencyToSeconds();
    }

    function _distributePayout() internal {
        uint256 recipientIdx = payoutOrder[currentRound];
        address recipient = members[recipientIdx].addr;
        uint256 payout = contributionAmount * members.length;

        members[recipientIdx].hasReceivedPayout = true;
        cUSD.safeTransfer(recipient, payout);
        emit PayoutSent(recipient, currentRound, payout);

        currentRound++;

        if (currentRound >= totalRounds) {
            _completeNatillera();
        } else {
            _startNewRound();
        }
    }

    function _applyPenalties() internal {
        for (uint256 i = 0; i < members.length; i++) {
            if (!hasContributed[currentRound][members[i].addr]) {
                uint256 collateral = members[i].collateralDeposited;
                if (collateral > 0) {
                    members[i].collateralDeposited = 0;
                    emit PenaltyApplied(members[i].addr, currentRound, collateral);
                }
            }
        }
    }

    function _completeNatillera() internal {
        status = Status.Completed;

        // Return collateral to members who kept paying
        for (uint256 i = 0; i < members.length; i++) {
            uint256 collateral = members[i].collateralDeposited;
            if (collateral > 0) {
                members[i].collateralDeposited = 0;
                cUSD.safeTransfer(members[i].addr, collateral);
                emit CollateralReturned(members[i].addr, collateral);
            }
        }

        emit NatilleraCompleted();
    }

    function _frequencyToSeconds() internal view returns (uint256) {
        if (frequency == Frequency.Weekly) return 7 days;
        if (frequency == Frequency.Biweekly) return 14 days;
        return 30 days;
    }

    // View functions

    function getMemberCount() external view returns (uint256) {
        return members.length;
    }

    function getMembers() external view returns (Member[] memory) {
        return members;
    }

    function getPayoutOrder() external view returns (uint256[] memory) {
        return payoutOrder;
    }

    function getCurrentRecipient() external view returns (address) {
        require(status == Status.Active, "Not active");
        return members[payoutOrder[currentRound]].addr;
    }

    function getRoundInfo() external view returns (
        uint256 round,
        uint256 startTime,
        uint256 deadline,
        uint256 contributions,
        address recipient
    ) {
        round = currentRound;
        startTime = roundStartTime;
        deadline = roundDeadline;
        contributions = roundContributions[currentRound];
        if (status == Status.Active && currentRound < totalRounds) {
            recipient = members[payoutOrder[currentRound]].addr;
        }
    }

    function hasContributedInRound(address member, uint256 round) external view returns (bool) {
        return hasContributed[round][member];
    }
}
