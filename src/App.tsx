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

import { SignClient } from "@walletconnect/sign-client/dist/types/client"
import { KukaiEmbed } from "kukai-embed"
import './App.css'
import { EmailIcon, WalletConnectIcon } from "./assets/icons/Icons"
import UserCard from "./components/user/UserCard"
import { initKukaiEmbedClient } from "./components/utils/kukai-embed"
import { initWalletConnect } from "./components/utils/wallet-connect"
import { connectAccount, disconnectWalletConnect, formatAddress, getActivePairing, getActiveSession, getAddressFromSession, WalletConnectQRCodeModal } from "./components/utils/wallet-connect-utils"
import { PROVIDERS } from "./model/constants"

enum APP_STATE {
  INITIALIING,
  LOADING,
  READY,
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

  async function handleDisconnect() {
    setAppState(APP_STATE.LOADING)

    try {
      if (provider === PROVIDERS.WALLET_CONNECT) {
        await disconnectWalletConnect(walletConnectClient.current!)
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

  const isLoading = appState === APP_STATE.LOADING
  const notReady = appState !== APP_STATE.READY

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
          <DrawerContent className="pb-6">
            <DrawerHeader>
              <DrawerTitle>Connect Wallet</DrawerTitle>
            </DrawerHeader>
            <DrawerFooter>
              <Button variant="default" disabled={isLoading && provider === PROVIDERS.KUKAI_EMBED} onClick={handleKukaiEmbed}>
                {isLoading && provider === PROVIDERS.KUKAI_EMBED ? <ReloadIcon className="mr-2 h-4 w-4 animate-spin" /> : <EmailIcon className="mr-2 h-5 w-5 [&>path]:fill-white" />}
                Use Social
              </Button>
              <Button variant="default" onClick={handleWalletConnect} disabled={isLoading && provider === PROVIDERS.WALLET_CONNECT}>
                {isLoading && provider === PROVIDERS.WALLET_CONNECT ? <ReloadIcon className="mr-2 h-4 w-4 animate-spin" /> : <WalletConnectIcon className="mr-2 h-5 w-5 [&>path]:fill-white" />}
                Wallet Connect
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
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
