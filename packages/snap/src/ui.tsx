import {
    assert,
    ButtonType,
    ManageStateOperation,
    type Panel,
    button,
    divider,
    form,
    heading,
    input,
    panel,
    row,
    text,
} from '@metamask/snaps-sdk'

import { EVENT_NAMES, type NewOracle, type Oracle, type OracleError } from './constants'

export async function buildHome() {
    const snapState = await snap.request({
        method: 'snap_manageState',
        params: {
            operation: ManageStateOperation.GetState,
        },
    })

    const jwt = snapState?.jwt

    if (!jwt) {
        const ui = panel([
            heading('Welcome to L3MBDA 👋'),
            text(
                'Open up [l3mbda.com](https://l3mbda.com/integrations) and connect your Metamask to get started!'
            ),
        ])

        return ui
    }

    const oracles = (snapState?.oracles ?? []) as unknown as Oracle[]

    if (oracles.length === 0) {
        const ui = panel([
            heading('🔮 L3MBDA'),
            button({ value: 'Create your first Oracle!', name: 'add' }),
        ])

        return ui
    }

    const oracleList = [] as Panel[]

    // biome-ignore lint/complexity/noForEach: <explanation>
    oracles.forEach((oracle: Oracle) => {
        // un panel nou pt fiecare oracle
        oracleList.push(
            panel([
                text(`${oracle.emoji} **${oracle.name}**`),
                row(
                    'Event',
                    text(EVENT_NAMES[oracle.event as keyof typeof EVENT_NAMES] ?? oracle.event)
                ),
                ...oracle.filters.map((filter) =>
                    row(
                        filter.type!.slice(0, 1).toUpperCase() + filter.type!.slice(1),
                        text(filter.value)
                    )
                ),
                row(
                    'Last Triggered',
                    text(
                        oracle.notifications?.[0]
                            ? new Date(oracle.notifications[0].createdAt).toLocaleString()
                            : 'N/A'
                    )
                ),
                button({ value: 'View Notifications', name: `logs-${oracle.id}` }),
                button({ value: 'Delete', variant: 'secondary', name: `delete-${oracle.id}` }),
            ])
        )
    })

    const ui = panel([
        button({ value: 'CREATE ✨', name: 'add' }),
        // button({ value: 'API Key', name: 'api-key' }),
        divider(),
        panel([heading('ORACLES'), ...oracleList]),
    ])

    return ui
}

export async function showHome(id: string) {
    await snap.request({
        method: 'snap_updateInterface',
        params: {
            id,
            ui: await buildHome(),
        },
    })
}

export async function showNotifications(id: string, oracleId: string) {
    const snapState = await snap.request({
        method: 'snap_manageState',
        params: {
            operation: ManageStateOperation.GetState,
        },
    })

    const oracles = (snapState?.oracles ?? []) as unknown as Oracle[]

    const oracle = oracles.find((o) => o.id === oracleId)

    if (!oracle) {
        return
    }

    await snap.request({
        method: 'snap_updateInterface',
        params: {
            id,
            ui: panel([
                heading(`${oracle.emoji} ${oracle.name}`),
                ...oracle.notifications
                    .slice(0, 10)
                    .map((notification) =>
                        row('Triggered', text(new Date(notification.createdAt).toLocaleString()))
                    ),
                button({ value: 'Go back', variant: 'secondary', name: 'home' }),
            ]),
        },
    })
}

