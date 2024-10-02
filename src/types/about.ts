export interface About {
    id: number;
    title: string;
    introduction: string;
    mission: Array<{
        id: number;
        title: string;
        content: string;
        about_page: number;
    }>;
    objectives: Array<{
        id: number;
        content: string;
        about_page: number;
    }>;
    key_features: Array<{
        id: number;
        title: string;
        content: string;
        about_page: number;
    }>;
    technology: Array<{
        id: number;
        title: string;
        content: string;
        about_page: number;
    }>;
    vision: Array<{
        id: number;
        title: string;
        content: string;
        about_page: number;
    }>;
    last_updated: string;
}