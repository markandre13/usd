import { SpecType } from "../../crate/SpecType.ts"
import { UsdNode } from "../../crate/UsdNode.ts"

export class AttributeX extends UsdNode {
    private _fields: (node: UsdNode) => void
    constructor(parent: UsdNode, name: string, fields: (node: UsdNode) => void) {
        super(parent.crate, parent, -1, name, false)
        this.spec_type = SpecType.Attribute
        this._fields = fields
    }

    override encodeFields(): void {
        super.encodeFields()
        this._fields(this)
    }
}
