
export class DataContainer {

    private data: GeoData;

    public registerDataScenario(id: string) {

    }
}

export interface GeoData {

}

export interface AquiferMap {
    [aquifer: string]: number[];
}

export interface IndexMap {
    [index: number]: IndexData;
}

export interface IndexData {
    aquifer: string,
    areas: string[]
}