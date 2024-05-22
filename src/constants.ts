export const EVENTS = ['erc20-transfer', 'eth-transfer', 'erc721-transfer', 'erc1155-transfer']
export const FILTER_KEYS = ['from', 'to', 'token', 'amount', 'value']
export const EVENT_NAMES = {
    'erc20-transfer': 'ERC20 Transfer',
    'eth-transfer': 'ETH Transfer',
    'erc721-transfer': 'ERC721 Transfer',
    'erc1155-transfer': 'ERC1155 Transfer',
}

export interface OracleNotification {
    event: (typeof EVENTS)[number]
    payload?: Record<string, string>
    createdAt: string
}

export interface Oracle {
    id: string
    name: string
    event: (typeof EVENTS)[number]
    filters: Record<string, string>[]
    emoji: string
    notifications: OracleNotification[]
}

export interface OracleError {
    title: string
    message: string
}

// export interface SnapState {
//     oracles: Json
//     oracle?: Json
//     jwt?: string
// }

export interface NewOracle extends Omit<Oracle, 'notifications' | 'id' | 'filters' | 'emoji'> {}
