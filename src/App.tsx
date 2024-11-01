import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from "@/components/ui/drawer"
import { ReloadIcon } from "@radix-ui/react-icons"
import { Fragment, useCallback, useEffect, useRef, useState } from 'react'

import { useAppKit, useAppKitAccount } from "@reown/appkit/react"
import { useTonAddress, useTonConnectUI, useTonWallet } from "@tonconnect/ui-react"
import { SignClient } from "@walletconnect/sign-client/dist/types/client"
import { KukaiEmbed } from "kukai-embed"
import './App.css'
import { EmailIcon } from "./assets/icons/Icons"
import { TezosConnectModal } from "./components/tezos-connect/TezosConnectModal"
import UserCard from "./components/user/UserCard"
import { initKukaiEmbedClient } from "./components/utils/kukai-embed"
import { isOniOS } from "./components/utils/mobile-utils"
import { initWalletConnect } from "./components/utils/wallet-connect"
import { connectAccount, disconnectWalletConnect, formatAddress, getActivePairing, getActiveSession, getAddressFromSession, removeDeeplinkChoice, setActiveProvider, setPlatformChoice, WalletConnectQRCodeModal } from "./components/utils/wallet-connect-utils"
import { ASSETS, KUKAI_MOBILE_UNIVERSAL_LINK, PROVIDERS } from "./model/constants"
import { getTelegramUser } from "./utils/telegram-utils"

enum APP_STATE {
  INITIALIING,
  LOADING,
  READY,
}

const WALLET_CONNECT_PROVIDERS = new Set([PROVIDERS.KUKAI, PROVIDERS.WALLET_CONNECT])

const SHOW_PROVIDERS = {
  [PROVIDERS.KUKAI_EMBED]: false,
  [PROVIDERS.WALLET_CONNECT]: true,
  [PROVIDERS.TON_CONNECT]: true,
  [PROVIDERS.REOWN]: true,
  [PROVIDERS.KUKAI]: true,
  [PROVIDERS.TEZOS_CONNECT]: true,
}

interface User {
  address: string
  iconURL: string
  name: string
  provider: PROVIDERS
}


let hasAttemptedInit = false;

