// SpecType enum must be same order with pxrUSD's SdfSpecType(since enum value
// is stored in Crate directly)

export enum SpecType {
    Unknown,
    Attribute,
    Connection,
    Expression,
    Mapper,
    MapperArg,
    Prim,
    PseudoRoot,
    Relationship,
    RelationshipTarget,
    Variant,
    VariantSet,
    Invalid
}
