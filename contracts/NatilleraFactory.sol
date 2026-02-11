// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Natillera.sol";

contract NatilleraFactory {
    address public cUSD;
    Natillera[] public natilleras;

    mapping(address => address[]) public userNatilleras;

    event GroupCreated(
        address indexed natillera,
        address indexed creator,
        string name,
        uint256 contributionAmount,
        Natillera.Frequency frequency,
        uint256 maxMembers
    );

    constructor(address _cUSD) {
        require(_cUSD != address(0), "Invalid cUSD address");
        cUSD = _cUSD;
    }

    function createNatillera(
        string calldata _name,
        uint256 _contributionAmount,
        Natillera.Frequency _frequency,
        uint256 _maxMembers
    ) external returns (address) {
        Natillera natillera = new Natillera(
            _name,
            cUSD,
            _contributionAmount,
            _frequency,
            _maxMembers,
            msg.sender
        );

        address natilleraAddr = address(natillera);
        natilleras.push(natillera);
        userNatilleras[msg.sender].push(natilleraAddr);

        emit GroupCreated(
            natilleraAddr,
            msg.sender,
            _name,
            _contributionAmount,
            _frequency,
            _maxMembers
        );

        return natilleraAddr;
    }

    function getNatilleraCount() external view returns (uint256) {
        return natilleras.length;
    }

    function getAllNatilleras() external view returns (Natillera[] memory) {
        return natilleras;
    }

    function getUserNatilleras(address user) external view returns (address[] memory) {
        return userNatilleras[user];
    }

    function trackMembership(address user, address natilleraAddr) external {
        // Only callable by a Natillera contract created by this factory
        bool isValid = false;
        for (uint256 i = 0; i < natilleras.length; i++) {
            if (address(natilleras[i]) == msg.sender) {
                isValid = true;
                break;
            }
        }
        require(isValid, "Not a valid natillera");
        userNatilleras[user].push(natilleraAddr);
    }
}
