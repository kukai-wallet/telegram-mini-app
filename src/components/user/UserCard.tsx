import { Card, CardContent } from "../ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "../ui/badge"

interface Props {
    iconURL: string
    name: string
    provider: string
}

export default function UserCard({ name, iconURL, provider }: Props) {
    return (
        <Card className="bg-white overflow-hidden mb-6">
            <CardContent className="flex flex-row items-center gap-4 p-6">
                <Avatar>
                    <AvatarImage src={iconURL} alt="Channel Logo" />
                    <AvatarFallback>{name.substring(0, 1)}</AvatarFallback>
                </Avatar>
                <div className="space-y-1 flex flex-col">
                    <h2 className="text-lg font-semibold">{name}</h2>
                    <Badge variant="secondary" className="text-xs max-w-max">
                        {provider}
                    </Badge>
                </div>
            </CardContent>
        </Card>
    )
}