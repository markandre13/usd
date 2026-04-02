import { ListOp } from "../../types/ListOp"
import { Specifier } from "../../crate/Specifier"
import { SpecType } from "../../crate/SpecType"
import { Variability } from "../../crate/Variability"
import { IntArrayAttr } from "../attributes/IntArrayAttr"
import { Relationship } from "../attributes/Relationship"
import { VariabilityAttr } from "../attributes/VariabilityAttr"
import { Material } from "../shader/Material"
import { Typed } from "../usd/Typed"
import { UsdNode } from "../usd/UsdNode"

/**
 * Encodes a subset of a piece of geometry (i.e. a UsdGeomImageable) 
 * as a set of indices. Currently supports encoding subsets of faces, 
 * points, edges, segments, and tetrahedrons.
 *
 * To apply to a geometric prim, a GeomSubset prim must be the prim's direct 
 * child in namespace, and possess a concrete defining specifier (i.e. def). 
 * This restriction makes it easy and efficient to discover subsets of a prim. 
 * We might want to relax this restriction if it's common to have multiple 
 * <b>families</b> of subsets on a gprim and if it's useful to be able to 
 * organize subsets belonging to a <b>family</b> under a common scope. See 
 * 'familyName' attribute for more info on defining a family of subsets.
 * 
 * defined in pxr/usd/usdGeom/schema.usda
 */
export class GeomSubset extends Typed {
    constructor(parent: UsdNode, name: string) {
        super(parent.crate, parent, -1, name, false)
        this.spec_type = SpecType.Prim
        this.specifier = Specifier.Def
        this.typeName = "GeomSubset"
    }

    override encodeFields(): void {
        super.encodeFields()
        this.setTokenListOp("apiSchemas", this.apiSchemas)
    }

    private apiSchemas?: ListOp<string>
    private prependApiSchema(name: string) {
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

    /**
     * The type of element that the indices target. "elementType" can
     * have one of the following values:
     * - face: Identifies faces on a Gprim's surface. For a 
     * UsdGeomMesh, each element of the _indices_ attribute would refer to 
     * an element of the Mesh's _faceCounts_ attribute. For a UsdGeomTetMesh,
     * each element of the _indices_ attribute would refer to an element of
     * the Mesh's _surfaceFaceVertexIndices_ attribute.</li>
     * - point: for any UsdGeomPointBased, each 
     * element of the _indices_ attribute would refer to an element of the 
     * Mesh's _points_ attribute</li>
     * - edge: for any UsdGeomMesh, each pair of elements
     * in the _indices_ attribute would refer to a pair of points of the 
     * Mesh's _points_ attribute that are connected as an implicit edge on the 
     * Mesh. These edges are derived from the Mesh's _faceVertexIndices_ 
     * attribute. Edges are not currently defined for a UsdGeomTetMesh, but
     * could be derived from all tetrahedron edges or surface face edges only 
     * if a specific use-case arises.</li>
     * - segment: for any Curve, each pair of elements 
     * in the _indices_ attribute would refer to a pair of indices 
     * (_curveIndex_, _segmentIndex_) where _curveIndex_ is the position of 
     * the specified curve in the Curve's _curveVertexCounts_ attribute, and 
     * _segmentIndex_ is the index of the segment within that curve.</li>
     * - tetrahedron: for any UsdGeomTetMesh, each element of the 
     * _indices_ attribute would refer to an element of the TetMesh's 
     * _tetVertexIndices_ attribute.
     * </li></ul>
     */
    set elementType(value: "face" | "point" | "edge" | "segment" | "tetrahedron" | undefined) {
        this.deleteChild("elementType")
        if (value !== undefined) {
            new VariabilityAttr(this, "elementType", Variability.Uniform, value)
        }
    }

    /**
     * The set of indices included in this subset. The indices need not 
     * be sorted, but the same index should not appear more than once. Indices 
     * are invalid if outside the range [0, elementCount) for the given time on 
     * the parent geometric prim.
     */
    set indices(value: ArrayLike<number> | undefined) {
        this.deleteChild("indices")
        if (value !== undefined) {
            new IntArrayAttr(this, "indices", value)
        }
    }
    /**
     * The name of the family of subsets that this subset belongs to. 
     * This is optional and is primarily useful when there are multiple 
     * families of subsets under a geometric prim. In some cases, this could 
     * also be used for achieving proper roundtripping of subset data between 
     * DCC apps.
     */
    set familyName(value: string | undefined) {
        this.deleteChild("familyName")
        if (value !== undefined) {
            new VariabilityAttr(this, "familyName", Variability.Uniform, value)
        }
    }

    set materialBinding(value: ListOp<Material> | undefined) {
        this.deleteChild("material:binding")
        if (value !== undefined) {
            this.prependApiSchema("MaterialBindingAPI")
            new Relationship(this, "material:binding", value)
        }
    }
}
