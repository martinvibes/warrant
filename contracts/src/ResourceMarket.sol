// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ResourceMarket
 * @notice The catalogue an agent shops from: who sells what, at what price,
 *         and which URL to send the money to.
 *
 * Listing is permissionless. The registries this project learned from put an
 * admin key in front of listing, which means an agent browsing the catalogue is
 * really browsing one company's inventory and has to trust that company's API
 * to tell it the truth about the price. Here the price an agent reads is the
 * price the seller published on chain, and reading it requires nobody's
 * permission and nobody's uptime.
 *
 * The market moves no money. It is a price list, and settlement happens off
 * chain over x402 at the listed endpoint. Keeping the two apart means a seller
 * can change price without touching anyone's funds, and a buyer can verify a
 * price without spending gas.
 */
contract ResourceMarket {
    struct Listing {
        uint256 id;
        address seller;
        /// @dev keccak256 of the kind name, so listings of a kind can be indexed.
        bytes32 kind;
        string kindName;
        /// @dev HTTPS URL that answers 402 with x402 payment terms.
        string endpoint;
        /// @dev Token settlement is denominated in, as an EVM address.
        address asset;
        /// @dev Price for one call, in the asset's smallest unit.
        uint256 price;
        bool active;
    }

    uint256 private _nextId = 1;

    mapping(uint256 => Listing) private _listings;
    mapping(bytes32 => uint256[]) private _byKind;
    mapping(address => uint256[]) private _bySeller;

    event Listed(
        uint256 indexed id,
        address indexed seller,
        bytes32 indexed kind,
        string kindName,
        string endpoint,
        address asset,
        uint256 price
    );
    event PriceChanged(uint256 indexed id, uint256 oldPrice, uint256 newPrice);
    event ActiveChanged(uint256 indexed id, bool active);
    event EndpointChanged(uint256 indexed id, string endpoint);

    error NotFound(uint256 id);
    error NotSeller(uint256 id, address caller);
    error EmptyKind();
    error EmptyEndpoint();

    /// @notice Publish something for sale. Anyone may call this.
    function list(
        string calldata kindName,
        string calldata endpoint,
        address asset,
        uint256 price
    ) external returns (uint256 id) {
        if (bytes(kindName).length == 0) revert EmptyKind();
        if (bytes(endpoint).length == 0) revert EmptyEndpoint();

        bytes32 kind = keccak256(bytes(kindName));
        id = _nextId++;

        _listings[id] = Listing({
            id: id,
            seller: msg.sender,
            kind: kind,
            kindName: kindName,
            endpoint: endpoint,
            asset: asset,
            price: price,
            active: true
        });
        _byKind[kind].push(id);
        _bySeller[msg.sender].push(id);

        emit Listed(id, msg.sender, kind, kindName, endpoint, asset, price);
    }

    function setPrice(uint256 id, uint256 price) external {
        Listing storage l = _requireSeller(id);
        emit PriceChanged(id, l.price, price);
        l.price = price;
    }

    function setActive(uint256 id, bool active) external {
        Listing storage l = _requireSeller(id);
        l.active = active;
        emit ActiveChanged(id, active);
    }

    function setEndpoint(uint256 id, string calldata endpoint) external {
        if (bytes(endpoint).length == 0) revert EmptyEndpoint();
        Listing storage l = _requireSeller(id);
        l.endpoint = endpoint;
        emit EndpointChanged(id, endpoint);
    }

    function get(uint256 id) external view returns (Listing memory) {
        if (_listings[id].seller == address(0)) revert NotFound(id);
        return _listings[id];
    }

    function exists(uint256 id) external view returns (bool) {
        return _listings[id].seller != address(0);
    }

    function total() external view returns (uint256) {
        return _nextId - 1;
    }

    function kindId(string calldata kindName) external pure returns (bytes32) {
        return keccak256(bytes(kindName));
    }

    function idsByKind(bytes32 kind) external view returns (uint256[] memory) {
        return _byKind[kind];
    }

    function idsBySeller(address seller) external view returns (uint256[] memory) {
        return _bySeller[seller];
    }

    /**
     * @notice Cheapest active listing of a kind, which is the query an agent
     *         shopping for one call actually has.
     * @return id Zero when nothing of that kind is for sale.
     */
    function cheapest(bytes32 kind) external view returns (uint256 id, uint256 price) {
        uint256[] storage ids = _byKind[kind];
        for (uint256 i = 0; i < ids.length; i++) {
            Listing storage l = _listings[ids[i]];
            if (!l.active) continue;
            if (id == 0 || l.price < price) {
                id = l.id;
                price = l.price;
            }
        }
    }

    function _requireSeller(uint256 id) private view returns (Listing storage l) {
        l = _listings[id];
        if (l.seller == address(0)) revert NotFound(id);
        if (l.seller != msg.sender) revert NotSeller(id, msg.sender);
    }
}
