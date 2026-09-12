#!/usr/bin/env bash
#
# Proves the on-chain half without spending testnet funds.
#
# Deploys the three contracts to a local chain, funds an agent with a five
# dollar lifetime cap and a one dollar daily cap, lets it draw, then shows the
# chain refusing the next draw. Everything here is the real contract code; only
# the network is local.
#
#   ./scripts/local-chain.sh
#
set -euo pipefail

RPC=http://localhost:8545
# Anvil's first two accounts. Well-known public test keys, safe to commit.
OWNER_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
OWNER=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
AGENT_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
AGENT=0x70997970C51812dc3A010C7d01b50e0d17dc79C8

say() { printf '\n\033[38;5;179m%s\033[0m\n' "$*"; }
note() { printf '  \033[2m%s\033[0m\n' "$*"; }

command -v anvil >/dev/null || { echo "anvil not found. Install Foundry: https://getfoundry.sh"; exit 1; }

say "starting a local chain"
pkill -f "anvil --silent --port 8545" 2>/dev/null || true
anvil --silent --port 8545 >/dev/null 2>&1 &
ANVIL_PID=$!
trap 'kill $ANVIL_PID 2>/dev/null || true' EXIT
until cast block-number --rpc-url $RPC >/dev/null 2>&1; do sleep 0.3; done
note "anvil on $RPC"

cd "$(dirname "$0")/../contracts"

say "deploying"
USDC=$(forge create src/MockUSDC.sol:MockUSDC --rpc-url $RPC --private-key $OWNER_KEY --broadcast --json \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['deployedTo'])")
note "MockUSDC      $USDC"

OUT=$(USDC_ADDRESS=$USDC PUBLIC_URL=http://localhost:8090 \
  forge script script/Deploy.s.sol --rpc-url $RPC --private-key $OWNER_KEY --broadcast 2>&1)
IDENTITY=$(echo "$OUT" | grep -oE 'IDENTITY_CONTRACT=0x[0-9a-fA-F]+' | cut -d= -f2)
MARKET=$(echo "$OUT" | grep -oE 'MARKET_CONTRACT=0x[0-9a-fA-F]+' | cut -d= -f2)
TREASURY=$(echo "$OUT" | grep -oE 'TREASURY_CONTRACT=0x[0-9a-fA-F]+' | cut -d= -f2)
note "AgentIdentity  $IDENTITY"
note "ResourceMarket $MARKET  (8 listings seeded)"
note "AgentTreasury  $TREASURY"

cd ..

say "funding the agent: \$5 lifetime, \$1 a day, inference and email only"
cast send "$USDC" "mint(address,uint256)" $OWNER 100000000 \
  --rpc-url $RPC --private-key $OWNER_KEY >/dev/null
HEDERA_JSON_RPC_URL=$RPC EVM_CHAIN_ID=31337 \
TREASURY_CONTRACT=$TREASURY MARKET_CONTRACT=$MARKET OWNER_PRIVATE_KEY=$OWNER_KEY \
  npx tsx scripts/fund.ts --agent $AGENT --amount 5 --cap 5 --per day --window 1 \
    --kinds inference,email.send | sed 's/^/ /'

budget() {
  cast call "$TREASURY" 'remaining(address)(uint256,uint256,uint64)' $AGENT --rpc-url $RPC \
    | head -2 | tr '\n' ' ' | sed -E 's/\[[^]]*\]//g'
}

say "the agent draws for 50 inference calls, asking nobody"
cast send "$TREASURY" "draw(uint256,uint32)" 2 50 --rpc-url $RPC --private-key $AGENT_KEY >/dev/null
note "agent now holds $(cast call "$USDC" 'balanceOf(address)(uint256)' $AGENT --rpc-url $RPC | sed -E 's/\[[^]]*\]//g') atomic USDC"
note "remaining (lifetime, window): $(budget)"

say "it tries once more, and the chain says no"
set +e
ERR=$(cast send "$TREASURY" "draw(uint256,uint32)" 2 1 --rpc-url $RPC --private-key $AGENT_KEY 2>&1 \
  | grep -oE 'data: "0x[0-9a-f]+"' | grep -oE '0x[0-9a-f]+')
set -e
printf '  \033[38;5;167mWindowCapExceeded\033[0m\n'
cast decode-error --sig "WindowCapExceeded(uint256,uint256,uint64)" "$ERR" \
  | sed -E 's/\[[^]]*\]//g' | tr -d ' ' | paste -d' ' - - - \
  | python3 -c 'import sys,datetime
w, r, t = sys.stdin.read().split()
when = datetime.datetime.fromtimestamp(int(t), datetime.timezone.utc).isoformat()
print(f"    wanted {w} atomic, remaining {r}, reopens at {when}")'

say "and it cannot buy a kind the policy never allowed"
set +e
ERR=$(cast send "$TREASURY" "draw(uint256,uint32)" 6 1 --rpc-url $RPC --private-key $AGENT_KEY 2>&1 \
  | grep -oE 'data: "0x[0-9a-f]+"' | grep -oE '0x[0-9a-f]+')
set -e
printf '  \033[38;5;167mKindNotAllowed\033[0m\n'
note "  $(cast decode-error --sig 'KindNotAllowed(bytes32)' "$ERR")"
note "  keccak(\"memory.write\") = $(cast keccak 'memory.write')"

say "done. no human approved anything; the arithmetic was the only gate."
echo
