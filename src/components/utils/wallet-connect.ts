import Client from '@walletconnect/sign-client'
let isInitialized = false;

export const CLIENT_CONFIG = {
    projectId: '97f804b46f0db632c52af0556586a5f3',
    relayUrl: 'wss://relay.walletconnect.com',
    logger: 'debug',
    metadata: {
        name: 'Test Dapp',
        description: 'test',
        url: 'localhost',
        icons: ['https://t3.ftcdn.net/jpg/02/04/05/78/360_F_204057817_DeJaFeie5aXyRB1FyLenMFjPRcrI1yr4.jpg']
    }
}

export async function initWalletConnect() {
    if (isInitialized) {
        throw new Error('New instance cannot be created!!')
    }
    isInitialized = true
    try {
        const SignClient = await Client.init(CLIENT_CONFIG)
        return SignClient
    } catch (e) {
        isInitialized = false
        throw e
    }
}
