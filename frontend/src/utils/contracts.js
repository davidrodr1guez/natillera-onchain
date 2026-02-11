export const CUSD_ADDRESS = {
  42220: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
  44787: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1",
};

// UPDATE THIS after deploying the factory
export const FACTORY_ADDRESS = {
  42220: "0x0000000000000000000000000000000000000000",
  44787: "0x0000000000000000000000000000000000000000",
};

export const CUSD_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

export const FACTORY_ABI = [
  "function createNatillera(string calldata name, uint256 contributionAmount, uint8 frequency, uint256 maxMembers) external returns (address)",
  "function getNatilleraCount() external view returns (uint256)",
  "function getAllNatilleras() external view returns (address[])",
  "function getUserNatilleras(address user) external view returns (address[])",
  "function natilleras(uint256) external view returns (address)",
  "event GroupCreated(address indexed natillera, address indexed creator, string name, uint256 contributionAmount, uint8 frequency, uint256 maxMembers)",
];

export const NATILLERA_ABI = [
  "function name() view returns (string)",
  "function contributionAmount() view returns (uint256)",
  "function frequency() view returns (uint8)",
  "function maxMembers() view returns (uint256)",
  "function creator() view returns (address)",
  "function status() view returns (uint8)",
  "function currentRound() view returns (uint256)",
  "function totalRounds() view returns (uint256)",
  "function roundDeadline() view returns (uint256)",
  "function isMember(address) view returns (bool)",
  "function getMemberCount() view returns (uint256)",
  "function getMembers() view returns (tuple(address addr, bool hasReceivedPayout, uint256 collateralDeposited, uint256 payoutRound)[])",
  "function getPayoutOrder() view returns (uint256[])",
  "function getRoundInfo() view returns (uint256 round, uint256 startTime, uint256 deadline, uint256 contributions, address recipient)",
  "function hasContributedInRound(address member, uint256 round) view returns (bool)",
  "function join() external",
  "function contribute() external",
  "function forceAdvanceRound() external",
  "event MemberJoined(address indexed member, uint256 memberCount)",
  "event NatilleraStarted(uint256 startTime)",
  "event ContributionMade(address indexed member, uint256 round, uint256 amount)",
  "event PayoutSent(address indexed recipient, uint256 round, uint256 amount)",
  "event PenaltyApplied(address indexed member, uint256 round, uint256 collateralLost)",
  "event NatilleraCompleted()",
  "event CollateralReturned(address indexed member, uint256 amount)",
];
