import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PROVIDERS } from "@/model/constants"
import { useState } from "react"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Card, CardContent } from "../ui/card"

interface Props {
    iconURL: string
    name: string
    provider: string
}

export default function UserCard({ name, iconURL, provider }: Props) {
    const [isLoading, setIsLoading] = useState(false)

    async function handleClick() {
        setIsLoading(true)

        if (provider === PROVIDERS.KUKAI_EMBED) {
            // no-op
        } else {
            // no-op
        }

        setIsLoading(false)
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
            <Button className="mb-6" onClick={handleClick} disabled={isLoading} >Send xtz</Button>
        </Card>
    )
}