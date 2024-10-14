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
import UserCard from "./components/user/UserCard"
import { initKukaiEmbedClient } from "./components/utils/kukai-embed"
import { initWalletConnect } from "./components/utils/wallet-connect"
import { connectAccount, disconnectWalletConnect, formatAddress, getActivePairing, getActiveSession, getAddressFromSession, WalletConnectQRCodeModal } from "./components/utils/wallet-connect-utils"
import { PROVIDERS } from "./model/constants"
import { getTelegramUser } from "./utils/telegram-utils"

enum APP_STATE {
  INITIALIING,
  LOADING,
  READY,
}

const SHOW_PROVIDERS = {
  [PROVIDERS.KUKAI_EMBED]: false,
  [PROVIDERS.WALLET_CONNECT]: true,
  [PROVIDERS.TON_CONNECT]: true,
  [PROVIDERS.REOWN]: true,
}

interface User {
  address: string
  iconURL: string
  name: string
  provider: PROVIDERS
}


let hasAttemptedInit = false;

function App() {
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [appState, setAppState] = useState(APP_STATE.INITIALIING)
  const [provider, setProvider] = useState(PROVIDERS.KUKAI_EMBED)

  const kukaiEmbedClient = useRef<KukaiEmbed>()
  const walletConnectClient = useRef<SignClient>()

  const [tonConnectUI] = useTonConnectUI()
  const tonWallet = useTonWallet()
  const tonAddress = useTonAddress()
  const appKit = useAppKit()
  const appKitAccount = useAppKitAccount()

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
    if (appKitAccount.isConnected && provider !== PROVIDERS.REOWN) {
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

      setUser({ name: formatAddress(address), address, iconURL: '', provider: PROVIDERS.WALLET_CONNECT })
      setProvider(PROVIDERS.WALLET_CONNECT)
    })

    client.on("session_delete", () => {
      setUser((prevUser) => {
        if (prevUser?.provider === PROVIDERS.WALLET_CONNECT) {
          return null
        }
        return prevUser
      })
    })

    client.on('session_expire', () => {
      setUser((prevUser) => {
        if (prevUser?.provider === PROVIDERS.WALLET_CONNECT) {
          return null
        }
        return prevUser
      })
    })

    client.core.pairing.events.on('pairing_delete', (payload) => {
      console.log('Pairing delete:', payload)
      setUser((prevUser) => {
        if (prevUser?.provider === PROVIDERS.WALLET_CONNECT) {
          return null
        }
        return prevUser
      })
    })

    client.core.pairing.events.on('pairing_expire', (payload) => {
      console.log('Pairing expired:', payload)
      setUser((prevUser) => {
        if (prevUser?.provider === PROVIDERS.WALLET_CONNECT) {
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
          if (prevUser?.provider === PROVIDERS.WALLET_CONNECT) {
            return null
          }
          return prevUser
        })
        setAppState(APP_STATE.READY)
        return
      }

      setUser((prevUser) => {
        if (prevUser?.provider === PROVIDERS.WALLET_CONNECT) {
          return null
        }
        return prevUser
      })
      setAppState(APP_STATE.READY)
      return
    }

    const session = getActiveSession(client)
    const address = session.sessionProperties?.address || ''

    setUser({ name: formatAddress(address), address, iconURL: '', provider: PROVIDERS.WALLET_CONNECT })
    setProvider(PROVIDERS.WALLET_CONNECT)
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

      setUser({ name: formatAddress(address), address, iconURL: '', provider: PROVIDERS.WALLET_CONNECT })
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

  async function handleDisconnect() {
    setAppState(APP_STATE.LOADING)

    try {
      if (provider === PROVIDERS.WALLET_CONNECT) {
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
      setUser(null)
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
            {notReady ? <LoadingText /> : 'Disconnect'}
          </Button>
          : <Button disabled={appState !== APP_STATE.READY} variant="outline" onClick={handleClick}>
            {notReady ? <LoadingText /> : 'Connect Wallet'}
          </Button>}
        <Drawer open={isOpen} onClose={handleClose}>
          <DrawerContent className="pb-6 rounded-t-3xl">
            <DrawerHeader>
              <DrawerTitle>Connect Wallet</DrawerTitle>
            </DrawerHeader>
            <DrawerFooter>
              {SHOW_PROVIDERS[PROVIDERS.KUKAI_EMBED] && <Button variant="default" disabled={isLoading && provider === PROVIDERS.KUKAI_EMBED} onClick={handleKukaiEmbed}>
                {isLoading && provider === PROVIDERS.KUKAI_EMBED ? <ReloadIcon className="mr-2 h-4 w-4 animate-spin" /> : <EmailIcon className="mr-2 h-5 w-5 [&>path]:fill-white" />}
                <span className="w-[170px] text-left pl-2">Use Social</span>
              </Button>}
              <Button variant="default" onClick={handleWalletConnect} disabled={!SHOW_PROVIDERS[PROVIDERS.WALLET_CONNECT] || (isLoading && provider === PROVIDERS.WALLET_CONNECT)}>
                {isLoading && provider === PROVIDERS.WALLET_CONNECT ? <ReloadIcon className="mr-2 h-4 w-4 animate-spin" /> : <img src="https://explorer.walletconnect.com/meta/favicon.ico" className="mr-2 h-5 w-5 [&>path]:fill-white" />}
                <span className="w-[170px] text-left pl-2">Wallet Connect</span>
              </Button>
              <Button variant="default" onClick={handleTonConnect} disabled={!SHOW_PROVIDERS[PROVIDERS.TON_CONNECT] || (isLoading && provider === PROVIDERS.TON_CONNECT)}>
                {isLoading && provider === PROVIDERS.TON_CONNECT ? <ReloadIcon className="mr-2 h-4 w-4 animate-spin" /> : <img src="https://docs.ton.org/img/favicon32x32.png" className="mr-2 h-5 w-5 [&>path]:fill-white" />}
                <span className="w-[170px] text-left pl-2">Ton Connect</span>
              </Button>
              <Button variant="default" onClick={handleEtherlink} disabled={!SHOW_PROVIDERS[PROVIDERS.REOWN] || (isLoading && provider === PROVIDERS.WALLET_CONNECT)}>
                {isLoading && provider === PROVIDERS.REOWN ? <ReloadIcon className="mr-2 h-4 w-4 animate-spin" /> : <img src="https://www.etherlink.com/favicon.ico" className="mr-2 h-5 w-5 [&>path]:fill-white" />}
                <span className="w-[170px] text-left pl-2">Etherlink (Wallet Connect)</span>
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
    </main >
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
