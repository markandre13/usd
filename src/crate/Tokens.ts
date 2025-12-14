import { compressToBuffer, decompressFromBuffer } from "../index.ts"
import type { Reader } from "./Reader.ts"
import type { Writer } from "./Writer.ts"

// https://docs.nvidia.com/learn-openusd/latest/stage-setting/index.html
// stage, layer
// the tree of nodes contains prim and attribute
// nodes have fields: fieldset, field
// stage.DefinePrim(path, prim_type)
// UsdGeom.Xform.Define(stage, path)
// prim.GetChildren()
// prim.GetTypeName()
// prim.GetProperties()
// stage: Usd.Stage = Usd.Stage.CreateNew("_assets/prims.usda")
// # Define a new primitive at the path "/hello" on the current stage:
// stage.definePrim("/hello")
// # Define a new primitive at the path "/world" on the current stage with the prim type, Sphere.
// stage.definePrim("/world", "Sphere")
// stage.save()
// #usda 1.0
// def "hello"
// {
// }
// def Sphere "world"
// {
// }
// from pxr import Usd, UsdGeom
// file_path = "_assets/sphere_prim.usda"
// stage: Usd.Stage = Usd.Stage.CreateNew(file_path)
// # Define a prim of type `Sphere` at path `/hello`:
// sphere: UsdGeom.Sphere = UsdGeom.Sphere.Define(stage, "/hello")
// sphere.CreateRadiusAttr().Set(2)
// # Save the stage:
// stage.Save()
// #usda 1.0
// def Sphere "hello"
// {
//     double radius = 2
// }
// blender/source/blender/io/usd/intern/usd_capi_export.cc:
// pxr::UsdStageRefPtr usd_stage = pxr::UsdStage::CreateNew(filepath);
// both of the following end up as fields...
// usd_stage->SetMetadata(pxr::UsdGeomTokens->metersPerUnit, double(scene->unit.scale_length));
// usd_stage->GetRootLayer()->SetDocumentation(std::string("Blender v") + BKE_blender_version_string());

export class Tokens {
    tokens: string[] = []
    _tokens?: Map<string, number>

    constructor(reader?: Reader) {
        if (reader !== undefined) {
            const numTokens = reader.getUint64()
            const uncompressedSize = reader.getUint64()
            const compressedSize = reader.getUint64()

            // console.log(`TOKENS: numTokens = ${numTokens}, uncompressedSize = ${uncompressedSize}, compressedSize = ${compressedSize}`)

            // if (compressedSize > section.size - 24) {
            //     throw Error(`TOKENS section: compressed size exceeds section`)
            // }

            const compressed = new Uint8Array(reader._dataview.buffer, reader.offset, compressedSize)
            const uncompressed = new Uint8Array(uncompressedSize)
            const n = decompressFromBuffer(compressed, uncompressed)
            if (n !== uncompressedSize) {
                throw Error(`CrateFile::readTokens(): failed to decompress: uncompressed ${n} but excepted ${uncompressedSize}`)
            }

            this.tokens = new Array<string>(numTokens)

            let name = ""
            let tokenIndex = 0
            for (let i = 0; i < uncompressedSize; ++i) {
                const c = uncompressed[i]
                if (c === 0) {
                    if (tokenIndex >= numTokens) {
                        throw Error(`too many tokens`)
                    }
                    // console.log(`TOKEN ${tokenIndex} = '${name}'`)
                    this.tokens[tokenIndex] = name
                    ++tokenIndex
                    name = ""
                } else {
                    name += String.fromCharCode(c)
                }
            }
            if (numTokens !== tokenIndex) {
                throw Error(`not enough tokens`)
            }
        }
    }
    get(index: number) {
        if (index >= this.tokens.length) {
            throw Error(`token index ${index} is out of range`)
        }
        return this.tokens[index]
    }
    add(value: string): number {
        if (this._tokens === undefined) {
            this._tokens = new Map<string, number>()
        }
        let idx = this._tokens.get(value)
        if (idx === undefined) {
            idx = this.tokens.length
            this._tokens.set(value, idx)
            this.tokens.push(value)
        }
        return idx
    }

    serialize(writer: Writer) {
        let uncompressedSize = 0
        for (const token of this.tokens) {
            uncompressedSize += token.length + 1
        }
        const src = new Uint8Array(uncompressedSize)
        const dst = new Uint8Array(uncompressedSize + 32)
        let offset = 0
        for (const token of this.tokens) {
            for (let i = 0; i < token.length; ++i) {
                src[offset++] = token.charCodeAt(i)
            }
            src[offset++] = 0
        }
        const compressedSize = compressToBuffer(src, dst)

        // console.log(`write numTokens = ${this.tokens.length}, uncompressedSize = ${uncompressedSize}, compressedSize = ${compressedSize}`)

        writer.writeUint64(this.tokens.length)
        writer.writeUint64(uncompressedSize)
        writer.writeUint64(compressedSize)
        writer.writeBuffer(dst, 0, compressedSize)
    }
}
