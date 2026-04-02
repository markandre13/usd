import { CrateDataType } from "./CrateDataType"
import { TimeSamples } from "../types/TimeSamples"

export interface TypedTimeSamples extends TimeSamples {
    sampleType: CrateDataType.Int | CrateDataType.Float | CrateDataType.Vec3h | CrateDataType.Vec3f | CrateDataType.Vec3d | CrateDataType.Quatf | undefined
}
