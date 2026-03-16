import { Specifier } from "../../crate/Specifier"
import { SpecType } from "../../crate/SpecType"
import type { UsdNode } from "../../crate/UsdNode"
import { StringAttr } from "../attributes/StringAttr"
import { NodeGraph } from "./NodeGraph"

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
            new StringAttr(this, "userProperties:blender:data_name", value, {custom: true})
        }
    }
}
