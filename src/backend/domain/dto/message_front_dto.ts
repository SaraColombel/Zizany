export interface MessageDTO {
    id: number,
    channel_id: number,
    content: string,
    created_at: string,
    updated_at: string,
    user: {
        id: number,
        username: string,
    };
};


