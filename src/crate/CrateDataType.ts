import type { Reader } from "./Reader.ts"

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
    _bits: number
    constructor(reader: Reader) {
        this._bits = reader.getUint8()
    }
    isExplicit() { return this._bits & Bits.IsExplicitBit }
    hasExplicitItems() { return this._bits & Bits.HasExplicitItemsBit }
    hasAddedItems() { return this._bits & Bits.HasAddedItemsBit }
    hasPrependedItems() { return this._bits & Bits.HasPrependedItemsBit }
    hasAppendedItems() { return this._bits & Bits.HasAppendedItemsBit }
    hasDeletedItems() { return this._bits & Bits.HasDeletedItemsBit }
    hasOrderedItems() { return this._bits & Bits.HasOrderedItemsBit }
}