import { KukaiEmbed } from 'kukai-embed';
let isInitialized = false;

const KukaiEmbedClient = new KukaiEmbed({ net: "https://feature-redirect-uri.kukai-private.pages.dev", icon: false, enableLogging: false })

export async function initKukaiEmbedClient() {
    if (isInitialized) {
        throw new Error('New instance cannot be created!!')
    }
    isInitialized = true
    try {
        await KukaiEmbedClient.init()
        return KukaiEmbedClient
    } catch (e) {
        isInitialized = false
        throw e
    }
}
