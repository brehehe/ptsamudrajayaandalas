export interface ShipCompany {
    id: string;
    code?: string;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
}

export interface RequestItemData {
    id?: string;
    product_id?: string;
    item_name: string;
    quantity: number | string;
    unit: string;
    notes?: string;
    required_date?: string;
    required_time?: string;
    is_urgent?: boolean;
    director_status?: string | null;
}

export interface ShipRequest {
    id: string;
    request_number: string;
    status: string;
    request_date: string;
    port_call_id?: string | null;
    service_type?: string | null;
    requested_port_call_status?: string | null;
    operational_occurred_at?: string | null;
    notes?: string;
    created_at: string;
    items?: RequestItemData[];
}

export interface ShipPort {
    id: string;
    name: string;
    code?: string;
    city?: string;
}

export interface Ship {
    id: string;
    name: string;
    imo_number: string;
    ship_type?: string;
    status: string;
    agent_name?: string;
    is_active: boolean;
    image?: string | null;
    created_at?: string;
    eta?: string;
    flag?: string;
    gross_tonnage?: number | string;
    length?: number | string;
    call_sign?: string;
    captain_name?: string;
    captain_phone?: string;
    ship_company_id?: string;
    company?: ShipCompany;
    port_id?: string;
    port?: ShipPort;
    requests?: ShipRequest[];
    operational_activities?: OperationalActivityData[];
}

export interface OperationalActivityData {
    id: string;
    activity_date: string;
    activity_time?: string;
    location_name: string;
    latitude?: number | null;
    longitude?: number | null;
    is_vessel_related: boolean;
    ship_id?: string | null;
    port_call_id?: string | null;
    request_id?: string | null;
    vessel_position?: 'scheduled' | 'anchored' | 'berthed' | 'departed' | null;
    cargo_activity?: 'bongkar' | 'muat' | 'tidak_ada' | null;
    cargo_quantity?: string | number | null;
    cargo_unit?: string | null;
    progress_percent?: number | null;
    constraints?: string | null;
    next_plan?: string | null;
    category: string;
    title: string;
    detail: string;
    photos?: string[] | null;
    created_by?: number | string | null;
    creator?: {
        id: number | string;
        name: string;
    };
    ship?: {
        id: string;
        name: string;
    };
    request?: {
        id: string;
        request_number: string;
        status?: string;
    };
    created_at?: string;
}

export interface MasterProduct {
    id: string;
    name: string;
    code: string;
    category: string;
    unit: string;
    item_type?: string;
}

export interface VesselShowProps {
    vessel: Ship;
    needs?: ShipRequest[];
    products?: MasterProduct[];
    clearancePortCalls?: ClearancePortCall[];
    selectedPortCallId?: string | null;
    selectedVisit?: SelectedVisit | null;
    canManageClearance?: boolean;
    canProcessRequests?: boolean;
}

export interface SelectedVisit {
    id: string;
    job_number?: string | null;
    status: string;
}

export interface ClearancePortCall {
    id: string;
    job_number: string;
    status: string;
    clearance_in_block_reason: string | null;
    can_clearance_out: boolean;
    update_url: string;
}
