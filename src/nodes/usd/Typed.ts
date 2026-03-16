import type { Specifier } from "../../crate/Specifier"
import { SchemaBase } from "./SchemaBase"

/**
 * The base class for all _typed_ schemas (those that can impart a
 * typeName to a UsdPrim), and therefore the base class for all
 * concrete, instantiable "IsA" schemas.
 *
 * UsdTyped implements a typeName-based query for its override of
 * UsdSchemaBase::_IsCompatible().  It provides no other behavior.
 *
 * defined in pxr/usd/usd/schema.usda
 */
export class Typed extends SchemaBase {
    protected specifier?: Specifier
    protected typeName?: string

    override encodeFields(): void {
        super.encodeFields()
        this.setSpecifier("specifier", this.specifier)
        this.setToken("typeName", this.typeName)
    }
}
