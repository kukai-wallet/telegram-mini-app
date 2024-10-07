import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from "@/components/ui/drawer"
import { ReloadIcon } from "@radix-ui/react-icons"
import { Fragment, useEffect, useState } from 'react'

import { KukaiEmbed } from "kukai-embed"
import './App.css'
import { EmailIcon, WalletConnectIcon } from "./assets/icons/Icons"
import UserCard from "./components/user/UserCard"

enum APP_STATE {
  INITIALIING,
  LOADING,
  READY,
}

enum PROVIDERS {
  KUKAI_EMBED = "kukai-embed",
  WALLET_CONNECT = "wallet-connect"
}

interface User {
  name: string,
  iconURL: string,
}

const KukaiEmbedClient = new KukaiEmbed({ net: "https://feature-redirect-uri.kukai-private.pages.dev", icon: false, enableLogging: false })

let hasAttemptedInit = false;

function App() {
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [appState, setAppState] = useState(APP_STATE.INITIALIING)
  const [provider, setProvider] = useState(PROVIDERS.KUKAI_EMBED)

  const handleInit = async () => {
    await KukaiEmbedClient.init()
    const { user } = KukaiEmbedClient

    if (user) {
      const { name, profileImage } = user.userData as Record<string, string>
      setUser({ name, iconURL: profileImage })
    }

    setAppState(APP_STATE.READY)
  }

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

    const user = await KukaiEmbedClient.login({})
    const { name, profileImage } = user.userData as Record<string, string>
    setUser({ name, iconURL: profileImage })
    setAppState(APP_STATE.READY)
  }

  function handleWalletConnect() {
    setProvider(PROVIDERS.WALLET_CONNECT)
    setAppState(APP_STATE.LOADING)
  }

  async function handleDisconnect() {
    setAppState(APP_STATE.LOADING)
    await KukaiEmbedClient.logout()
    setUser(null)
    setAppState(APP_STATE.READY)
  }

  const isLoading = appState === APP_STATE.LOADING
  const notReady = appState !== APP_STATE.READY

  return (
    <main>
      <div>
        {user && <UserCard {...user} provider={provider} />}
        {user
          ? <Button disabled={appState !== APP_STATE.READY} variant="outline" onClick={handleDisconnect}>
            {notReady ? <LoadingText /> : 'Disconnect'}
          </Button>
          : <Button disabled={appState !== APP_STATE.READY} variant="outline" onClick={handleClick}>
            {notReady ? <LoadingText /> : 'Connect Wallet'}
          </Button>}
        <Drawer open={isOpen} onClose={handleClose}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Connect Wallet</DrawerTitle>
              {/* <DrawerDescription>Choose one of .</DrawerDescription> */}
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
