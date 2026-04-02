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
import { Skeleton } from "./Skeleton"

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

    /**
     * Array of tokens identifying which joints this animation's
     * data applies to. The tokens for joints correspond to the tokens of
     * Skeleton primitives. The order of the joints as listed here may
     * vary from the order of joints on the Skeleton itself.
     */
    set joints(value: string[] | undefined) {
        Skeleton._joints(this, value)
    }
    
    /**
     * Joint-local translations of all affected joints. Array length 
     * should match the size of the *joints* attribute.
     */
    set translations(value: ArrayLike<number> | TimeSamples | undefined) {
        this.deleteChild("translations")
        if (value === undefined) {
            return
        }
        new Attribute(this, "translations", node => {
            node.setToken("typeName", "float3[]")
            if (Array.isArray(value)) {
                node.setVec3fArray("default", value)
            } else {
                const ts = value as TimeSamples
                node.setVec3fArray("default", ts.samples[0])
                node.setTimeSamples("timeSamples", { ...ts, sampleType: CrateDataType.Vec3f })
            }
        })
    }

    /**
     * Joint-local unit quaternion rotations of all affected joints, 
     * in 32-bit precision. Array length should match the size of the 
     * *joints* attribute.
     */
    set rotations(value: ArrayLike<number> | TimeSamples | undefined) {
        this.deleteChild("rotations")
        if (value === undefined) {
            return
        }
        new Attribute(this, "rotations", node => {
            node.setToken("typeName", "quatf[]")
            if (Array.isArray(value)) {
                node.setQuatfArray("default", value)
            } else {
                const ts = value as TimeSamples
                node.setQuatfArray("default", ts.samples[0])
                node.setTimeSamples("timeSamples", { ...ts, sampleType: CrateDataType.Quatf })
            }
        })
    }

    /**
     * Joint-local scales of all affected joints, in
     * 16 bit precision. Array length should match the size of the *joints* 
     * attribute.
     */
    set scales(value: ArrayLike<number> | TimeSamples | undefined) {
        this.deleteChild("scales")
        if (value === undefined) {
            return
        }
        new Attribute(this, "scales", node => {
            node.setToken("typeName", "half3[]")
            if (Array.isArray(value)) {
                node.setVec3hArray("default", value)
            } else {
                const ts = value as TimeSamples
                node.setVec3hArray("default", ts.samples[0])
                node.setTimeSamples("timeSamples", { ...ts, sampleType: CrateDataType.Vec3h })
            }
        })
    }

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
        if (value === undefined) {
            return
        }
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
