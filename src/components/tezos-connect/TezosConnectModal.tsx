import { CopyIcon } from "@/assets/icons/Icons";
import { Button } from "@/components/ui/button";
import {
    Drawer,
    DrawerContent,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle
} from "@/components/ui/drawer";
import { SignClient } from "@walletconnect/sign-client/dist/types/client";
import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import { QRCode } from 'react-qrcode-logo';
import { CONNECT_PAYLOAD } from "../utils/wallet-connect-utils";

interface Props {
    onClose: Dispatch<SetStateAction<boolean>>
    setUser: Dispatch<SetStateAction<any>>
    walletConnectClient: SignClient
}

export function TezosConnectModal({ onClose, walletConnectClient, setUser }: Props) {
    const [isOpen, setIsOpen] = useState(false)
    const [copyText, setCopyText] = useState("Copy")
    const [uri, setUri] = useState("")
    const walletConnectSession = useRef({ uri: "", approval: (): any => { } })

    const createSession = useCallback(async () => {
        try {
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
        createSession()
        setIsOpen(true)
    }, [createSession])

    function handleAnimationEnd() {
        onClose(false)
    }

    function handleClose() {
        setIsOpen(false)
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
                    <DrawerTitle>Tezos Connect</DrawerTitle>
                </DrawerHeader>
                <DrawerFooter>
                    <div className="flex items-center justify-center mb-[24px]">
                        <div className={`border-slate-100 p-[12px] rounded-[24px] border-[2px]`}>
                            <div className={`transition-opacity ${!uri ? "opacity-0" : "opacity-100"}`}>
                                <QRCode
                                    size={208}
                                    fgColor="#343434"
                                    eyeRadius={14}
                                    qrStyle="fluid"
                                    quietZone={0}
                                    value={uri} />
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-[16px] pl-[16px]">
                        <Button className="h-auto p-[0px] hover:bg-neutral-200 hover:border-transparent flex-col gap-[6px] justify-start bg-transparent text-primary rounded-[18px]">
                            <img src="https://ghostnet.kukai.app/assets/img/header-logo1.svg" className="h-[60px] w-[60px] rounded-[18px] [&>path]:fill-white" />
                            Kukai
                        </Button>
                        <Button disabled className="h-auto p-[0px] hover:bg-neutral-200 hover:border-transparent flex-col gap-[6px] justify-start bg-transparent text-primary rounded-[18px]">
                            <img src="https://avatars.githubusercontent.com/u/32179889?s=200&v=4" className="h-[60px] w-[60px] border-[1px] border-slate-200 rounded-[18px] object-cover [&>path]:fill-white" />
                            Trust
                        </Button>
                        <Button disabled className="h-auto p-[0px] hover:bg-neutral-200 hover:border-transparent flex-col gap-[6px] justify-start bg-transparent text-primary rounded-[18px]">
                            <img src="https://play-lh.googleusercontent.com/xXetoCYxj251yLnmSZ-inAda0tRuNNnS1Ymg45Et-Yg4gL_YOIfTuM6OE4H0XG11FOg=w480-h960-rw" className="h-[60px] w-[60px] rounded-[18px] [&>path]:fill-white" />
                            Temple
                        </Button>
                        <Button onClick={handleCopy} className="h-auto p-[0px] hover:bg-neutral-200 hover:border-transparent flex-col gap-[6px] justify-start bg-transparent text-primary rounded-[18px] ">
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