export async function showForm(id: string, error?: OracleError) {
    const snapState = await snap.request({
        method: 'snap_manageState',
        params: {
            operation: ManageStateOperation.GetState,
        },
    })

    assert(snapState?.oracle, 'No oracle found in Snap state.')

    const oracle = snapState.oracle as NewOracle

    const type = oracle.event

    const inputs = [
        input({
            label: 'FROM (Address or ENS)',
            name: 'from',
            placeholder: 'eg. 0x...',
            value: '',
        }),
        input({
            label: 'TO (Address or ENS)',
            name: 'to',
            placeholder: 'eg. 0x...',
            value: '',
        }),
    ]

    switch (type) {
        case 'erc20-transfer': {
            inputs.push(
                input({
                    label: 'TOKEN (Address)',
                    name: 'token',
                    placeholder: 'eg. 0x...',
                    value: '',
                })
            )
            inputs.push(
                input({
                    label: 'AMOUNT (Minimum)',
                    name: 'amount',
                    placeholder: 'eg. 120.5',
                    inputType: 'number',
                    value: '',
                })
            )
            break
        }
        case 'native-transfer': {
            inputs.push(
                input({
                    label: 'AMOUNT (Minimum)',
                    name: 'amount',
                    placeholder: 'eg. 120.5',
                    inputType: 'number',
                    value: '',
                })
            )
            break
        }
        case 'erc721-transfer': {
            inputs.push(
                input({
                    label: 'TOKEN (Address)',
                    name: 'token',
                    placeholder: 'eg. 0x...',
                    value: '',
                })
            )
            inputs.push(
                input({
                    label: 'TOKEN ID',
                    name: 'tokenId',
                    placeholder: 'eg. 1278',
                    inputType: 'number',
                    value: '',
                })
            )
            break
        }
        case 'erc1155-transfer': {
            inputs.push(
                input({
                    label: 'TOKEN (Address)',
                    name: 'token',
                    placeholder: 'eg. 0x...',
                    value: '',
                })
            )
            inputs.push(
                input({
                    label: 'TOKEN ID',
                    name: 'tokenId',
                    placeholder: 'eg. 1278',
                    inputType: 'number',
                    value: '',
                })
            )
            inputs.push(
                input({
                    label: 'AMOUNT (Minimum)',
                    name: 'amount',
                    placeholder: 'eg. 120.5',
                    inputType: 'number',
                    value: '',
                })
            )
            break
        }
    }

    const bottomPanel = []

    if (error) {
        bottomPanel.push(text(error.message))
    }

    await snap.request({
        method: 'snap_updateInterface',
        params: {
            id,
            ui: panel([
                heading('Configure Your Oracle'),
                text('Add filters to configure your Oracle:'),
                form({
                    name: 'new-oracle-form',
                    children: [
                        ...inputs,
                        button({ value: 'CREATE', name: 'submit', buttonType: ButtonType.Submit }),
                        button({ value: 'Go back', name: 'add', variant: 'secondary' }),
                    ],
                }),
                ...bottomPanel,
            ]),
        },
    })
}

export async function showEventForm(id: string) {
    await snap.request({
        method: 'snap_updateInterface',
        params: {
            id,
            ui: panel([
                heading('Create New Oracle'),
                text('Please pick the event you want to subscribe to:'),
                button('ERC20 Transfer', ButtonType.Button, 'erc20-transfer'),
                button('Native Transfer', ButtonType.Button, 'native-transfer'),
                button('ERC721 Transfer', ButtonType.Button, 'erc721-transfer'),
                button('ERC1155 Transfer', ButtonType.Button, 'erc1155-transfer'),
                button({ value: 'Go back', variant: 'secondary', name: 'home' }),
            ]),
        },
    })
}

export async function showJwtForm(id: string) {
    const snapState = await snap.request({
        method: 'snap_manageState',
        params: {
            operation: ManageStateOperation.GetState,
        },
    })

    const jwt = snapState?.jwt as string | undefined

    await snap.request({
        method: 'snap_updateInterface',
        params: {
            id,
            ui: panel([
                heading('API Key'),
                form({
                    name: 'api-key-form',
                    children: [
                        input({
                            label: 'API Key',
                            name: 'jwt',
                            value: jwt,
                        }),
                        button({ value: 'Submit', name: 'submit', buttonType: ButtonType.Submit }),
                    ],
                }),
            ]),
        },
    })
}
