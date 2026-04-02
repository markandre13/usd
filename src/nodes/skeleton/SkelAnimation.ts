import { CrateDataType } from "../../crate/CrateDataType"
import { Specifier } from "../../crate/Specifier"
import { SpecType } from "../../crate/SpecType"
import { Variability } from "../../crate/Variability"
import { TimeSamples } from "../../types/TimeSamples"
import { Attribute } from "../attributes/Attribute"
import { FloatArrayAttr } from "../attributes/FloatArrayAttr"
import { TokenAttr } from "../attributes/TokenAttr"
import { Typed } from "../usd/Typed"
import { UsdNode } from "../usd/UsdNode"

/**
 * Describes a skel animation, where joint animation is stored in a
 * vectorized form.
 * 
 * defined in pxr/usd/usdSkel/schema.usda
 */
export class SkelAnimation extends Typed {
    constructor(parent: UsdNode, name: string) {
        super(parent.crate, parent, -1, name, true)
        this.spec_type = SpecType.Prim
        this.specifier = Specifier.Def
        this.typeName = "SkelAnimation"
    }

    // joints
    // translations
    // rotations
    // scales

    /**
     * Array of tokens identifying which blend shapes this
     * animation's data applies to. The tokens for blendShapes correspond to
     * the tokens set in the *skel:blendShapes* binding property of the
     * UsdSkelBindingAPI. Note that blendShapes does not accept time-sampled
     * values.
     */
    set blendShapes(values: string[] | undefined) {
        this.deleteChild("blendShapes")
        if (values !== undefined) {
            new TokenAttr(this, "blendShapes", Variability.Uniform, values)
        }
    }
    /**
     * Array of weight values for each blend shape. Each weight value
     * is associated with the corresponding blend shape identified within the
     * *blendShapes* token array, and therefore must have the same length as
     * *blendShapes.
     */
    set blendShapeWeights(value: ArrayLike<number> | TimeSamples | undefined) {
        this.deleteChild("blendShapeWeights")
        if (value !== undefined) {
            if (Array.isArray(value)) {
                new FloatArrayAttr(this, "blendShapeWeights", value)
            } else {
                const ts = value as TimeSamples
                new Attribute(this, "blendShapeWeights", node => {
                    node.setToken("typeName", "float[]")
                    node.setTimeSamples("timeSamples", { ...ts, sampleType: CrateDataType.Float })
                })
            }
        }
    }
}
