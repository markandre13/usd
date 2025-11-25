import type { SpecType } from "./SpecType.ts"

// Spec describes the relation of a path(i.e. node) and field(e.g. vertex data)
export interface Spec {
    path_index: number
    fieldset_index: number
    spec_type: SpecType
}
