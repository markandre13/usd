import { Specifier } from "../../crate/Specifier.ts"
import { SpecType } from "../../crate/SpecType.ts"
import type { UsdNode } from "../../crate/UsdNode.ts"
import { Attribute } from "../attributes/Attribute.ts"
import { NodeGraph } from "./NodeGraph.ts"

/**
 * A Material provides a container into which multiple "render contexts"
 * can add data that defines a "shading material" for a renderer.
 *
 * defined in pxr/usd/usdShade/schema.usda
 */
export class Material extends NodeGraph {
    constructor(parent: UsdNode, name: string) {
        super(parent.crate, parent, -1, name, true)
        this.spec_type = SpecType.Prim
        this.specifier = Specifier.Def
        this.typeName = "Material"
    }
    set blenderDataName(value: string | undefined) {
        this.deleteChild("userProperties:blender:data_name")
        if (value !== undefined) {
            const attr = new Attribute(this, "userProperties:blender:data_name", value)
            attr.custom = true
        }
    }
}
