// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/**
 * @title AgentIdentity
 * @notice A name an agent cannot buy, sell, or fake: one soulbound token per
 *         agent address, minted by whoever operates the agent.
 *
 * Registration is permissionless. This is the deliberate difference from the
 * registries this project learned from, which gate minting behind an admin key
 * and so record only the agents one company chose to record. An identity that
 * a central party grants is a customer list, not an identity layer.
 *
 * The token is soulbound. An agent's history is the only thing that makes its
 * identity worth anything, and history does not survive a sale, so transfer is
 * refused rather than merely discouraged.
 */
contract AgentIdentity is ERC721 {
    uint256 private _nextId = 1;

    /// @notice Token id held by an agent address. Zero means unregistered.
    mapping(address => uint256) public tokenIdOf;
    /// @notice The human or contract that operates the agent behind a token.
    mapping(uint256 => address) public operatorOf;
    /// @notice Address the token was minted to, kept for reverse lookups.
    mapping(uint256 => address) public agentOf;

    /**
     * @notice secp256k1 public key the agent can be encrypted to, 64 bytes,
     *         uncompressed and without the 0x04 prefix.
     * @dev An EVM address is a hash of a public key, so it cannot be turned
     *      back into one. Sealing mail to an agent therefore needs the key
     *      itself published somewhere both parties already trust, and the
     *      identity record is that place.
     */
    mapping(uint256 => bytes) public encryptionKeyOf;

    mapping(uint256 => string) private _metadataURI;

    event IdentityRegistered(
        address indexed agent,
        uint256 indexed tokenId,
        address indexed operator,
        string metadataURI
    );
    event MetadataUpdated(uint256 indexed tokenId, string metadataURI);
    event EncryptionKeyPublished(uint256 indexed tokenId, bytes encryptionKey);
    event OperatorTransferred(uint256 indexed tokenId, address indexed from, address indexed to);

    error AlreadyRegistered(address agent);
    error NotRegistered(uint256 tokenId);
    error NotOperator(uint256 tokenId, address caller);
    error Soulbound();
    error ZeroAddress();
    error BadEncryptionKey(uint256 length);

    constructor() ERC721("Warrant Agent Identity", "AGENT") {}

    /**
     * @notice Mint the identity for `agent`. The caller becomes its operator.
     * @dev One per address, forever. Re-registering would orphan the history
     *      that gives the identity its meaning.
     */
    function register(address agent, string calldata metadataURI, bytes calldata encryptionKey)
        external
        returns (uint256 tokenId)
    {
        if (agent == address(0)) revert ZeroAddress();
        if (tokenIdOf[agent] != 0) revert AlreadyRegistered(agent);
        // An empty key is allowed: it means this agent does not accept sealed mail.
        if (encryptionKey.length != 0 && encryptionKey.length != 64) {
            revert BadEncryptionKey(encryptionKey.length);
        }

        tokenId = _nextId++;
        tokenIdOf[agent] = tokenId;
        operatorOf[tokenId] = msg.sender;
        agentOf[tokenId] = agent;
        _metadataURI[tokenId] = metadataURI;
        encryptionKeyOf[tokenId] = encryptionKey;

        _safeMint(agent, tokenId);
        emit IdentityRegistered(agent, tokenId, msg.sender, metadataURI);
        if (encryptionKey.length != 0) emit EncryptionKeyPublished(tokenId, encryptionKey);
    }

    /// @notice Publish or rotate the key others seal mail to.
    function setEncryptionKey(uint256 tokenId, bytes calldata encryptionKey) external {
        _requireOperator(tokenId);
        if (encryptionKey.length != 0 && encryptionKey.length != 64) {
            revert BadEncryptionKey(encryptionKey.length);
        }
        encryptionKeyOf[tokenId] = encryptionKey;
        emit EncryptionKeyPublished(tokenId, encryptionKey);
    }

    /// @notice The key to seal mail to `agent`, empty if it accepts none.
    function encryptionKeyFor(address agent) external view returns (bytes memory) {
        return encryptionKeyOf[tokenIdOf[agent]];
    }

    function setMetadata(uint256 tokenId, string calldata metadataURI) external {
        _requireOperator(tokenId);
        _metadataURI[tokenId] = metadataURI;
        emit MetadataUpdated(tokenId, metadataURI);
    }

    /// @notice Hand operation to another address. The token itself never moves.
    function transferOperator(uint256 tokenId, address to) external {
        _requireOperator(tokenId);
        if (to == address(0)) revert ZeroAddress();
        operatorOf[tokenId] = to;
        emit OperatorTransferred(tokenId, msg.sender, to);
    }

    function isRegistered(address agent) external view returns (bool) {
        return tokenIdOf[agent] != 0;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (agentOf[tokenId] == address(0)) revert NotRegistered(tokenId);
        return _metadataURI[tokenId];
    }

    function _requireOperator(uint256 tokenId) private view {
        if (agentOf[tokenId] == address(0)) revert NotRegistered(tokenId);
        if (operatorOf[tokenId] != msg.sender) revert NotOperator(tokenId, msg.sender);
    }

    /// @dev Mint is allowed; every later move is refused. See the contract note.
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address from)
    {
        from = _ownerOf(tokenId);
        if (from != address(0)) revert Soulbound();
        return super._update(to, tokenId, auth);
    }
}
