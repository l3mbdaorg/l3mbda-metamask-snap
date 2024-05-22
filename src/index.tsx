import type {
    OnCronjobHandler,
    OnHomePageHandler,
    OnRpcRequestHandler,
    OnUserInputHandler,
} from '@metamask/snaps-sdk'
import {
    assert,
    ManageStateOperation,
    UserInputEventType,
    heading,
    panel,
    text,
} from '@metamask/snaps-sdk'

import { EVENTS, EVENT_NAMES, FILTER_KEYS, type NewOracle, type Oracle } from './constants'
import { buildHome, showEventForm, showForm, showHome, showJwtForm, showNotifications } from './ui'

export const onHomePage: OnHomePageHandler = async () => {
    const interfaceId = await snap.request({
        method: 'snap_createInterface',
        params: {
            ui: await buildHome(),
        },
    })

    return { id: interfaceId }
}

/**
 * @param params - The event parameters.
 * @param params.id - The Snap interface ID where the event was fired.
 * @param params.event - The event object containing the event type, name and value.
 * @see https://docs.metamask.io/snaps/reference/exports/#onuserinput
 */
export const onUserInput: OnUserInputHandler = async ({ id, event }) => {
    if (event.type === UserInputEventType.ButtonClickEvent) {
        if (!event.name) {
            return
        }

        if (EVENTS.includes(event.name)) {
            const newOracle: NewOracle = {
                name: 'My Metamask Oracle',
                event: event.name,
            }

            const snapState = await snap.request({
                method: 'snap_manageState',
                params: {
                    operation: ManageStateOperation.GetState,
                },
            })

            await snap.request({
                method: 'snap_manageState',
                params: {
                    operation: ManageStateOperation.UpdateState,
                    newState: { ...snapState, oracle: newOracle },
                },
            })

            return showForm(id)
        }

        if (event.name === 'home') {
            return showHome(id)
        }

        if (event.name === 'add') {
            return showEventForm(id)
        }

        if (event.name === 'api-key') {
            return showJwtForm(id)
        }

        if (event.name.startsWith('delete-')) {
            const oracleId = event.name.slice('delete-'.length)

            if (!oracleId) {
                return
            }

            console.log('called delete for ', oracleId)

            const snapState = await snap.request({
                method: 'snap_manageState',
                params: {
                    operation: ManageStateOperation.GetState,
                },
            })

            assert(snapState?.jwt, 'No jwt found in Snap state.')
            const jwt = snapState.jwt as string

            await fetch(`${process.env.API_HOST}/api/oracles/${oracleId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jwt}`,
                },
            })

            await snap.request({
                method: 'snap_manageState',
                params: {
                    operation: ManageStateOperation.UpdateState,
                    newState: {
                        ...snapState,
                        oracles: (snapState?.oracles ?? []).filter(
                            (oracle: Oracle) => oracle.id !== oracleId
                        ),
                    },
                },
            })

            return showHome(id)
        }

        if (event.name.startsWith('logs-')) {
            const oracleId = event.name.slice('logs-'.length)

            if (!oracleId) {
                return
            }

            console.log('called logs for ', oracleId)

            return showNotifications(id, oracleId)
        }
    }

    if (event.type === UserInputEventType.FormSubmitEvent && event.name === 'new-oracle-form') {
        const filterData = event.value

        if (!filterData) {
            return showForm(id, { title: 'No Filters!', message: 'No filters provided.' })
        }

        if (Object.values(filterData).filter((value) => value !== '').length < 2) {
            return showForm(id, { title: 'Error', message: 'You must provide at least 2 filters.' })
        }

        const snapState = await snap.request({
            method: 'snap_manageState',
            params: {
                operation: ManageStateOperation.GetState,
            },
        })

        assert(snapState?.oracle, 'No oracle found in Snap state.')
        assert(snapState?.jwt, 'No jwt found in Snap state.')
        const jwt = snapState.jwt as string
        const oracle = snapState.oracle as NewOracle

        // console.log('snapState', snapState)
        // console.log('eventName', oracle.event)
        // console.log('oracle', snapState.oracle)
        // console.log(event.value)

        const filters: Record<string, string>[] = []
        for (const key of FILTER_KEYS) {
            if (key in event.value && event.value[key] !== '') {
                filters.push({
                    type: key,
                    value: event.value[key]!,
                })
            }
        }

        try {
            const r = await fetch(`${process.env.API_HOST}/api/oracles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jwt}`,
                },
                body: JSON.stringify({
                    name: oracle.name,
                    event: oracle.event,
                    filters: filters,
                    action: 'metamask',
                }),
            }).then((res) => res.json())

            if (r.serverError) {
                return showForm(id, { title: 'Error', message: r.serverError })
            }

            const newOracle: Oracle = {
                id: r.id,
                name: oracle.name,
                event: oracle.event,
                filters: filters,
                emoji: r.emoji,
                notifications: [],
            }

            await snap.request({
                method: 'snap_manageState',
                params: {
                    operation: ManageStateOperation.UpdateState,
                    newState: {
                        ...snapState,
                        oracles: [...(snapState?.oracles ?? []), newOracle],
                    },
                },
            })

            return showHome(id)
        } catch {
            return showForm(id, { title: 'Error', message: 'Could not create oracle.' })
        }
    }

    if (event.type === UserInputEventType.FormSubmitEvent && event.name === 'api-key-form') {
        const snapState = await snap.request({
            method: 'snap_manageState',
            params: {
                operation: ManageStateOperation.GetState,
            },
        })

        const { jwt: newJwt } = event.value

        if (!newJwt || newJwt === 'undefined' || newJwt === '') {
            console.log('no jwt')
            return
        }

        await snap.request({
            method: 'snap_manageState',
            params: {
                operation: ManageStateOperation.UpdateState,
                newState: { ...snapState, jwt: newJwt },
            },
        })

        return showJwtForm(id)

        // API call with action type = metamask (hono filters the response and sends ok if filters match, so we can scan by svix logs status)
        // Get back 200 response or error
        // Displays success screen or error
        // Store Oracle `endpoint_id`
        // Cron to scan every minute for 200 logs with `endpoint_id`

        // return showResult(id, JSON.stringify(newOracle, null, 2))
    }
}

