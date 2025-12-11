// SpecType enum must be same order with pxrUSD's SdfSpecType(since enum value
// is stored in Crate directly)

export enum SpecType {
    Unknown,
    Attribute, // is a property
    Connection,
    Expression,
    Mapper,
    MapperArg,
    Prim,
    PseudoRoot, // is a prim
    Relationship, // is a property
    RelationshipTarget,
    Variant,
    VariantSet,
    Invalid
}

export function isPrim(type: SpecType) {
    switch (type) {
        case SpecType.PseudoRoot:
        case SpecType.Prim:
            return true
        case SpecType.Attribute:
        case SpecType.Relationship:
            return false
        default:
            throw Error(`yikes: not sure whether ${SpecType[type]} is a prim of not`)
    }
}