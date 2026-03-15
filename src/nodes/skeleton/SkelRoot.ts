import { Specifier } from "../../crate/Specifier.ts"
import { SpecType } from "../../crate/SpecType.ts"
import type { UsdNode } from "../../crate/UsdNode.ts"
import { Boundable } from "../geometry/Boundable.ts"

/**
 * Concrete prim schema for a transform, which implements Xformable
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
