import { ArrowIcon, CopyIcon, MobileIcon, WebIcon } from "@/assets/icons/Icons";
import { Button } from "@/components/ui/button";
import {
    Drawer,
    DrawerContent,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle
} from "@/components/ui/drawer";
import { ASSETS, PROVIDERS, WALLET_REGISTRY } from "@/model/constants";
import { SignClient } from "@walletconnect/sign-client/dist/types/client";
import { Dispatch, Fragment, SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import { QRCode } from 'react-qrcode-logo';
import { CONNECT_PAYLOAD, formatAddress, getActivePairing, setPlatformChoice } from "../utils/wallet-connect-utils";
import { isOniOS } from "../utils/mobile-utils";

enum WALLLETS {
    KUKAI = "kukai-wallet",
    TEMPLE = "temple-wallet",
    TRUST = "trust-wallet",
}

export enum PLATFORMS {
    WEB = "platform-web",
    MOBILE = "platform-mobile",
}

interface Props {
    onClose: Dispatch<SetStateAction<boolean>>
    setUser: Dispatch<SetStateAction<any>>
    setProvider: Dispatch<SetStateAction<PROVIDERS>>
    walletConnectClient: SignClient
}

let hasInit = false

export function TezosConnectModal({ onClose, walletConnectClient, setUser, setProvider }: Props) {
    const [isOpen, setIsOpen] = useState(false)
    const [copyText, setCopyText] = useState("Copy")
    const [selectedWallet, setSelectedWallet] = useState<WALLLETS | null>(null)
    const [uri, setUri] = useState("")
    const walletConnectSession = useRef({ uri: "", approval: (): any => { } })
    const platformCandidate = useRef<PLATFORMS | null>(null)

    const createSession = useCallback(async () => {
        try {
            // const pairing = getActivePairing(walletConnectClient)
            const { uri, approval } = await walletConnectClient.connect({
                pairingTopic: undefined,
                ...CONNECT_PAYLOAD
            })

            walletConnectSession.current = { uri: uri!, approval }
            setUri(uri!)
        } catch (e) {
            console.log(e)
        }
    }, [walletConnectClient])

    useEffect(() => {
        if (hasInit) {
            return
        }

        hasInit = true
        createSession()

        setIsOpen(true)
    }, [createSession])

    useEffect(() => {
        return () => {
            hasInit = false
        }
    }, [])

    useEffect(() => {
        if (!uri) {
            return
        }

        walletConnectSession.current!.approval().then((session) => {
            const address = session?.sessionProperties?.address
            if (!address) {
                return
            }

            setUser({ address, name: formatAddress(address), provider: PROVIDERS.WALLET_CONNECT, iconURL: ASSETS.LOGOS.WALLET_CONNECT })
            setProvider(PROVIDERS.WALLET_CONNECT)
            setPlatformChoice(platformCandidate.current)
            setIsOpen(false)

            setTimeout(() => {
                onClose(false)
            }, 600)
        }).catch(console)
    }, [uri, setUser, setProvider, onClose])

    function handleAnimationEnd() {
        onClose(false)
    }

    function handleClose() {
        setIsOpen(false)
    }

    function handleKukai() {
        setSelectedWallet(WALLLETS.KUKAI)
    }

    function handleBack() {
        setSelectedWallet(null)
    }

    function handleWeb() {
        platformCandidate.current = PLATFORMS.WEB
        window.open(`${WALLET_REGISTRY.KUKAI.WEB_LINK}/wc?uri=${encodeURIComponent(uri)}`, "kukai-tezos-connect")
    }

    function handleMobile() {
        platformCandidate.current = PLATFORMS.MOBILE
        window.location.href = `${WALLET_REGISTRY.KUKAI.UNIVERSAL_LINK}/wc?uri=${encodeURIComponent(uri)}`
    }

    function handleCopy() {
        setCopyText("Copied!")
        navigator.clipboard.writeText(uri);
        setTimeout(() => {
            setCopyText("Copy")
        }, 1000)
    }

    return (
        <Drawer open={isOpen} onClose={handleClose} onAnimationEnd={handleAnimationEnd}>
            <DrawerContent className="pb-6 rounded-t-[40px] items-center">
                <DrawerHeader>
                    <DrawerTitle className="h-[24px]">
                        {selectedWallet &&
                            <Button onClick={handleBack} variant="outline" className="w-[40px] h-[40px] bg-gray-100 border-[transparent] p-[0px] absolute gap-1 translate-y-[-6px] left-[24px] rounded-[52px]">
                                <ArrowIcon className="w-[16px] h-auto" />
                            </Button>
                        }
                        {selectedWallet === WALLLETS.KUKAI ?
                            <span className="flex items-center gap-2">
                                <img src={ASSETS.LOGOS.KUKAI} className="h-[20px]" />
                                Kukai
                            </span>
                            : "Tezos Connect"}
                    </DrawerTitle>
                </DrawerHeader>
                <DrawerFooter>
                    <div className="flex items-center justify-center mb-[24px]">
                        <div className="border-slate-100 p-[12px] rounded-[24px] border-[2px]">
                            <div className={`transition - opacity ${!uri ? "opacity-0" : "opacity-100"} `}>
                                <QRCode
                                    size={208}
                                    fgColor={selectedWallet === WALLLETS.KUKAI ? "#5358e0" : "#343434"}
                                    eyeRadius={14}
                                    logoImage={selectedWallet === WALLLETS.KUKAI ? ASSETS.LOGOS.KUKAI_QR : ""}
                                    logoHeight={64}
                                    logoWidth={64}
                                    qrStyle="fluid"
                                    quietZone={0}
                                    value={uri} />
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-center gap-[6px]">
                        {!selectedWallet &&
                            <Fragment>
                                <Button onClick={handleKukai} className="h-auto p-[6px] hover:bg-neutral-200 hover:border-transparent flex-col gap-[6px] justify-start bg-transparent text-primary rounded-[18px]">
                                    <img src={ASSETS.LOGOS.KUKAI} className="h-[60px] w-[60px] rounded-[18px] [&>path]:fill-white" />
                                    Kukai
                                </Button>
                                <Button disabled className="h-auto p-[6px] hover:bg-neutral-200 hover:border-transparent flex-col gap-[6px] justify-start bg-transparent text-primary rounded-[18px]">
                                    <img src={ASSETS.LOGOS.TRUST} className="h-[60px] w-[60px] border-[1px] border-slate-200 rounded-[18px] object-cover [&>path]:fill-white" />
                                    Trust
                                </Button>
                                <Button disabled className="h-auto p-[6px] hover:bg-neutral-200 hover:border-transparent flex-col gap-[6px] justify-start bg-transparent text-primary rounded-[18px]">
                                    <img src={ASSETS.LOGOS.TEMPLE} className="h-[60px] w-[60px] rounded-[18px] [&>path]:fill-white" />
                                    Temple
                                </Button>
                            </Fragment>
                        }
                        {selectedWallet &&
                            <Fragment>
                                <Button onClick={handleWeb} className="h-auto p-[6px] hover:bg-neutral-200 hover:border-transparent border-[1px] border-slate-200 flex-col gap-[6px] justify-start bg-transparent text-primary rounded-[18px]">
                                    <div className="h-[60px] w-[60px] flex items-center justify-center">
                                        <WebIcon className="w-[26px] h-auto" />
                                    </div>
                                    Web
                                </Button>
                                <Button disabled={!isOniOS()} onClick={handleMobile} className="h-auto p-[6px] hover:bg-neutral-200 hover:border-transparent flex-col gap-[6px] border-slate-200 justify-start bg-transparent text-primary rounded-[18px]">
                                    <div className="h-[60px] w-[60px] flex items-center justify-center">
                                        <MobileIcon className="w-[26px] h-auto" />
                                    </div>
                                    Mobile
                                </Button>
                            </Fragment>
                        }
                        <Button onClick={handleCopy} className="h-auto p-[6px] hover:bg-neutral-200 hover:border-transparent flex-col gap-[6px] justify-start bg-transparent text-primary rounded-[18px] ">
                            <div className="flex items-center justify-center h-[60px] w-[60px] bg-neutral-100 rounded-[18px] [&>path]:fill-white">
                                <CopyIcon className="w-[22px] h-[22px] [&>path]:stroke-gray-500" />
                            </div>
                            {copyText}
                        </Button>
                    </div>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    )
}