export const onCronjob: OnCronjobHandler = async ({ request }) => {
    switch (request.method) {
        case 'execute': {
            const snapState = await snap.request({
                method: 'snap_manageState',
                params: {
                    operation: ManageStateOperation.GetState,
                },
            })

            if (!snapState?.jwt) {
                console.log('no jwt')
                return
            }

            const jwt = snapState.jwt as string
            const oracles = (snapState?.oracles ?? []) as unknown as Oracle[]

            for (const oracle of oracles) {
                console.log('updating oracle', oracle.id)

                const r = await fetch(`${process.env.API_HOST}/api/oracles/${oracle.id}/logs`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${jwt}`,
                    },
                })
                    .then((res) => res.json())
                    .then(({ logs }) =>
                        logs.map((l) => {
                            return {
                                ...l,
                                event: EVENT_NAMES[oracle.event as keyof typeof EVENT_NAMES],
                            }
                        })
                    )
                    .catch(console.error)

                if (r?.length) {
                    await snap.request({
                        method: 'snap_manageState',
                        params: {
                            operation: ManageStateOperation.UpdateState,
                            newState: {
                                ...snapState,
                                oracles: oracles.map((o) =>
                                    o.id === oracle.id ? { ...oracle, notifications: r } : o
                                ),
                            },
                        },
                    })

                    await snap.request({
                        method: 'snap_notify',
                        params: {
                            type: 'inApp',
                            message: `${oracle.name} just triggered!`,
                        },
                    })

                    await snap.request({
                        method: 'snap_notify',
                        params: {
                            type: 'native',
                            message: `${oracle.name} just triggered!`,
                        },
                    })
                }
            }

            return
        }

        default:
            throw new Error('Method not found.')
    }
}

export const onRpcRequest: OnRpcRequestHandler = async ({ origin, request }) => {
    switch (request.method) {
        case 'connect': {
            const { key: newJwt } = request.params as { key: string }

            if (!newJwt || newJwt === 'undefined' || newJwt === '') {
                return { error: 'empty jwt' }
            }

            await snap.request({
                method: 'snap_manageState',
                params: {
                    operation: ManageStateOperation.UpdateState,
                    newState: { jwt: newJwt },
                },
            })

            await snap.request({
                method: 'snap_dialog',
                params: {
                    type: 'alert',
                    content: panel([heading('Success!'), text('Connected successfully!')]),
                },
            })

            return { result: 'ok' }
        }

        default: {
            return { result: 'ok' }
        }
    }
}
