// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title RWAAttestation
/// @notice Lưu dấu vết attestation dữ liệu RWA yield trên chuỗi: hash + chữ ký theo ngày
contract RWAAttestation {
    struct Attestation {
        bytes32 hash;
        bytes signature;
        string date;
        uint256 timestamp;
    }

    mapping(string => Attestation) public attestations;
    address public owner;

    event Attested(string indexed date, bytes32 hash, address indexed signer, uint256 timestamp);

    constructor() {
        owner = msg.sender;
    }

    function attest(string calldata date, bytes32 hash, bytes calldata signature) external {
        require(bytes(attestations[date].date).length == 0, "date already attested");
        attestations[date] = Attestation(hash, signature, date, block.timestamp);
        emit Attested(date, hash, msg.sender, block.timestamp);
    }

    function getHash(string calldata date) external view returns (bytes32) {
        return attestations[date].hash;
    }

    function getSigner(string calldata date) external view returns (address) {
        return attestations[date].timestamp == 0 ? address(0) : owner;
    }
}
