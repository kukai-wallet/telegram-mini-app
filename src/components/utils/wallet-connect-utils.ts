import { KUKAI_MOBILE_UNIVERSAL_LINK, PROVIDERS } from "@/model/constants";
import { WalletConnectModal } from "@walletconnect/modal";
import Client from "@walletconnect/sign-client";
import { getSdkError } from "@walletconnect/utils";
import { CLIENT_CONFIG } from "./wallet-connect";

export const NETWORK = "ghostnet"
export const KUKAI_DESKTOP_UNIVERSAL_LINK = "https://ghostnet.kukai.app"
const ACTIVE_PROVIDER_KEY = "ACTIVE_PROVIDER"

export const WalletConnectQRCodeModal = new WalletConnectModal({
    projectId: CLIENT_CONFIG.projectId,
    explorerExcludedWalletIds: 'ALL',
    themeMode: "dark",
    mobileWallets: [{
        name: "Kukai",
        id: "kukai-ej7a",
        links: {
            universal: KUKAI_MOBILE_UNIVERSAL_LINK,
            native: "kukai://",
        }
    }],
    desktopWallets: [{
        name: "Kukai",
        id: "kukai-ej7a",
        links: {
            universal: KUKAI_DESKTOP_UNIVERSAL_LINK,
            native: KUKAI_DESKTOP_UNIVERSAL_LINK,
        }
    }],
    walletImages: { "kukai-ej7a": "https://ghostnet.kukai.app/assets/img/header-logo1.svg" },
    chains: ["tezos"],
});

export function onSessionConnected(session: any) {
    const allNamespaceAccounts = Object.values(session.namespaces)
        .map((namespace: any) => namespace.accounts)
        .flat()
    const address = allNamespaceAccounts[0] ? allNamespaceAccounts[0].split(':')[2] : ''

    return address
}

/**
 * @deprecated this method no longer returns the public address
 */
export function getAddressFromSession(session: any) {
    const allNamespaceAccounts = Object.values(session.namespaces)
        .map((namespace: any) => namespace.accounts)
        .flat()

    return allNamespaceAccounts[0] ? allNamespaceAccounts[0].split(':')[2] : ''
}

export function getActiveSession(client: Client) {
    const lastKeyIndex = client.session.keys.length - 1
    return client.session.get(client.session.keys[lastKeyIndex])
}

export function getAllSessions(client: Client) {
    return client.session.keys.map(k => client.session.get(k))
}

export function formatAddress(address: string) {
    if (!address) {
        return 'None'
    }

    return `${address.slice(0, 7)}...${address.slice(-4)}`
}

export const CONNECT_PAYLOAD = {
    requiredNamespaces: {
        tezos: {
            chains: [`tezos:${NETWORK}`],
            events: [],
            methods: ["tezos_send", "tezos_sign"]
        }
    },
    optionalNamespaces: {
        tezos: {
            chains: [`tezos:${NETWORK}`],
            events: [],
            methods: ["tezos_send", "tezos_sign", "tezos_getAccounts"]
        }
    }
}

export function removeDeeplinkChoice() {
    try {
        const lsKey = 'WALLETCONNECT_DEEPLINK_CHOICE';
        const json = localStorage.getItem(lsKey);
        if (json) {
            const dl = JSON.parse(json);
            if (dl?.href?.startsWith('kukai')) {
                delete dl.href;
                localStorage.setItem(lsKey, JSON.stringify(dl))
            }
        }

    } catch (e) {
        console.warn(e)
    }
}

export async function connectAccount(client: Client, uri: string, approval: () => any): Promise<[string | undefined, string | undefined]> {
    let address, error, session

    try {
        if (uri) {
            await WalletConnectQRCodeModal.openModal({ uri })
            if (window.innerHeight < 740) {
                await new Promise(res => {
                    setTimeout(res, 150)
                })
                queueMicrotask(() => document.querySelector("wcm-modal")!.shadowRoot!.querySelector("wcm-modal-router")!.shadowRoot!.querySelector("wcm-connect-wallet-view")!.shadowRoot!.querySelector("wcm-desktop-wallet-selection")!.shadowRoot!.querySelector("wcm-modal-content")!.remove())
            }
        } else {
            const pairing = getActivePairing(client);
            const walletUrl = pairing?.peerMetadata?.url ?? 'undefined url';
            console.log(`%cSession request sent to: ${walletUrl}`, 'background: black; color: white');
        }

        try {
            session = await approval()
            WalletConnectQRCodeModal.closeModal()
            address = session.sessionProperties?.address
        } catch (e: any) {
            alert(e.message)
            error = e.message
        }
    } catch (e: any) {
        console.warn(e)
        error = e.message
    }
    try {
        const lsKey = 'WALLETCONNECT_DEEPLINK_CHOICE';
        const json = localStorage.getItem(lsKey);
        if (json) {
            const dl = JSON.parse(json);
            if (dl?.href?.startsWith('http')) {
                delete dl.href;
                localStorage.setItem(lsKey, JSON.stringify(dl))
            }
        }
    } catch (e) {
        console.warn(e)
    }

    // WalletConnectQRCodeModal.closeModal()
    return [address, error]
}

export function getActivePairing(client: Client) {
    const activePairings = client.core.pairing.getPairings().filter(o => o.active)
    return activePairings?.[activePairings.length - 1]
}

export async function disconnectWalletConnect(client: Client) {
    const sessions = getAllSessions(client)
    const pairings = client.core.pairing.getPairings()

    try {
        await Promise.all([
            ...pairings.map(({ topic }) => {
                return new Promise(resolve => {
                    try {
                        client.disconnect({
                            topic,
                            reason: getSdkError('USER_DISCONNECTED')
                        })
                    } catch (e) {
                        console.error(e);
                    } finally {
                        resolve(null)
                    }
                })
            }),
            ...sessions.map(({ topic }) => {
                return new Promise(resolve => {
                    try {
                        client.disconnect({
                            topic,
                            reason: getSdkError('USER_DISCONNECTED')
                        })
                    } catch (e) {
                        console.error(e);
                    } finally {
                        resolve(null)
                    }
                })
            }),
        ])
    } catch (e) {
        console.warn(e)
    }
}

export function getActiveProvider(): PROVIDERS {
    return localStorage.getItem(ACTIVE_PROVIDER_KEY) as PROVIDERS || PROVIDERS.KUKAI
}

export function setActiveProvider(provider: PROVIDERS) {
    localStorage.setItem(ACTIVE_PROVIDER_KEY, provider)
}