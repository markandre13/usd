import { Variability } from "../../crate/Variability"
import { BooleanAttr } from "../attributes/BooleanAttr"
import { Boundable } from "./Boundable"

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
            new BooleanAttr(this, "doubleSided", value, {variability: Variability.Uniform})
        }
    }
}