function App() {
  const [inTezosConnect, setInTezosConnect] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [appState, setAppState] = useState(APP_STATE.INITIALIING)
  const [provider, setProvider] = useState(PROVIDERS.KUKAI_EMBED)

  const kukaiEmbedClient = useRef<KukaiEmbed>()
  const walletConnectClient = useRef<SignClient>()
  const walletConnectSession = useRef({ uri: "", approval: (): any => { } })

  const [tonConnectUI] = useTonConnectUI()
  const tonWallet = useTonWallet()
  const tonAddress = useTonAddress()
  const appKit = useAppKit()
  const appKitAccount = useAppKitAccount()

  const showKukaiIOSButton = isOniOS()

  useEffect(() => {
    if (tonWallet?.account?.address) {
      setUser({ address: formatAddress(tonAddress), name: formatAddress(tonAddress), provider: PROVIDERS.TON_CONNECT, iconURL: "https://wallet.tonkeeper.com/img/toncoin.svg" })
      setProvider(PROVIDERS.TON_CONNECT)
    }
  }, [tonWallet, tonAddress])

  useEffect(() => {
    if (!appKitAccount.isConnected && provider === PROVIDERS.REOWN) {
      setUser(null)
      setProvider(PROVIDERS.KUKAI_EMBED)
    }
    if (appKitAccount.isConnected) {
      setUser({ address: formatAddress(appKitAccount.address!), name: formatAddress(appKitAccount.address!), provider: PROVIDERS.REOWN, iconURL: "" })
      setProvider(PROVIDERS.REOWN)
    }
  }, [appKitAccount.isConnected, appKitAccount.address, provider])


  const handleInit = async () => {
    const [KukaiEmbedClient, WalletConnectClient] = await Promise.all([initKukaiEmbedClient(), initWalletConnect()])

    kukaiEmbedClient.current = KukaiEmbedClient
    walletConnectClient.current = WalletConnectClient

    subscribeToEvents(WalletConnectClient)

    const { user } = KukaiEmbedClient

    if (user) {
      const { name, profileImage, pkh } = user.userData as Record<string, string>
      setUser({ name, iconURL: profileImage, address: pkh, provider: PROVIDERS.KUKAI_EMBED })
      setAppState(APP_STATE.READY)
    }
  }

  const subscribeToEvents = useCallback((client: SignClient) => {
    WalletConnectQRCodeModal.subscribeModal(() => {
      setAppState(APP_STATE.READY)
      setIsOpen(false)
    })

    client.on("session_update", ({ topic, params }) => {
      const { namespaces } = params
      const session = { ...client.session?.get(topic), namespaces }

      const address = getAddressFromSession(session)
      if (!address) {
        return
      }

      const provider = PROVIDERS.WALLET_CONNECT // getActiveProvider()
      const iconURL = ASSETS.LOGOS.WALLET_CONNECT

      setUser({ name: formatAddress(address), address, iconURL, provider })
      setProvider(provider)
    })

    client.on("session_delete", () => {
      setUser((prevUser) => {
        if (WALLET_CONNECT_PROVIDERS.has(prevUser?.provider as PROVIDERS)) {
          return null
        }
        return prevUser
      })
    })

    client.on('session_expire', () => {
      setUser((prevUser) => {
        if (WALLET_CONNECT_PROVIDERS.has(prevUser?.provider as PROVIDERS)) {
          return null
        }
        return prevUser
      })
    })

    client.core.pairing.events.on('pairing_delete', () => {
      setUser((prevUser) => {
        if (WALLET_CONNECT_PROVIDERS.has(prevUser?.provider as PROVIDERS)) {
          return null
        }
        return prevUser
      })
    })

    client.core.pairing.events.on('pairing_expire', (payload) => {
      console.log('Pairing expired:', payload)
      setUser((prevUser) => {
        if (WALLET_CONNECT_PROVIDERS.has(prevUser?.provider as PROVIDERS)) {
          return null
        }
        return prevUser
      })
    });

    if (!client) {
      throw new Error('WalletConnect not initialized')
    }

    if (!client.session.length) {
      const activePairing = getActivePairing(client)

      if (!activePairing) {
        setUser((prevUser) => {
          if (WALLET_CONNECT_PROVIDERS.has(prevUser?.provider as PROVIDERS)) {
            return null
          }
          return prevUser
        })
        setAppState(APP_STATE.READY)
        return
      }

      setUser((prevUser) => {
        if (WALLET_CONNECT_PROVIDERS.has(prevUser?.provider as PROVIDERS)) {
          return null
        }
        return prevUser
      })
      setAppState(APP_STATE.READY)
      return
    }

    const session = getActiveSession(client)
    const address = session.sessionProperties?.address || ''

    const provider = PROVIDERS.WALLET_CONNECT // getActiveProvider()
    const iconURL = ASSETS.LOGOS.WALLET_CONNECT

    setUser({ name: formatAddress(address), address, iconURL, provider })
    setProvider(provider)
    setAppState(APP_STATE.READY)

    return client
  }, [setUser])

  useEffect(() => {
    if (hasAttemptedInit) {
      return
    }

    hasAttemptedInit = true
    handleInit()
  }, [])

  function handleClick() {
    setIsOpen(true)
    onOpen()
  }

  function handleClose() {
    setIsOpen(false)
  }

  async function handleKukaiEmbed() {
    setIsOpen(false)
    setProvider(PROVIDERS.KUKAI_EMBED)
    setAppState(APP_STATE.LOADING)

    try {
      const user = await kukaiEmbedClient.current!.login({})
      const { name, pkh, profileImage } = user.userData as Record<string, string>

      setUser({ name, address: pkh, iconURL: profileImage, provider: PROVIDERS.KUKAI_EMBED })
    } catch (error) {
      console.log(error)
    } finally {
      setAppState(APP_STATE.READY)
    }
  }

  async function handleWalletConnect() {
    setIsOpen(false)
    setAppState(APP_STATE.LOADING)
    setProvider(PROVIDERS.WALLET_CONNECT)

    try {
      const [address] = await connectAccount(walletConnectClient.current!)

      if (!address) {
        setIsOpen(false)
        setAppState(APP_STATE.READY)
        return
      }

      setUser({ name: formatAddress(address), address, iconURL: ASSETS.LOGOS.WALLET_CONNECT, provider: PROVIDERS.WALLET_CONNECT })
      setActiveProvider(PROVIDERS.WALLET_CONNECT)
    } catch (error) {
      console.log(error)
    } finally {
      setAppState(APP_STATE.READY)
    }
  }

  async function handleTonConnect() {
    setIsOpen(false)
    tonConnectUI.openModal()
  }

  function handleTezosConnect() {
    setInTezosConnect(true)
    setIsOpen(false)
  }

  async function _handleKukai() {
    const { uri, approval } = walletConnectSession.current
    window.location.href = `${KUKAI_MOBILE_UNIVERSAL_LINK}/wc?uri=${encodeURIComponent(uri)}`

    try {
      const session = await approval()
      const address = session.sessionProperties?.address

      if (!address) {
        return
      }

      const formattedAddress = formatAddress(address)

      setUser({ address, name: formattedAddress, provider: PROVIDERS.KUKAI, iconURL: ASSETS.LOGOS.KUKAI })
      setProvider(PROVIDERS.KUKAI)
      setActiveProvider(PROVIDERS.KUKAI)

      removeDeeplinkChoice()
    } catch (error) {
      console.warn(error)
    } finally {
      setIsOpen(false)
    }
  }

  async function onOpen() {
    // no-op
  }

  async function handleDisconnect() {
    setAppState(APP_STATE.LOADING)

    try {
      if (WALLET_CONNECT_PROVIDERS.has(provider)) {
        setPlatformChoice(null)
        await disconnectWalletConnect(walletConnectClient.current!)
      } else if (provider === PROVIDERS.TON_CONNECT) {
        await tonConnectUI.disconnect()
      } else if (provider === PROVIDERS.REOWN) {
        await appKit.open()
      } else {
        await kukaiEmbedClient.current!.logout()
      }
    } catch (error) {
      console.warn(error)
    } finally {
      if (provider !== PROVIDERS.REOWN) {
        setUser(null)
      }
      setAppState(APP_STATE.READY)
    }
  }

  function handleEtherlink() {
    appKit.open()
  }

  const isLoading = appState === APP_STATE.LOADING
  const notReady = appState !== APP_STATE.READY

  const telegramUserData = getTelegramUser()

  return (
    <main>
      <div>
        {user && <UserCard kukaiEmbedClient={kukaiEmbedClient.current!} walletConnectClient={walletConnectClient.current!} {...user} provider={provider} />}
        {user
          ? <Button disabled={appState !== APP_STATE.READY} variant="outline" onClick={handleDisconnect}>
            {notReady ? <LoadingText /> : provider === PROVIDERS.REOWN ? 'Open User Modal' : 'Disconnect'}
          </Button>
          : <Button disabled={appState !== APP_STATE.READY} variant="outline" onClick={handleClick}>
            {notReady ? <LoadingText /> : 'Connect Wallet'}
          </Button>}
        <Drawer open={isOpen} onClose={handleClose}>
          <DrawerContent className="pb-6 rounded-t-[34px]">
            <DrawerHeader>
              <DrawerTitle>Connect Wallet</DrawerTitle>
            </DrawerHeader>
            <DrawerFooter>
              {SHOW_PROVIDERS[PROVIDERS.KUKAI_EMBED] && <Button variant="default" disabled={isLoading && provider === PROVIDERS.KUKAI_EMBED} onClick={handleKukaiEmbed}>
                {isLoading && provider === PROVIDERS.KUKAI_EMBED ? <ReloadIcon className="mr-2 h-4 w-4 animate-spin" /> : <EmailIcon className="mr-2 h-5 w-5 [&>path]:fill-white" />}
                <span className="w-[170px] text-left pl-2">Social</span>
              </Button>}
              <Button variant="default" className="h-[54px] hover:bg-neutral-200 hover:border-transparent justify-start bg-secondary text-primary rounded-[18px]" onClick={handleWalletConnect} disabled={!SHOW_PROVIDERS[PROVIDERS.WALLET_CONNECT] || (isLoading && provider === PROVIDERS.WALLET_CONNECT)}>
                {isLoading && provider === PROVIDERS.WALLET_CONNECT ? <ReloadIcon className="mr-2 h-4 w-4 animate-spin" /> : <img src={ASSETS.LOGOS.WALLET_CONNECT} className="mr-1 h-8 w-8 [&>path]:fill-white" />}
                <span className="w-[170px] text-left pl-2">Wallet Connect</span>
              </Button>
              <Button variant="default" className="h-[54px] hover:bg-neutral-200 hover:border-transparent justify-start bg-secondary text-primary rounded-[18px]" onClick={handleTonConnect} disabled={!SHOW_PROVIDERS[PROVIDERS.TON_CONNECT] || (isLoading && provider === PROVIDERS.TON_CONNECT)}>
                {isLoading && provider === PROVIDERS.TON_CONNECT ? <ReloadIcon className="mr-2 h-4 w-4 animate-spin" /> : <img src="https://docs.ton.org/img/favicon32x32.png" className="mr-1 h-8 w-8 [&>path]:fill-white" />}
                <span className="w-[170px] text-left pl-2">Ton Connect</span>
              </Button>
              <Button variant="default" className="h-[54px] hover:bg-neutral-200 hover:border-transparent justify-start bg-secondary text-primary rounded-[18px]" onClick={handleEtherlink} disabled={!SHOW_PROVIDERS[PROVIDERS.REOWN] || (isLoading && provider === PROVIDERS.WALLET_CONNECT)}>
                {isLoading && provider === PROVIDERS.REOWN ? <ReloadIcon className="mr-2 h-4 w-4 animate-spin" /> : <img src="https://www.etherlink.com/favicon.ico" className="mr-1 h-8 w-8 [&>path]:fill-white" />}
                <span className="w-[170px] text-left pl-2">Etherlink (Wallet Connect)</span>
              </Button>
              <Button variant="default" className="h-[54px] hover:bg-neutral-200 hover:border-transparent justify-start bg-secondary text-primary rounded-[18px]" onClick={handleTezosConnect} disabled={!SHOW_PROVIDERS[PROVIDERS.TEZOS_CONNECT] || (isLoading && provider === PROVIDERS.TEZOS_CONNECT)}>
                {isLoading && provider === PROVIDERS.TEZOS_CONNECT ? <ReloadIcon className="mr-2 h-4 w-4 animate-spin" /> : <img src={ASSETS.LOGOS.TEZOS_CONNECT} className="mr-1 h-8 w-8 [&>path]:fill-white" />}
                <span className="w-[170px] text-left pl-2">Tezos Connect</span>
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
      {
        !!telegramUserData && <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 mb-4 text-[14px]">
          Unverified Telegram User: {telegramUserData}
        </div>
      }
      {inTezosConnect && <TezosConnectModal walletConnectClient={walletConnectClient.current!} onClose={setInTezosConnect} setProvider={setProvider} setUser={setUser} />}
    </main>
  )
}

function LoadingText() {
  return (
    <Fragment>
      <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
      Loading...
    </Fragment>
  )
}

export default App

