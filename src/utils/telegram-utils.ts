export function getTelegramUser() {
    const userData = (window as any).Telegram?.WebView?.initParams?.tgWebAppData

    if (!userData) {
        return ''
    }

    const userEncoded = userData.match(/user=([^&]*)/)[1]

    const userDecoded = decodeURIComponent(userEncoded)
    const userObject = JSON.parse(userDecoded)

    const { first_name, last_name } = userObject

    return `${first_name} ${last_name}`
}