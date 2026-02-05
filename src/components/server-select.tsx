"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectGroup,
    SelectLabel
} from "@/components/ui/select";

interface Server { id: string; name: string }

export function ServerSelect() {
    const router = useRouter();
    const [servers, setServers] = React.useState<Server[]>([]);
    const [loading, setLoading] = React.useState(true);

    return (
        <Select
        disabled={loading || servers.length === 0}
        onValueChange={(serverId) => router.push(`/servers/${serverId}`)}
        >
        <SelectTrigger className="w-full">
            <SelectValue
            placeholder={
                loading
                ? "Chargement..."
                : servers.length === 0
                ? "Aucun serveur"
                : "Choose a server"
            }
            />
        </SelectTrigger>

        <SelectContent>
            <SelectGroup>
                <SelectLabel>My servers</SelectLabel>
                {servers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                    {s.name}
                </SelectItem>
                ))}
            </SelectGroup>
        </SelectContent>
        </Select>
    );
    }
