import type { Crate } from "../crate/Crate.ts"
import type { ListOp } from "../crate/Fields.ts"
import { SpecType } from "../crate/SpecType.ts"
import { UsdNode } from "../crate/UsdNode.ts"
import { Variability } from "../crate/Variability.js"

export class FloatAttr extends UsdNode {
    value: number
    constructor(crate: Crate, parent: UsdNode, name: string, value: number) {
        super(crate, parent, -1, name, false)
        this.spec_type = SpecType.Attribute
        this.value = value
    }

    override encodeFields() {
        super.encodeFields()
        const crate = this.crate

        crate.fieldsets.fieldset_indices.push(
            crate.fields.setToken("typeName", "float")
        )
        crate.fieldsets.fieldset_indices.push(
            crate.fields.setFloat("default", this.value)
        )
    }
}

export class AssetPathAttr extends UsdNode {
    value: string
    constructor(crate: Crate, parent: UsdNode, name: string, value: string) {
        super(crate, parent, -1, name, false)
        this.spec_type = SpecType.Attribute
        this.value = value
    }

    override encodeFields() {
        super.encodeFields()
        const crate = this.crate

        crate.fieldsets.fieldset_indices.push(
            crate.fields.setToken("typeName", "asset")
        )
        crate.fieldsets.fieldset_indices.push(
            crate.fields.setAssetPath("default", this.value)
        )
    }
}

export class Relationship extends UsdNode {
    value: ListOp<UsdNode>
    constructor(crate: Crate, parent: UsdNode, name: string, value: ListOp<UsdNode>) {
        super(crate, parent, -1, name, false)
        this.spec_type = SpecType.Relationship
        this.value = value
    }

    override encodeFields() {
        super.encodeFields()
        const crate = this.crate

        crate.fieldsets.fieldset_indices.push(
            crate.fields.setVariability("variability", Variability.Uniform)
        )
        crate.fieldsets.fieldset_indices.push(
            crate.fields.setPathListOp("targetPaths", this.value)
        )
    }
}

export class VariabilityAttr extends UsdNode {
    variability: Variability
    value: string
    constructor(crate: Crate, parent: UsdNode, name: string, variability: Variability, value: string) {
        super(crate, parent, -1, name, false)
        this.spec_type = SpecType.Attribute
        this.variability = variability
        this.value = value
    }

    override encodeFields() {
        super.encodeFields()
        const crate = this.crate

        crate.fieldsets.fieldset_indices.push(
            crate.fields.setToken("typeName", "token")
        )
        crate.fieldsets.fieldset_indices.push(
            crate.fields.setVariability("variability", this.variability)
        )
        crate.fieldsets.fieldset_indices.push(
            crate.fields.setToken("default", this.value)
        )
    }
}

export class IntArrayAttr extends UsdNode {
    value: ArrayLike<number>
    constructor(crate: Crate, parent: UsdNode, name: string, value: ArrayLike<number>) {
        super(crate, parent, -1, name, false)
        this.spec_type = SpecType.Attribute
        this.value = value
    }

    override encodeFields() {
        super.encodeFields()
        const crate = this.crate

        crate.fieldsets.fieldset_indices.push(
            crate.fields.setToken("typeName", "int[]")
        )
        crate.fieldsets.fieldset_indices.push(
            crate.fields.setIntArray("default", this.value)
        )
    }
}

export class Vec3fArrayAttr extends UsdNode {
    value: ArrayLike<number>
    typeName: string
    interpolation?: string
    constructor(
        crate: Crate,
        parent: UsdNode,
        name: string,
        value: ArrayLike<number>,
        typeName: "float3[]" | "point3f[]" | "normal3f[]"
    ) {
        super(crate, parent, -1, name, false)
        this.spec_type = SpecType.Attribute
        this.value = value
        this.typeName = typeName
    }

    override encodeFields() {
        super.encodeFields()
        const crate = this.crate

        crate.fieldsets.fieldset_indices.push(
            crate.fields.setToken("typeName", this.typeName)
        )
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

export class Vec2fArrayAttr extends UsdNode {
    value: ArrayLike<number>
    typeName: string
    interpolation?: string
    constructor(
        crate: Crate,
        parent: UsdNode,
        name: string,
        value: ArrayLike<number>,
        typeName: "texCoord2f[]"
    ) {
        super(crate, parent, -1, name, false)
        this.spec_type = SpecType.Attribute
        this.value = value
        this.typeName = typeName
    }

    override encodeFields() {
        super.encodeFields()
        const crate = this.crate

        crate.fieldsets.fieldset_indices.push(
            crate.fields.setToken("typeName", this.typeName)
        )
        if (this.interpolation !== undefined) {
            crate.fieldsets.fieldset_indices.push(
                crate.fields.setToken("interpolation", this.interpolation)
            )
        }
        crate.fieldsets.fieldset_indices.push(
            crate.fields.setVec2fArray("default", this.value)
        )
    }
}