import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PROVIDERS } from "@/model/constants"
import { useState } from "react"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Card, CardContent } from "../ui/card"
import { KukaiEmbed } from "kukai-embed"
import { SignClient } from "@walletconnect/sign-client/dist/types/client"
import { getActiveSession, KUKAI_DESKTOP_UNIVERSAL_LINK, NETWORK } from "../utils/wallet-connect-utils"
import { ReloadIcon } from "@radix-ui/react-icons"

interface Props {
    address: string
    iconURL: string
    kukaiEmbedClient: KukaiEmbed
    name: string
    provider: string
    walletConnectClient: SignClient
}

const OPERATIONS = [
    {
        "kind": "transaction",
        "amount": "12345",
        "destination": "tz1arY7HNDq17nrZJ7f3sikxuHZgeopsU9xq"
    }
]

export default function UserCard({ name, address, iconURL, provider, kukaiEmbedClient, walletConnectClient }: Props) {
    const [isLoading, setIsLoading] = useState(false)

    async function handleClick() {
        setIsLoading(true)

        try {
            if (provider === PROVIDERS.KUKAI_EMBED) {
                await kukaiEmbedClient.send(OPERATIONS)
            } else {
                const session = getActiveSession(walletConnectClient)

                window.open(KUKAI_DESKTOP_UNIVERSAL_LINK, "kukai-mini-app")
                await walletConnectClient.request({
                    topic: session.topic,
                    request: {
                        method: 'tezos_send',
                        params: { account: address, operations: OPERATIONS },
                    },
                    chainId: `tezos:${NETWORK}`
                })
                console.log('resoved')
            }
        } catch (error) {
            console.warn(error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card className="bg-white overflow-hidden mb-6">
            <CardContent className="flex flex-row items-center gap-4 p-6">
                <Avatar>
                    <AvatarImage src={iconURL} alt="Channel Logo" />
                    <AvatarFallback>{name.substring(0, 3)}</AvatarFallback>
                </Avatar>
                <div className="space-y-1 flex flex-col">
                    <h2 className="text-lg font-semibold">{name}</h2>
                    <Badge variant="secondary" className="text-xs max-w-max">
                        {provider}
                    </Badge>
                </div>
            </CardContent>
            <Button className="mb-6" onClick={handleClick} disabled={isLoading}>
                {isLoading && <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />}
                Send xtz
            </Button>
        </Card>
    )
}