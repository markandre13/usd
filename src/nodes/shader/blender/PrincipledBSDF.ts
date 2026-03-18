import { Variability } from "../../../crate/Variability"
import { Attribute } from "../../attributes/Attribute"
import { Color3fAttr } from "../../attributes/Color3fAttr"
import { FloatAttr } from "../../attributes/FloatAttr"
import { TokenAttr } from "../../attributes/TokenAttr"
import { Scope } from "../../geometry/Scope"
import { Material } from "../Material"
import { Shader } from "../Shader"

export function makePrincipledBSDF(scope: Scope, name: string, diffuseColor: number[]) {
    const material = new Material(scope, name)

    const shader = new Shader(material, "Principled_BSDF")
    new TokenAttr(shader, "info:id", Variability.Uniform, "UsdPreviewSurface")
    new FloatAttr(shader, "inputs:clearcoat", 0)
    new FloatAttr(shader, "inputs:clearcoatRoughness",  0.029999999329447746)
    new Color3fAttr(shader, "inputs:diffuseColor", diffuseColor)
    new FloatAttr(shader, "inputs:ior", 1.5)
    new FloatAttr(shader, "inputs:metallic", 0)
    new FloatAttr(shader, "inputs:opacity", 1)
    new FloatAttr(shader, "inputs:roughness", 0.5)
    new FloatAttr(shader, "inputs:specular", 0.5)

    const surface = new TokenAttr(shader, "outputs:surface")

    new Attribute(material, "outputs:surface", (node) => {
        node.setToken("typeName", "token")
        node.setPathListOp("connectionPaths", {
            isExplicit: true,
            explicit: [surface]
        })
    })
    material.blenderDataName = name

    return material
}
