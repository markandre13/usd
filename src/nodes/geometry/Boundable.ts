import { Vec3fArrayAttr } from "../attributes/Vec3fArrayAttr"
import { Xformable } from "./Xformable"

/**
 * Boundable introduces the ability for a prim to persistently
 * cache a rectilinear, local-space, extent.
 * 
 * defined in pxr/usd/usdGeom/schema.usda
 */
export class Boundable extends Xformable {
    set extent(value: ArrayLike<number> | undefined) {
        this.deleteChild("extent")
        if (value !== undefined) {
            new Vec3fArrayAttr(this, "extent", value, "float3[]")
        }
    }
}
