import { Specifier } from "../../crate/Specifier"
import { SpecType } from "../../crate/SpecType"
import type { UsdNode } from "../../crate/UsdNode"
import { Imageable } from "./Imageable"

/**
 * Scope is the simplest grouping primitive, and does not carry the
 * baggage of transformability.  Note that transforms should inherit down
 * through a Scope successfully - it is just a guaranteed no-op from a
 * transformability perspective.
 *
 * defined in pxr/usd/usdGeom/schema.usda
 */
export class Scope extends Imageable {
    constructor(parent: UsdNode, name: string) {
        super(parent.crate, parent, -1, name, true)
        this.spec_type = SpecType.Prim
        this.specifier = Specifier.Def
        this.typeName = "Scope"
    }
}
