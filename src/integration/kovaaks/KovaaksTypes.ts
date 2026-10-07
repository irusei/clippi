import { BaseResult } from "../../types";

export type KovaaKsResult = BaseResult & {
    type: "KovaaKsResult";
    data: KovaaKsData;
};

export interface KovaaKsData {
    scenarios: KovaaKsScenario[];
}

export interface KovaaKsScenario {
    name: string;
    adjusted_finish_time: number;
    score: number;
}
