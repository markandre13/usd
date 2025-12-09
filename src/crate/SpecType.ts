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

