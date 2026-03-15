import { Specifier } from "../../crate/Specifier.ts"
import { SpecType } from "../../crate/SpecType.ts"
import type { UsdNode } from "../../crate/UsdNode.ts"
import { Attribute } from "../attributes/Attribute.ts"
import { Typed } from "../usd/Typed.ts"

/**
 * Base class for all USD shaders. Shaders are the building blocks
 * of shading networks. While UsdShadeShader objects are not target specific,
 * each renderer or application target may derive its own renderer-specific 
 * shader object types from this base, if needed.
 * 
 * defined in pxr/usd/usdShade/schema.usda
 */
export class Shader extends Typed {
    constructor(parent: UsdNode, name: string) {
        super(parent.crate, parent, -1, name, false)
        this.spec_type = SpecType.Prim
        this.specifier = Specifier.Def
        this.typeName = "Shader"
    }
    set blenderDataName(value: string | undefined) {
        this.deleteChild("userProperties:blender:data_name")
        if (value !== undefined) {
            const attr = new Attribute(this, "userProperties:blender:data_name", value)
            attr.custom = true
        }
    }
}
