import { Variability } from "../../crate/Variability.ts"
import { Attribute } from "../attributes/Attribute.ts"
import { Boundable } from "./Boundable.ts"

/**
 * Base class for all geometric primitives.
 *
 * Gprim encodes basic graphical properties such as _doubleSided_ and
 * _orientation_, and provides primvars for "display color" and "display
 * opacity" that travel with geometry to be used as shader overrides.
 * 
 * defined in pxr/usd/usdGeom/schema.usda
 */
export class Gprim extends Boundable {
    // color3f[] primvars:displayColor
    // float[] primvars:displayOpacity
    // uniform bool doubleSided = false
    set doubleSided(value: boolean | undefined) {
        this.deleteChild("doubleSided")
        if (value !== undefined) {
            const attr = new Attribute(this, "doubleSided", value)
            attr.custom = undefined
            attr.variability = Variability.Uniform
        }
    }
}
