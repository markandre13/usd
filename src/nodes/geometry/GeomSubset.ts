import { Specifier } from "../../crate/Specifier.ts"
import { SpecType } from "../../crate/SpecType.ts"
import { UsdNode } from "../../crate/UsdNode.ts"

export class GeomSubset extends UsdNode {
    constructor(parent: UsdNode, name: string) {
        super(parent.crate, parent, -1, name, false)
        this.spec_type = SpecType.Prim
    }
    override encodeFields() {
        super.encodeFields()
        const crate = this.crate

        crate.fieldsets.fieldset_indices.push(
            crate.fields.setSpecifier("specifier", Specifier.Def)
        )
        crate.fieldsets.fieldset_indices.push(
            crate.fields.setToken("typeName", "GeomSubset")
        )

        crate.fieldsets.fieldset_indices.push(
            crate.fields.setTokenListOp("apiSchemas", {
                prepend: ["MaterialBindingAPI"]
            })
        )
    }
}
