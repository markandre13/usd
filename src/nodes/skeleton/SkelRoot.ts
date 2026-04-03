import { Specifier } from "../../crate/Specifier.js"
import { SpecType } from "../../crate/SpecType.js"
import type { UsdNode } from "../usd/UsdNode.js"
import { Boundable } from "../geometry/Boundable.js"

/**
 * Boundable prim type used to identify a scope beneath which
 * skeletally-posed primitives are defined.
 *
 * A SkelRoot must be defined at or above a skinned primitive for any skinning
 * behaviors in UsdSkel.
 *
 * defined in pxr/usd/usdSkel/schema.usda
 */
export class SkelRoot extends Boundable {
    constructor(parent: UsdNode, name: string) {
        super(parent.crate, parent, -1, name, true)
        this.spec_type = SpecType.Prim
        this.specifier = Specifier.Def
        this.typeName = "SkelRoot"
    }
}
