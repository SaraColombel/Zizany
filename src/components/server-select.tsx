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
    const [servers] = React.useState<Server[]>([]);
    const [loading] = React.useState(true);
    let placeholder = "Choose a server";

    if (loading) {
        placeholder = "Charging...";
    } else if (servers.length === 0) {
        placeholder = "No servers found";
    }

    return (
        <Select
        disabled={loading || servers.length === 0}
        onValueChange={(serverId) => router.push(`/servers/${serverId}`)}
        >
        <SelectTrigger className="w-full">
            <SelectValue
            placeholder={placeholder}
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
