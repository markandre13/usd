import { Variability } from "../../../crate/Variability"
import { Attribute } from "../../attributes/Attribute"
import { Color3fAttr } from "../../attributes/Color3fAttr"
import { FloatAttr } from "../../attributes/FloatAttr"
import { TokenAttr } from "../../attributes/TokenAttr"
import { Scope } from "../../geometry/Scope"
import { UsdNode } from "../../usd/UsdNode"
import { Material } from "../Material"
import { Shader } from "../Shader"

export class PrincipledBSDF extends Shader {
    set infoId(value: string | undefined) {
        this.deleteChild("info:id")
        if (value !== undefined) {
            new TokenAttr(this, "info:id", Variability.Uniform, value)
        }
    }
    set clearcoat(value: number | undefined) {
        this.deleteChild("inputs:clearcoat")
        if (value !== undefined) {
            new FloatAttr(this, "inputs:clearcoat", value)
        }
    }
    set clearcoatRoughness(value: number | undefined) {
        this.deleteChild("inputs:clearcoatRoughness")
        if (value !== undefined) {
            new FloatAttr(this, "inputs:clearcoatRoughness", value)
        }
    }
    set diffuseColor(value: number[] | UsdNode | undefined) {
        this.deleteChild("inputs:diffuseColor")
        if (value !== undefined) {
            if (value instanceof UsdNode) {
                new Attribute(this, "inputs:diffuseColor", node => {
                    node.setToken("typeName", "color3f")
                    node.setPathListOp("connectionPaths", {
                        isExplicit: true,
                        explicit: [value]
                    })
                })
            } else {
                new Color3fAttr(this, "inputs:diffuseColor", value)
            }
        }
    }
    set ior(value: number | undefined) {
        this.deleteChild("inputs:ior")
        if (value !== undefined) {
            new FloatAttr(this, "inputs:ior", value)
        }
    }
    set metallic(value: number | undefined) {
        this.deleteChild("inputs:metallic")
        if (value !== undefined) {
            new FloatAttr(this, "inputs:metallic", value)
        }
    }
    set opacity(value: number | undefined) {
        this.deleteChild("inputs:opacity")
        if (value !== undefined) {
            new FloatAttr(this, "inputs:opacity", value)
        }
    }
    set roughness(value: number | undefined) {
        this.deleteChild("inputs:roughness")
        if (value !== undefined) {
            new FloatAttr(this, "inputs:roughness", value)
        }
    }
    set specular(value: number | undefined) {
        this.deleteChild("inputs:specular")
        if (value !== undefined) {
            new FloatAttr(this, "inputs:specular", value)
        }
    }
    get outputsSurface() {
        let node = this.findChild("outputs:surface")
        if (node) {
            return node
        }
        return new TokenAttr(this, "outputs:surface")
    }
}

