import type { Crate } from "../../crate/Crate.ts"
import { SpecType } from "../../crate/SpecType.ts"
import { UsdNode } from "../../crate/UsdNode.ts"

// blender mesh options and how they map to usd
//   shade: flat | smooth
//     'normals' are not per 'points' but 'faceVertexIndices'
//     and the flat/smooth is encoded via those
//   edge > mark sharp
//   edge > mark seam (i guess this is for uv?)
//   edge > bevel weight
//   edge > edge crease
//
//   materials
//     multiple materials for one mesh
//       via GeomSubset which lists the faces
//       viewport display is not stored but taken from color itself during import
//   armature, weights
//   blendshape
//   subdivision modifier becomes part of the Mesh... but might loose sharp edges (?)

export class PseudoRoot extends UsdNode {
    metersPerUnit?: number = 1;
    documentation?: string
    upAxis?: "X" | "Y" | "Z" = "Z";
    defaultPrim?: string

    constructor(crate: Crate) {
        super(crate, undefined, -1, "/", true)
        this.spec_type = SpecType.PseudoRoot
    }

    override encodeFields(): void {
        super.encodeFields()
        this.setDouble("metersPerUnit", this.metersPerUnit)
        this.setString("documentation", this.documentation)
        this.setToken("upAxis", this.upAxis)
        this.setToken("defaultPrim", this.defaultPrim)
    }
}
