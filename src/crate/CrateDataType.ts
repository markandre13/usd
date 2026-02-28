import type { ListOp } from "./Fields.ts"
import { Reader } from "./Reader.js"
import { Writer } from "./Writer.js"

export enum CrateDataType {
    Bool = 1,
    UChar,
    Int,
    UInt,
    Int64,
    UInt64,
    Half,
    Float,
    Double,
    String,
    Token,
    AssetPath,
    Matrix2d,
    Matrix3d,
    Matrix4d,
    Quatd,
    Quatf,
    Quath,
    Vec2d,
    Vec2f,
    Vec2h,
    Vec2i,
    Vec3d,
    Vec3f,
    Vec3h,
    Vec3i,
    Vec4d,
    Vec4f,
    Vec4h,
    Vec4i,
    Dictionary,
    TokenListOp,
    StringListOp,
    PathListOp,
    ReferenceListOp,
    IntListOp,
    Int64ListOp,
    UIntListOp,
    UInt64ListOp,
    PathVector,
    TokenVector,
    Specifier,
    Permission,
    Variability,
    VariantSelectionMap,
    TimeSamples,
    Payload,
    DoubleVector,
    LayerOffsetVector,
    StringVector,
    ValueBlock,
    Value,
    UnregisteredValue,
    UnregisteredValueListOp,
    PayloadListOp,
    TimeCode,
    PathExpression,
    Relocates,
    Spline,
    AnimationBlock
}

enum Bits {
    IsExplicitBit = 1 << 0,
    HasExplicitItemsBit = 1 << 1,
    HasAddedItemsBit = 1 << 2,
    HasDeletedItemsBit = 1 << 3,
    HasOrderedItemsBit = 1 << 4,
    HasPrependedItemsBit = 1 << 5,
    HasAppendedItemsBit = 1 << 6
};

export class ListOpHeader {
    _bits!: number
    constructor(reader: Reader)
    constructor(reader: Writer, value: ListOp)
    constructor(reader: Reader | Writer, value?: ListOp) {
        if (reader instanceof Reader) {
            this._bits = reader.getUint8()
        } else
            if (reader instanceof Writer && value !== undefined) {
                let bits = 0
                if (value.isExplicit === true) {
                    bits |= Bits.IsExplicitBit
                }
                if (value.explicit !== undefined) {
                    bits |= Bits.HasExplicitItemsBit
                }
                if (value.add !== undefined) {
                    bits |= Bits.HasAddedItemsBit
                }
                if (value.prepend !== undefined) {
                    bits |= Bits.HasPrependedItemsBit
                }
                if (value.append !== undefined) {
                    bits |= Bits.HasAppendedItemsBit
                }
                if (value.delete !== undefined) {
                    bits |= Bits.HasDeletedItemsBit
                }
                if (value.order !== undefined) {
                    bits |= Bits.HasOrderedItemsBit
                }
                this._bits = bits
                reader.writeUint8(bits)
            }
    }
    isExplicit() { return this._bits & Bits.IsExplicitBit }
    hasExplicitItems() { return this._bits & Bits.HasExplicitItemsBit }
    hasAddedItems() { return this._bits & Bits.HasAddedItemsBit }
    hasPrependedItems() { return this._bits & Bits.HasPrependedItemsBit }
    hasAppendedItems() { return this._bits & Bits.HasAppendedItemsBit }
    hasDeletedItems() { return this._bits & Bits.HasDeletedItemsBit }
    hasOrderedItems() { return this._bits & Bits.HasOrderedItemsBit }
}