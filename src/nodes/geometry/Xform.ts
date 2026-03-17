import { Specifier } from "../../crate/Specifier"
import { SpecType } from "../../crate/SpecType"
import type { UsdNode } from "../usd/UsdNode"
import { Xformable } from "./Xformable"

/**
 * Concrete prim schema for a transform, which implements Xformable
 *
 * defined in pxr/usd/usdGeom/schema.usda
 */
export class Xform extends Xformable {
    constructor(parent: UsdNode, name: string) {
        super(parent.crate, parent, -1, name, true)
        this.spec_type = SpecType.Prim
        this.specifier = Specifier.Def
        this.typeName = "Xform"
    }
}
