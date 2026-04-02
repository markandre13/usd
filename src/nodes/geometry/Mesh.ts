import type { ListOp } from "../../types/ListOp"
import { Specifier } from "../../crate/Specifier"
import { SpecType } from "../../crate/SpecType"
import type { UsdNode } from "../usd/UsdNode"
import { Variability } from "../../crate/Variability"
import { Attribute } from "../attributes/Attribute"
import { IntArrayAttr } from "../attributes/IntArrayAttr"
import { VariabilityAttr } from "../attributes/VariabilityAttr"
import { Relationship } from "../attributes/Relationship"
import { StringAttr } from "../attributes/StringAttr"
import { Skeleton } from "../skeleton/Skeleton"

import { PointBased, SubdivisionScheme } from "./PointBased"
import { SkelBindingAPI } from "./SkelBindingAPI"
import { TokenAttr } from "../attributes/TokenAttr"
import { BlendShape } from "../skeleton/BlendShape"

/**
 * Encodes a mesh with optional subdivision properties and features.
 *
 * As a point-based primitive, meshes are defined in terms of points that 
 * are connected into edges and faces. Many references to meshes use the
 * term 'vertex' in place of or interchangeably with 'points', while some
 * use 'vertex' to refer to the 'face-vertices' that define a face.  To
 * avoid confusion, the term 'vertex' is intentionally avoided in favor of
 * 'points' or 'face-vertices'.
 *
 * The connectivity between points, edges and faces is encoded using a
 * common minimal topological description of the faces of the mesh.  Each
 * face is defined by a set of face-vertices using indices into the Mesh's
 * _points_ array (inherited from UsdGeomPointBased) and laid out in a
 * single linear _faceVertexIndices_ array for efficiency.  A companion
 * _faceVertexCounts_ array provides, for each face, the number of
 * consecutive face-vertices in _faceVertexIndices_ that define the face.
 * No additional connectivity information is required or constructed, so
 * no adjacency or neighborhood queries are available.
 *
 * A key property of this mesh schema is that it encodes both subdivision
 * surfaces and simpler polygonal meshes. This is achieved by varying the
 * _subdivisionScheme_ attribute, which is set to specify Catmull-Clark
 * subdivision by default, so polygonal meshes must always be explicitly
 *declared. The available subdivision schemes and additional subdivision
 * features encoded in optional attributes conform to the feature set of
 * [OpenSubdiv](https://graphics.pixar.com/opensubdiv/docs/subdivision_surfaces.html).
 */
export class Mesh extends PointBased implements SkelBindingAPI {
    active?: boolean = true

    constructor(parent: UsdNode, name: string) {
        super(parent.crate, parent, -1, name, true)
        this.spec_type = SpecType.Prim
        this.specifier = Specifier.Def
        this.typeName = "Mesh"
    }

    override encodeFields(): void {
        super.encodeFields()
        this.setTokenListOp("apiSchemas", this.apiSchemas)
        this.setBoolean("active", this.active)
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

    // also in Material
    set blenderDataName(value: string | undefined) {
        this.deleteChild("userProperties:blender:data_name")
        if (value !== undefined) {
            new StringAttr(this, "userProperties:blender:data_name", value, { custom: true })
        }
    }

    //
    // Common Properties
    //

    /**
     * Flat list of the index (into the _points_ attribute) of each
     * vertex of each face in the mesh.  If this attribute has more than
     * one timeSample, the mesh is considered to be topologically varying.
     */
    set faceVertexIndices(value: ArrayLike<number> | undefined) {
        this.deleteChild("faceVertexIndices")
        if (value !== undefined) {
            new IntArrayAttr(this, "faceVertexIndices", value)
        }
    }
    /**
     * Provides the number of vertices in each face of the mesh, 
     * which is also the number of consecutive indices in _faceVertexIndices_
     * that define the face.  The length of this attribute is the number of
     * faces in the mesh.  If this attribute has more than
     * one timeSample, the mesh is considered to be topologically varying.
     */
    set faceVertexCounts(value: ArrayLike<number> | undefined) {
        this.deleteChild("faceVertexCounts")
        if (value !== undefined) {
            new IntArrayAttr(this, "faceVertexCounts", value)
        }
    }

    //
    // Subdiv Properties
    //

    /**
     * The subdivision scheme to be applied to the surface.
     * Valid values are:
     *
     * - __catmullClark__: The default, Catmull-Clark subdivision; preferred
     *   for quad-dominant meshes (generalizes B-splines); interpolation
     *   of point data is smooth (non-linear)
     * - __loop__: Loop subdivision; preferred for purely triangular meshes;
     *   interpolation of point data is smooth (non-linear)
     * - __bilinear__: Subdivision reduces all faces to quads (topologically
     *   similar to "catmullClark"); interpolation of point data is bilinear
     * - __none__: No subdivision, i.e. a simple polygonal mesh; interpolation
     *   of point data is linear
     *
     * Polygonal meshes are typically lighter weight and faster to render,
     * depending on renderer and render mode.  Use of "bilinear" will produce
     * a similar shape to a polygonal mesh and may offer additional guarantees
     * of watertightness and additional subdivision features (e.g. holes) but
     * may also not respect authored normals.
     */
    set subdivisionScheme(value: SubdivisionScheme | undefined) {
        this.deleteChild("subdivisionScheme")
        if (value !== undefined) {
            new VariabilityAttr(this, "subdivisionScheme", Variability.Uniform, value)
        }
    }

    // interpolateBoundary
    // faceVaryingLinearInterpolation
    // triangleSubdivisionRule
    // holeIndices
    // cornerIndices
    // cornerSharpnesses
    // creaseIndices
    // creaseLengths
    // creaseSharpnesses

    // MaterialBindingAPI: material:binding
    // pxr/usd/usdShade/schema.usda
    set materialBinding(value: ListOp<UsdNode> | undefined) {
        this.deleteChild("material:binding")
        if (value === undefined) {
            return
        }
        this.prependApiSchema("MaterialBindingAPI")
        new Relationship(this, "material:binding", value)
    }

    //
    // GeomSubset
    //
    set familyType(value: "partition" | "nonOverlapping" | "unrestricted" | undefined) {
        this.deleteChild("subsetFamily:materialBind:familyType")
        if (value !== undefined) {
            new VariabilityAttr(this, "subsetFamily:materialBind:familyType", Variability.Uniform, value)
        }
    }

    //
    // SkelBindingAPI
    //

    set skeleton(value: Skeleton | ListOp<Skeleton> | undefined) {
        this.deleteChild("skel:skeleton")
        if (value === undefined) {
            return
        }
        this.prependApiSchema("SkelBindingAPI")
        if (value instanceof Skeleton) {
            new Relationship(this, "skel:skeleton", {
                isExplicit: true,
                explicit: [value]
            })
            return
        }
        new Relationship(this, "skel:skeleton", value)
    }

    set geomBindTransform(value: ArrayLike<number> | undefined) {
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
        indices: ArrayLike<number>
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
        indices: ArrayLike<number>
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

    set blendShapes(value: string[] | undefined) {
        this.deleteChild("skel:blendShapes")
        if (value !== undefined) {
            new TokenAttr(this, "skel:blendShapes", Variability.Uniform, value)
        }
    }

    set blendShapeTargets(value: BlendShape[] | undefined) {
        this.deleteChild("skel:blendShapeTargets")
        if (value !== undefined) {
            new Relationship(this, "skel:blendShapeTargets", {
                isExplicit: true,
                explicit: value
            })
        }
    }
}
