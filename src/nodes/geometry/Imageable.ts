import { Typed } from "../usd/Typed.ts"

/**
 * Base class for all prims that may require rendering or
 * visualization of some sort. The primary attributes of Imageable
 * are _visibility_ and _purpose_, which each provide instructions for
 * what geometry should be included for processing by rendering and other
 * computations.
 *
 * defined in pxr/usd/usdGeom/schema.usda
 */
export class Imageable extends Typed { }
