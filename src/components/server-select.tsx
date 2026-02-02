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

type Server = { id: string; name: string };

const MOCK_SERVERS: Server[] = [
    { id: "srv-1", name: "Epitech" },
    { id: "srv-2", name: "Döppelgang HQ" },
    { id: "srv-3", name: "Space Nerds" },
]
export function ServerSelect() {
    const router = useRouter();
    const [servers, setServers] = React.useState<Server[]>([]);
    const [loading, setLoading] = React.useState(true);

    // // Fetch servers from API
    // React.useEffect(() => {
    //     const baseUrl = process.env.NEXT_PUBLIC_API_URL;

    //     fetch(`${baseUrl}/servers`)
    //     .then((r) => (r.ok ? r.json() : Promise.reject()))
    //     .then((data: Server[]) => setServers(data))
    //     .catch(() => setServers([]))
    //     .finally(() => setLoading(false));
    // }, []);

    React.useEffect(() => {
        // Simulation d’un appel back
        // (setTimeout juste pour imiter le chargement)
        const t = setTimeout(() => {
        setServers(MOCK_SERVERS)
        setLoading(false)
        }, 200)

        return () => clearTimeout(t)
    }, [])

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
