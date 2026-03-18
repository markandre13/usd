import type { Skeleton } from "../skeleton/Skeleton"

/**
 * Provides API for authoring and extracting all the skinning-related
 * data that lives in the "geometry hierarchy" of prims and models that want
 * to be skeletally deformed.
 */
export interface SkelBindingAPI {
    // skel:animationSource
    /**
     * Skeleton to be bound to this prim and its descendents that
     * possess a mapping and weighting to the joints of the identified
     * Skeleton.
     */
    set skeleton(value: Skeleton | undefined)

    // primvars:skel:skinningMethod = "classicLinear"
    /**
     * Encodes the bind-time world space transforms of the prim.
     * If the transform is identical for a group of gprims that share a common
     * ancestor, the transform may be authored on the ancestor, to "inherit"
     * down to all the leaf gprims. If this transform is unset, an identity
     * transform is used instead.
     */
    set geomBindTransform(value: ArrayLike<number> | undefined)

    // skel:joints... i think this may select a subset of joints from the skeleton
    // for use in jointIndices and jointWeights.
    /**
     * Indices into the *joints* attribute of the closest (in namespace) bound Skeleton
     * that affect each point of a PointBased gprim.
     *
     * The primvar can have either *constant* or *vertex* interpolation.
     *
     * This primvar's *elementSize* will determine how many joint influences
     * apply to each point. Indices must point be valid. Null influences should
     * be defined by setting values in jointWeights to zero.
     *
     * [ point0 -> (joint_0, ..., joint_elementSize), ...]
     */
    set jointIndices(value: { elementSize: number; indices: ArrayLike<number>}  | undefined)

    /**
     * Weights for the joints that affect each point of a PointBased
     * gprim.
     *
     * The primvar can have either *constant* or *vertex* interpolation.
     * This primvar's *elementSize* will determine how many joints influences
     * apply to each point.
     *
     * The length, interpolation, and elementSize of *jointWeights* must match
     * that of *jointIndices*.
     */
    set jointWeights(value: { elementSize: number; indices: ArrayLike<number>}  | undefined)
}
