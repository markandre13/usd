import { Variability } from "../../../crate/Variability"
import { AssetPathAttr } from "../../attributes/AssetPathAttr"
import { Attribute } from "../../attributes/Attribute"
import { TokenAttr } from "../../attributes/TokenAttr"
import { UsdNode } from "../../usd/UsdNode"
import { Shader } from "../Shader"

export type WrapMode = "black" | "clamp" | "repeat" | "mirror" | "useMetadata"

export class ImageTexture extends Shader {
    set infoId(value: string | undefined) {
        this.deleteChild("info:id")
        if (value !== undefined) {
            new TokenAttr(this, "info:id", Variability.Uniform, value)
        }
    }
    set file(value: string | undefined) {
        this.deleteChild("inputs:file")
        if (value !== undefined) {
            new AssetPathAttr(this, "inputs:file", value)
        }
    }
    set sourceColorSpace(value: "raw" | "sRGB" | "auto" | undefined) {
        this.deleteChild("inputs:sourceColorSpace")
        if (value !== undefined) {
            new TokenAttr(this, "inputs:sourceColorSpace", undefined, value)
        }
    }
    set uvCoords(value: UsdNode | undefined) {
        this.deleteChild("inputs:st")
        if (value !== undefined) {
            new Attribute(this, "inputs:st", (node) => {
                node.setToken("typeName", "float2")
                node.setPathListOp("connectionPaths", {
                    isExplicit: true,
                    explicit: [value]
                })
            })
        }
    }
    set wrapS(value: WrapMode | undefined) {
        this.deleteChild("inputs:wrapS")
        if (value !== undefined) {
            new TokenAttr(this, "inputs:wrapS", undefined, value)
        }
    }
    set wrapT(value: WrapMode | undefined) {
        this.deleteChild("inputs:wrapT")
        if (value !== undefined) {
            new TokenAttr(this, "inputs:wrapT", undefined, value)
        }
    }
    get outputsRGB() {
        const node = this.findChild("outputs:rgb")
        if (node !== undefined) {
            return node
        }
        return new Attribute(this, "outputs:rgb", node => {
            node.setToken("typeName", "float3")
        })
    }
}
