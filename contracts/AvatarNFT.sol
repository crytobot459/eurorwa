// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC721Receiver {
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data) external returns (bytes4);
}

contract AvatarNFT {
    string public constant name = "EuroRWA Avatar";
    string public constant symbol = "RWA";
    string private _uri;
    address public owner;

    mapping(uint256 => address) private _owners;
    mapping(uint256 => address) private _approved;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => bool)) private _operators;

    uint256 public totalSupply;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    constructor(string memory uri) {
        owner = msg.sender;
        _uri = uri;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    function tokenURI(uint256) public view returns (string memory) {
        return _uri;
    }

    function balanceOf(address a) public view returns (uint256) {
        return _balances[a];
    }

    function ownerOf(uint256 id) public view returns (address) {
        return _owners[id];
    }

    function approve(address to, uint256 id) public {
        address o = _owners[id];
        require(msg.sender == o || _operators[o][msg.sender], "not allowed");
        _approved[id] = to;
        emit Approval(o, to, id);
    }

    function setApprovalForAll(address op, bool v) public {
        _operators[msg.sender][op] = v;
        emit ApprovalForAll(msg.sender, op, v);
    }

    function getApproved(uint256 id) public view returns (address) {
        return _approved[id];
    }

    function isApprovedForAll(address o, address op) public view returns (bool) {
        return _operators[o][op];
    }

    function transferFrom(address from, address to, uint256 id) public {
        require(_isApprovedOrOwner(msg.sender, id), "not allowed");
        _transfer(from, to, id);
    }

    function safeTransferFrom(address from, address to, uint256 id) public {
        safeTransferFrom(from, to, id, "");
    }

    function safeTransferFrom(address from, address to, uint256 id, bytes memory data) public {
        require(_isApprovedOrOwner(msg.sender, id), "not allowed");
        _transfer(from, to, id);
        require(_checkOnERC721Received(from, to, id, data), "receiver not supported");
    }

    function mint(address to, uint256 id) public onlyOwner {
        require(_owners[id] == address(0), "exists");
        _owners[id] = to;
        _balances[to] += 1;
        totalSupply += 1;
        emit Transfer(address(0), to, id);
    }

    function _isApprovedOrOwner(address spender, uint256 id) internal view returns (bool) {
        address o = _owners[id];
        return spender == o || _approved[id] == spender || _operators[o][spender];
    }

    function _transfer(address from, address to, uint256 id) internal {
        require(_owners[id] == from, "wrong owner");
        _owners[id] = to;
        _balances[from] -= 1;
        _balances[to] += 1;
        _approved[id] = address(0);
        emit Transfer(from, to, id);
    }

    function _checkOnERC721Received(address from, address to, uint256 id, bytes memory data) internal returns (bool) {
        if (to.code.length == 0) return true;
        (bool ok, bytes memory ret) = to.call(
            abi.encodeWithSelector(IERC721Receiver.onERC721Received.selector, msg.sender, from, id, data)
        );
        return ok && ret.length == 32 && abi.decode(ret, (bytes4)) == IERC721Receiver.onERC721Received.selector;
    }
}
