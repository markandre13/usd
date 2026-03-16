import { Variability } from "../../crate/Variability"
import { Vec2fArrayAttr } from "../attributes/Vec2fArrayAttr"
import { Vec3fArrayAttr } from "../attributes/Vec3fArrayAttr"
import { VariabilityAttr } from "../attributes/VariabilityAttr"
import { Gprim } from "./Gprim"

// Cube size
// Sphere radius
// Cylinder
// Capsule
// Cone
// Cylinder_1
// Capsule_1
// Plane

export type SubdivisionScheme = "catmullClark" | "loop" | "bilinear" | "none"
export type InterpolateBoundary = "none" | "edgeOnly" | "edgeAndCorner"
export type FaceVaryingLinearInterpolation = "none" | "cornersOnly" | "cornersPlus1" | "cornersPlus2" | "boundaries" | "all"

export class PointBased extends Gprim {
    set points(value: ArrayLike<number> | undefined) {
        this.deleteChild("points")
        if (value !== undefined) {
            new Vec3fArrayAttr(this, "points", value, "point3f[]")
        }
    }
    set texCoords(value: ArrayLike<number> | undefined) {
        this.deleteChild("primvars:st")
        if (value !== undefined) {
            const attr = new Vec2fArrayAttr(this.crate, this, "primvars:st", value, "texCoord2f[]")
            attr.interpolation = "faceVarying"
        }
    }
    // vector3f[] velocities
    // vector3f[] accelerations
    set normals(value: ArrayLike<number> | undefined) {
        this.deleteChild("normals")
        if (value !== undefined) {
            const attr = new Vec3fArrayAttr(this, "normals", value, "normal3f[]")
            attr.interpolation = "faceVarying"
        }
    }

    // uniform token subdivisionScheme = "catmullClark" 
    set subdivisionScheme(value: SubdivisionScheme | undefined) {
        this.deleteChild("subdivisionScheme")
        if (value !== undefined) {
            new VariabilityAttr(this, "subdivisionScheme", Variability.Uniform, value)
        }
    }
    interpolateBoundary: InterpolateBoundary = "edgeAndCorner";
    faceVaryingLinearInterpolation: FaceVaryingLinearInterpolation = "cornersPlus1";
}
