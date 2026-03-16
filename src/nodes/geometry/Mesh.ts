import type { ListOp } from "../../crate/Fields"
import { Specifier } from "../../crate/Specifier"
import { SpecType } from "../../crate/SpecType"
import type { UsdNode } from "../../crate/UsdNode"
import { Variability } from "../../crate/Variability"
import { Attribute } from "../attributes/Attribute"
import { IntArrayAttr } from "../attributes/IntArrayAttr"
import { VariabilityAttr } from "../attributes/VariabilityAttr"
import { Relationship } from "../attributes/Relationship"
import { StringAttr } from "../attributes/StringAttr"
import type { Skeleton } from "../skeleton/Skeleton"

import { PointBased } from "./PointBased"

export class Mesh extends PointBased {
    constructor(parent: UsdNode, name: string) {
        super(parent.crate, parent, -1, name, true)
        this.spec_type = SpecType.Prim
        this.specifier = Specifier.Def
        this.typeName = "Mesh"
    }

    override encodeFields(): void {
        super.encodeFields()
        this.setTokenListOp("apiSchemas", this.apiSchemas)
        this.setBoolean("active", true)
    }

    private apiSchemas?: ListOp<string>

    protected prependApiSchema(name: string) {
        if (this.apiSchemas === undefined) {
            this.apiSchemas = {}
        }
        if (this.apiSchemas.prepend === undefined) {
            this.apiSchemas.prepend = []
        }
        if (this.apiSchemas.prepend.find(it => it === name) === undefined) {
            this.apiSchemas.prepend.push(name)
        }
    }

    // also in Material
    set blenderDataName(value: string | undefined) {
        this.deleteChild("userProperties:blender:data_name")
        if (value !== undefined) {
            new StringAttr(this, "userProperties:blender:data_name", value, {custom: true})
        }
    }

    set faceVertexIndices(value: ArrayLike<number> | undefined) {
        this.deleteChild("faceVertexIndices")
        if (value !== undefined) {
            new IntArrayAttr(this, "faceVertexIndices", value)
        }
    }
    set faceVertexCounts(value: ArrayLike<number> | undefined) {
        this.deleteChild("faceVertexCounts")
        if (value !== undefined) {
            new IntArrayAttr(this, "faceVertexCounts", value)
        }
    }

    // MaterialBindingAPI: material:binding
    // pxr/usd/usdShade/schema.usda
    set materialBinding(value: ListOp<UsdNode> | undefined) {
        this.deleteChild("material:binding")
        if (value !== undefined) {
            this.prependApiSchema("MaterialBindingAPI")
            new Relationship(this, "material:binding", value)
        }
    }
    /**
     * GeomSubset
     */
    set familyType(value: "partition" | "nonOverlapping" | "unrestricted" | undefined) {
        this.deleteChild("subsetFamily:materialBind:familyType")
        if (value !== undefined) {
            new VariabilityAttr(this, "subsetFamily:materialBind:familyType", Variability.Uniform, value)
        }
    }

    /**
     * Skeleton
     */
    set geomBindTransform(value: number[] | undefined) {
        this.deleteChild("primvars:skel:geomBindTransform")
        if (value !== undefined) {
            this.prependApiSchema("SkelBindingAPI")
            new Attribute(this, "primvars:skel:geomBindTransform", node => {
                node.setToken("typeName", "matrix4d")
                node.setMatrix4d("default", value)
            })
        }
    }
    set jointIndices(value: {
        elementSize: number
        indices: number[]
    } | undefined) {
        this.deleteChild("primvars:skel:jointIndices")
        if (value !== undefined) {
            this.prependApiSchema("SkelBindingAPI")
            new Attribute(this, "primvars:skel:jointIndices", node => {
                node.setToken("typeName", "int[]")
                node.setToken("interpolation", "vertex")
                node.setInt("elementSize", value.elementSize)
                node.setIntArray("default", value.indices)
            })
        }
    }
    set jointWeights(value: {
        elementSize: number
        indices: number[]
    } | undefined) {
        this.deleteChild("primvars:skel:jointWeights")
        if (value !== undefined) {
            this.prependApiSchema("SkelBindingAPI")
            new Attribute(this, "primvars:skel:jointWeights", node => {
                node.setToken("typeName", "float[]")
                node.setToken("interpolation", "vertex")
                node.setInt("elementSize", value.elementSize)
                node.setFloatArray("default", value.indices)
            })
        }
    }

    set skeleton(value: Skeleton | undefined) {
        this.deleteChild("skel:skeleton")
        if (value !== undefined) {
            this.prependApiSchema("SkelBindingAPI")
            new Relationship(this, "skel:skeleton", {
                isExplicit: true,
                explicit: [value]
            })
        }
    }
}
