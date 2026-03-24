import { SpecType } from "../../crate/SpecType"
import { Variability } from "../../crate/Variability"
import { UsdNode } from "../usd/UsdNode"

export class Vec3fArrayAttr extends UsdNode {
    value: ArrayLike<number>
    typeName: string
    interpolation?: string
    variability?: Variability
    constructor(
        parent: UsdNode,
        name: string,
        value: ArrayLike<number>,
        typeName: "float3[]" | "point3f[]" | "normal3f[]" | "vector3f[]",
        variability?: Variability
    ) {
        super(parent.crate, parent, -1, name, false)
        this.spec_type = SpecType.Attribute
        this.value = value
        this.typeName = typeName
        this.variability = variability
    }

    override encodeFields() {
        super.encodeFields()
        const crate = this.crate

        crate.fieldsets.fieldset_indices.push(
            crate.fields.setToken("typeName", this.typeName)
        )
        if (this.variability !== undefined) {
            crate.fieldsets.fieldset_indices.push(
                crate.fields.setVariability("variability", this.variability)
            )
        }
        crate.fieldsets.fieldset_indices.push(
            crate.fields.setVec3fArray("default", this.value)
        )
        if (this.interpolation !== undefined) {
            crate.fieldsets.fieldset_indices.push(
                crate.fields.setToken("interpolation", this.interpolation)
            )
        }
    }
}
