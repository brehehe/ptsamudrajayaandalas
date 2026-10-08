export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
    primary_role?: 'Owner' | 'Direktur' | 'Admin' | 'Lapangan' | string;
    roles?: string[];
    permissions?: string[];
}

export interface WorkflowNotification {
    id: string;
    type: string;
    title: string;
    message: string;
    url: string;
    action_label: string;
    action_required: boolean;
    tone: 'blue' | 'green' | 'amber' | 'red' | string;
    entity_type?: string | null;
    entity_id?: string | null;
    request_number?: string | null;
    ship_name?: string | null;
    ship_image?: string | null;
    status?: string | null;
    read_at?: string | null;
    created_at?: string | null;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
    notifications: {
        unread_count: number;
        items: WorkflowNotification[];
    };
    flash?: {
        success?: string;
        error?: string;
        submitted_request_number?: string;
        submitted_request_id?: string;
        created_work_order?: unknown;
    };
};
